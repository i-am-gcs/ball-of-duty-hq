import { database } from "./firebase.js";

/**
 * Normalizál egy Discord ID-t.
 *
 * FONTOS:
 * A Discord ID-ket mindig stringként kezeljük,
 * mert nagyobbak lehetnek annál, mint amit a JavaScript
 * Number biztonságosan, pontosságvesztés nélkül tud tárolni.
 */
function normalizeDiscordId(discordId) {
  if (discordId === null || discordId === undefined) {
    return "";
  }

  return String(discordId).trim();
}

/**
 * Normalizál egy Discord felhasználónevet.
 *
 * Ezt fallback matchinghez használjuk abban az esetben,
 * ha egy régi Firebase rekordban a discordId Numberként
 * lett eltárolva és emiatt elvesztette a pontosságát.
 */
function normalizeDiscordName(discordName) {
  if (discordName === null || discordName === undefined) {
    return "";
  }

  return String(discordName).trim().toLowerCase();
}

/**
 * Játékosok betöltése Firebase-ből.
 */
async function getPlayers() {
  const snapshot = await database.ref("players").once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const playersData = snapshot.val();

  return Object.entries(playersData).map(([id, player]) => ({
    id,
    ...player,
  }));
}

/**
 * Discord poll összes szavazatának összegyűjtése.
 *
 * A Discord ID-t itt már eleve stringként tároljuk.
 */
async function getVotesByUser(poll) {
  const votesByUser = {};

  for (const answer of poll.answers.values()) {
    const voters = await answer.voters.fetch({
      limit: 100,
    });

    voters.forEach((user) => {
      const discordUserId = normalizeDiscordId(user.id);

      if (!votesByUser[discordUserId]) {
        votesByUser[discordUserId] = {
          discordUserId,
          username: user.username,
          answerIds: [],
        };
      }

      votesByUser[discordUserId].answerIds.push(answer.id);
    });
  }

  return votesByUser;
}

/**
 * Poll válaszainak egyszerűsített formája.
 */
function getPollAnswers(poll) {
  return [...poll.answers.values()].map((answer) => ({
    id: answer.id,
    text: answer.text || "Névtelen válasz",
    emoji: answer.emoji?.toString() || null,
  }));
}

/**
 * Meglévő poll betöltése Firebase-ből.
 */
async function getExistingPoll(pollId) {
  const snapshot = await database.ref(`discordPolls/${pollId}`).once("value");

  return snapshot.exists() ? snapshot.val() : null;
}

/**
 * A poll lezárási időpontjának meghatározása.
 *
 * - Amíg nincs lezárva: null
 * - Normál lejárat esetén: Discord expiry időpontja
 * - Korai lezárás esetén: az a pillanat, amikor a bot először
 *   lezártként látja a pollt
 * - Ha Firebase-ben már van closedAt, azt nem írjuk felül.
 *
 * A Benefit Tracker kizárólag ezt a mezőt használja a szezonhoz
 * tartozás meghatározására.
 */
function getClosedAt(poll, existingPoll) {
  // Ha már van lezárt időpont Firebase-ben,
  // azt nem írjuk felül.
  if (existingPoll?.closedAt) {
    return existingPoll.closedAt;
  }

  // Ha még nincs véglegesítve a poll,
  // akkor még nincs closedAt.
  if (!poll.resultsFinalized) {
    return null;
  }

  const now = new Date();

  // Normál lejárat esetén az expiresAt lesz a closedAt.
  if (poll.expiresAt && poll.expiresAt <= now) {
    return poll.expiresAt.toISOString();
  }

  // Korai lezárás esetén az észlelés időpontját használjuk.
  return now.toISOString();
}

/**
 * Poll teljes adatának Firebase-kompatibilis formája.
 */
