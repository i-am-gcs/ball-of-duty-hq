import { database } from "./firebase.js";

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

async function getVotesByUser(poll) {
  const votesByUser = {};

  for (const answer of poll.answers.values()) {
    const voters = await answer.voters.fetch({ limit: 100 });

    voters.forEach((user) => {
      if (!votesByUser[user.id]) {
        votesByUser[user.id] = {
          discordUserId: user.id,
          username: user.username,
          answerIds: [],
        };
      }

      votesByUser[user.id].answerIds.push(answer.id);
    });
  }

  return votesByUser;
}

function getPollAnswers(poll) {
  return [...poll.answers.values()].map((answer) => ({
    id: answer.id,
    text: answer.text || "Névtelen válasz",
    emoji: answer.emoji?.toString() || null,
  }));
}

function serializePoll(message, category) {
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
    resultsFinalized: poll.resultsFinalized,

    author: {
      discordUserId: message.author.id,
      username: message.author.username,
    },

    messageUrl: message.url,
    createdAt: message.createdAt.toISOString(),
    syncedAt: new Date().toISOString(),
  };
}

function resolveVotesToPlayers(votesByUser, players) {
  const resolvedVotes = {};

  for (const [discordUserId, vote] of Object.entries(votesByUser)) {
    const player = players.find(
      (player) =>
        String(player.discordId || "").trim() === String(discordUserId).trim(),
    );

    resolvedVotes[discordUserId] = {
      discordUserId,
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
    };
  }

  return resolvedVotes;
}

function buildPlayerResults(votesByUser, players, pollAnswers) {
  const playerResults = {};

  for (const player of players) {
    if (!player.discordId) {
      continue;
    }

    const discordUserId = String(player.discordId).trim();
    const vote = votesByUser[discordUserId];

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
      discordId: discordUserId,
      name: player.name || null,
      nickname: player.nickname || null,

      status: vote ? "VOTED" : "NO_VOTE",

      answerIds: vote?.answerIds || [],
      answers,
    };
  }

  return playerResults;
}

export async function syncPollMessage(message, category) {
  if (!message.poll) {
    return false;
  }

  const pollData = serializePoll(message, category);

  const votesByUser = await getVotesByUser(message.poll);

  const players = await getPlayers();

  const pollAnswers = getPollAnswers(message.poll);

  const resolvedVotes = resolveVotesToPlayers(votesByUser, players);

  const playerResults = buildPlayerResults(votesByUser, players, pollAnswers);

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

  const matchedCount = Object.values(resolvedVotes).filter(
    (vote) => vote.matched,
  ).length;

  const unmatchedCount = Object.keys(resolvedVotes).length - matchedCount;

  const votedPlayerCount = Object.values(playerResults).filter(
    (player) => player.status === "VOTED",
  ).length;

  const noVotePlayerCount = Object.values(playerResults).filter(
    (player) => player.status === "NO_VOTE",
  ).length;

  console.log(`Szavazás szinkronizálva: ${pollData.question}`);

  console.log(
    `Játékosazonosítás: ${matchedCount} egyezés, ${unmatchedCount} ismeretlen Discord ID.`,
  );

  console.log(
    `Szavazási állapot: ${votedPlayerCount} szavazott, ${noVotePlayerCount} nem szavazott.`,
  );

  return true;
}

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