function serializePoll(message, category, existingPoll = null) {
  const { poll } = message;

  return {
    discordMessageId: message.id,
    discordChannelId: message.channelId,
    discordGuildId: message.guildId,
    category,

    question: poll.question.text || "Névtelen szavazás",

    answers: [...poll.answers.values()].map((answer) => ({
      id: answer.id,
      text: answer.text || "Névtelen válasz",
      emoji: answer.emoji?.toString() || null,
      voteCount: answer.voteCount,
    })),

    allowMultiselect: poll.allowMultiselect,

    expiresAt: poll.expiresAt?.toISOString() || null,

    // EZ AZ ÚJ MEZŐ
    closedAt: getClosedAt(poll, existingPoll),

    resultsFinalized: poll.resultsFinalized,

    author: {
      discordUserId: normalizeDiscordId(message.author.id),
      username: message.author.username,
    },

    messageUrl: message.url,

    createdAt: message.createdAt.toISOString(),

    syncedAt: new Date().toISOString(),
  };
}

/**
 * Megkeresi a Firebase-ben azt a játékost,
 * akihez a Discord szavazó tartozik.
 *
 * Elsődleges:
 *   discordId
 *
 * Fallback:
 *   discordName
 *
 * A fallback azért szükséges, mert a régebbi Firebase
 * rekordokban a Discord ID Numberként lehetett eltárolva,
 * ami a nagy szám miatt pontatlanná válhatott.
 */
function findPlayerForVote(vote, players) {
  const discordUserId = normalizeDiscordId(vote.discordUserId);
  const discordUsername = normalizeDiscordName(vote.username);

  /**
   * 1. Első körben Discord ID alapján keresünk.
   */
  const playerById = players.find((player) => {
    const playerDiscordId = normalizeDiscordId(player.discordId);

    return (
      playerDiscordId && discordUserId && playerDiscordId === discordUserId
    );
  });

  if (playerById) {
    return {
      player: playerById,
      matchedBy: "discordId",
    };
  }

  /**
   * 2. Ha az ID nem egyezik,
   * Discord username alapján próbáljuk meg.
   */
  const playerByName = players.find((player) => {
    const playerDiscordName = normalizeDiscordName(player.discordName);

    return (
      playerDiscordName &&
      discordUsername &&
      playerDiscordName === discordUsername
    );
  });

  if (playerByName) {
    return {
      player: playerByName,
      matchedBy: "discordName",
    };
  }

  return {
    player: null,
    matchedBy: null,
  };
}

/**
 * A Discord szavazókat összeköti a Firebase játékosokkal.
 */
function resolveVotesToPlayers(votesByUser, players) {
  const resolvedVotes = {};

  for (const [discordUserId, vote] of Object.entries(votesByUser)) {
    const { player, matchedBy } = findPlayerForVote(vote, players);

    resolvedVotes[discordUserId] = {
      discordUserId: normalizeDiscordId(discordUserId),

      username: vote.username,

      answerIds: vote.answerIds,

      playerId: player?.id || null,

      player: player
        ? {
            name: player.name || null,
            nickname: player.nickname || null,
          }
        : null,

      matched: Boolean(player),

      matchedBy,
    };
  }

  return resolvedVotes;
}

/**
 * Játékosonként felépíti a szavazási eredményt.
 *
 * FONTOS:
 * Itt már nem közvetlenül a Firebase discordId alapján
 * keressük a vote-ot.
 *
 * Ehelyett először minden Discord szavazót matchingelünk
 * ID vagy username alapján.
 */
function buildPlayerResults(votesByUser, players, pollAnswers) {
  const playerResults = {};

  for (const player of players) {
    if (!player.discordId && !player.discordName) {
      continue;
    }

    /**
     * Megkeressük, hogy van-e olyan Discord szavazó,
     * aki ehhez a játékoshoz tartozik.
     */
    const matchingVoteEntry = Object.entries(votesByUser).find(([, vote]) => {
      const { player: matchedPlayer } = findPlayerForVote(vote, [player]);

      return Boolean(matchedPlayer);
    });

    const vote = matchingVoteEntry ? matchingVoteEntry[1] : null;

    const answers = vote
      ? vote.answerIds.map((answerId) => {
          const answer = pollAnswers.find(
            (pollAnswer) => pollAnswer.id === answerId,
          );

          return {
            id: answerId,
            text: answer?.text || "Ismeretlen válasz",
            emoji: answer?.emoji || null,
          };
        })
      : [];

    playerResults[player.id] = {
      playerId: player.id,

      discordId: player.discordId ? normalizeDiscordId(player.discordId) : null,

      discordName: player.discordName || null,

      name: player.name || null,

      nickname: player.nickname || null,

      status: vote ? "VOTED" : "NO_VOTE",

      answerIds: vote?.answerIds || [],

      answers,
    };
  }

  return playerResults;
}

/**
 * Egyetlen Discord poll szinkronizálása.
 */
export async function syncPollMessage(message, category) {
  if (!message.poll) {
    return false;
  }

  // Meglévő Firebase poll lekérése,
  // hogy a már elmentett closedAt megmaradjon.
  const existingPoll = await getExistingPoll(message.id);

  const pollData = serializePoll(message, category, existingPoll);

  const votesByUser = await getVotesByUser(message.poll);

  const players = await getPlayers();

  const pollAnswers = getPollAnswers(message.poll);

  /**
   * Discord vote -> Firebase player matching.
   */
  const resolvedVotes = resolveVotesToPlayers(votesByUser, players);

  /**
   * Játékosonkénti eredmény.
   */
  const playerResults = buildPlayerResults(votesByUser, players, pollAnswers);

  /**
   * Firebase mentés.
   */
  await Promise.all([
    database.ref(`discordPolls/${message.id}`).set(pollData),

    database.ref(`discordVotes/${message.id}`).set(votesByUser),

    database.ref(`discordPollResults/${message.id}`).set({
      pollId: message.id,

      category,

      resultsFinalized: pollData.resultsFinalized,

      syncedAt: new Date().toISOString(),

      votes: resolvedVotes,

      playerResults,
    }),
  ]);

  /**
   * Matching statisztikák.
   */
  const matchedVotes = Object.values(resolvedVotes).filter(
    (vote) => vote.matched,
  );

  const unmatchedVotes = Object.values(resolvedVotes).filter(
    (vote) => !vote.matched,
  );

  const matchedByDiscordId = matchedVotes.filter(
    (vote) => vote.matchedBy === "discordId",
  ).length;

  const matchedByDiscordName = matchedVotes.filter(
    (vote) => vote.matchedBy === "discordName",
  ).length;

  const matchedCount = matchedVotes.length;

  const unmatchedCount = unmatchedVotes.length;

  const votedPlayerCount = Object.values(playerResults).filter(
    (player) => player.status === "VOTED",
  ).length;

  const noVotePlayerCount = Object.values(playerResults).filter(
    (player) => player.status === "NO_VOTE",
  ).length;

  /**
   * Logok.
   */
  console.log(`Szavazás szinkronizálva: ${pollData.question}`);

  console.log(
    `Játékosazonosítás: ${matchedCount} egyezés, ${unmatchedCount} ismeretlen Discord ID.`,
  );

  console.log(`  ├─ Discord ID alapján: ${matchedByDiscordId}`);

  console.log(`  └─ Discord név alapján: ${matchedByDiscordName}`);

  console.log(
    `Szavazási állapot: ${votedPlayerCount} szavazott, ${noVotePlayerCount} nem szavazott.`,
  );

  /**
   * Ha maradtak ismeretlen Discord szavazók,
   * írjuk ki őket külön is, hogy könnyebb legyen debugolni.
   */
  if (unmatchedVotes.length > 0) {
    console.log("Ismeretlen Discord szavazók:");

    unmatchedVotes.forEach((vote) => {
      console.log(`  - ${vote.username} (${vote.discordUserId})`);
    });
  }

  return true;
}

/**
 * Egy Discord csatorna legutóbbi polljainak szinkronizálása.
 */
export async function syncRecentChannelPolls(channel, category) {
  const messages = await channel.messages.fetch({
    limit: 100,
  });

  const pollMessages = messages.filter((message) => message.poll);

  for (const message of pollMessages.values()) {
    try {
      await syncPollMessage(message, category);
    } catch (error) {
      console.error(
        `Nem sikerült szinkronizálni a pollt (${message.id}):`,
        error,
      );
    }
  }

  console.log(`${channel.name}: ${pollMessages.size} poll feldolgozva.`);
}
