import { get, ref, set } from "firebase/database";
import { database } from "../firebase/firebase";
import { getPlayers } from "./playerService";

export const FORMATIONS = {
  "4-3-3": {
    label: "4-3-3",
    slots: [
      ["gk", "GK", 50, 91],
      ["lb", "LB", 14, 73],
      ["lcb", "CB", 36, 72],
      ["rcb", "CB", 64, 72],
      ["rb", "RB", 86, 73],
      ["cdm", "CDM", 50, 58],
      ["lcm", "LCM", 34, 46],
      ["rcm", "RCM", 66, 46],
      ["lw", "LW", 23, 27],
      ["rw", "RW", 77, 27],
      ["cf", "CF", 50, 13],
    ],
  },

  "4-2-3-1": {
    label: "4-2-3-1",
    slots: [
      ["gk", "GK", 50, 91],
      ["lb", "LB", 14, 73],
      ["lcb", "CB", 36, 72],
      ["rcb", "CB", 64, 72],
      ["rb", "RB", 86, 73],
      ["ldm", "LDM", 37, 56],
      ["rdm", "RDM", 63, 56],
      ["cam", "CAM", 50, 40],
      ["lam", "LAM", 28, 29],
      ["ram", "RAM", 72, 29],
      ["st", "ST", 50, 13],
    ],
  },

  "4-4-2": {
    label: "4-4-2",
    slots: [
      ["gk", "GK", 50, 91],
      ["lb", "LB", 14, 73],
      ["lcb", "CB", 36, 72],
      ["rcb", "CB", 64, 72],
      ["rb", "RB", 86, 73],
      ["lm", "LM", 14, 48],
      ["lcm", "LCM", 39, 48],
      ["rcm", "RCM", 61, 48],
      ["rm", "RM", 86, 48],
      ["ls", "LS", 38, 22],
      ["rs", "RS", 62, 22],
    ],
  },

  "4-1-2-1-2": {
    label: "4-1-2-1-2",
    slots: [
      ["gk", "GK", 50, 91],
      ["lb", "LB", 14, 73],
      ["lcb", "CB", 36, 72],
      ["rcb", "CB", 64, 72],
      ["rb", "RB", 86, 73],
      ["cdm", "CDM", 50, 58],
      ["lcm", "LCM", 34, 45],
      ["rcm", "RCM", 66, 45],
      ["cam", "CAM", 50, 30],
      ["ls", "LS", 39, 15],
      ["rs", "RS", 61, 15],
    ],
  },

  "3-5-2": {
    label: "3-5-2",
    slots: [
      ["lcb", "CB", 28, 72],
      ["cb", "CB", 50, 75],
      ["rcb", "CB", 72, 72],
      ["lm", "LM", 9, 51],
      ["ldm", "LDM", 34, 50],
      ["rdm", "RDM", 66, 50],
      ["cam", "CAM", 50, 34],
      ["rm", "RM", 91, 51],
      ["ls", "LS", 39, 15],
      ["rs", "RS", 61, 15],
      ["gk", "GK", 50, 91],
    ],
  },

  "3-1-4-2": {
    label: "3-1-4-2",
    slots: [
      ["lcb", "CB", 28, 72],
      ["cb", "CB", 50, 75],
      ["rcb", "CB", 72, 72],
      ["cdm", "CDM", 50, 57],
      ["lm", "LM", 9, 39],
      ["lcm", "LCM", 34, 39],
      ["rcm", "RCM", 66, 39],
      ["rm", "RM", 91, 39],
      ["ls", "LS", 39, 15],
      ["rs", "RS", 61, 15],
      ["gk", "GK", 50, 91],
    ],
  },
};

const FORMATION_ORDER = Object.keys(FORMATIONS);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeAnswerText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toDateKey(value) {
  if (!value) {
    return null;
  }

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function getClosedAtDateKey(closedAt) {
  return toDateKey(closedAt);
}

/**
 * Nálunk minden Discord jelenléti poll:
 *
 * 1 = IGEN
 * 2 = NEM
 *
 * A szöveget ettől függetlenül normalizáljuk,
 * hogy az "IGEN", "igen", " IGEN " stb. is működjön.
 */
function isYesAnswer(answer) {
  if (!answer) {
    return false;
  }

  const answerId = Number(answer.id);
  const answerText = normalizeAnswerText(answer.text);

  return answerId === 1 && answerText === "igen";
}

/**
 * Egy játékos akkor elérhető, ha:
 *
 * - van playerResult
 * - VOTED
 * - a választása IGEN
 */
function playerVotedYes(playerResult) {
  if (!playerResult) {
    return false;
  }

  if (playerResult.status !== "VOTED") {
    return false;
  }

  return (playerResult.answers || []).some((answer) => isYesAnswer(answer));
}

export function getFormationList() {
  return FORMATION_ORDER.map((id) => ({
    id,
    ...FORMATIONS[id],
  }));
}

export function getFormationSlots(formationId) {
  return FORMATIONS[formationId]?.slots || [];
}

/**
 * A Lineup Builder összes forrásadata.
 */
export async function getLineupSourceData() {
  const [playersSnapshot, pollsSnapshot, resultsSnapshot] = await Promise.all([
    get(ref(database, "players")),
    get(ref(database, "discordPolls")),
    get(ref(database, "discordPollResults")),
  ]);

  const players = playersSnapshot.exists()
    ? Object.entries(playersSnapshot.val()).map(([id, player]) => ({
        id,
        ...player,
      }))
    : [];

  const polls = pollsSnapshot.exists()
    ? Object.entries(pollsSnapshot.val()).map(([id, poll]) => ({
        id,
        ...poll,
      }))
    : [];

  const results = resultsSnapshot.exists() ? resultsSnapshot.val() : {};

  return {
    players,
    polls,
    results,
  };
}

/**
 * Az adott napra érvényes bevethető játékosok.
 *
 * FONTOS:
 *
 * - csak aktív squad
 * - csak lezárt poll
 * - csak a closedAt dátuma számít
 * - az adott nap LEGUTOLSÓ lezárt pollja számít
 * - csak IGEN-t szavazó játékosok kerülnek be
 */
export async function getAvailablePlayersForDate(dateKey) {
  const { players, polls, results } = await getLineupSourceData();

  const activePlayers = players.filter(
    (player) => normalize(player.status) === "aktiv",
  );

  /**
   * Csak lezárt pollok.
   *
   * A poll dátumát kizárólag closedAt adja.
   */
  const matchingPolls = polls
    .filter((poll) => Boolean(poll.closedAt))
    .filter((poll) => getClosedAtDateKey(poll.closedAt) === dateKey)
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

  /**
   * A legutolsó lezárt poll az érvényes.
   */
  const selectedPoll = matchingPolls[0] || null;

  if (!selectedPoll) {
    return {
      players: [],
      activePlayers,
      allPlayers: players,
      poll: null,
      polls: [],
    };
  }

  const pollResults = results?.[selectedPoll.id];

  const playerResults = pollResults?.playerResults || {};

  const availablePlayers = activePlayers.filter((player) =>
    playerVotedYes(playerResults[player.id]),
  );

  /**
   * A UI számára megtartjuk a poll információt.
   */
  const pollCandidates = matchingPolls.map((poll) => {
    const resultsForPoll = results?.[poll.id];

    const playerResultsForPoll = resultsForPoll?.playerResults || {};

    const availableForPoll = activePlayers.filter((player) =>
      playerVotedYes(playerResultsForPoll[player.id]),
    );

    return {
      poll,
      availablePlayers: availableForPoll,
    };
  });

  return {
    players: availablePlayers,
    activePlayers,
    allPlayers: players,
    poll: selectedPoll,
    polls: pollCandidates,
  };
}

/**
 * Mentett kezdő 11 betöltése.
 *
 * Minden bejelentkezett / approved user
 * számára olvasható.
 *
 * A Firebase Rules szabályozza a tényleges
 * jogosultságot.
 */
export async function getLineup(matchId) {
  if (!matchId) {
    return null;
  }

  try {
    const snapshot = await get(ref(database, `lineups/${matchId}`));

    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Nem sikerült betölteni a mentett kezdő 11-et:", error);

    // A mentett lineup hiánya / olvasási hibája
    // nem akadályozhatja meg a Discord jelöltek betöltését.
    return null;
  }
}

/**
 * Kezdő 11 mentése.
 *
 * A service maga is ellenőrzi,
 * hogy csak az adott napi IGEN játékosai
 * kerülhessenek a kezdőbe.
 */
export async function saveLineup({
  match,
  formationId,
  starters,
  substitutes,
  pollId,
}) {
  if (!match?.id) {
    throw new Error("A lineup mentéséhez szükség van a mérkőzésre.");
  }

  if (!FORMATIONS[formationId]) {
    throw new Error("Ismeretlen formáció.");
  }

  const starterPlayerIds = Object.values(starters || {})
    .filter(Boolean)
    .map(String);

  const uniqueStarterIds = new Set(starterPlayerIds);

  if (starterPlayerIds.length !== 11 || uniqueStarterIds.size !== 11) {
    throw new Error(
      "A kezdő 11-nek pontosan 11 különböző játékost kell tartalmaznia.",
    );
  }

  const dateKey = toDateKey(match.date || match.datetime);

  if (!dateKey) {
    throw new Error("A mérkőzés dátuma nem határozható meg.");
  }

  const candidateData = await getAvailablePlayersForDate(dateKey);

  const eligibleIds = new Set(
    candidateData.players.map((player) => String(player.id)),
  );

  const hasIneligibleStarter = starterPlayerIds.some(
    (playerId) => !eligibleIds.has(playerId),
  );

  if (hasIneligibleStarter) {
    throw new Error(
      "A kezdőben csak az adott napi lezárt Discord pollon IGEN-t válaszoló aktív játékos szerepelhet.",
    );
  }

  const cleanSubstitutes = [...new Set((substitutes || []).map(String))].filter(
    (playerId) => eligibleIds.has(playerId) && !uniqueStarterIds.has(playerId),
  );

  const data = {
    matchId: String(match.id),

    matchDate: dateKey,

    opponentName: match.opponentName || "-",

    formationId,

    pollId: pollId || candidateData.poll?.id || null,

    starters: starters || {},

    substitutes: cleanSubstitutes,

    updatedAt: new Date().toISOString(),
  };

  await set(ref(database, `lineups/${match.id}`), data);

  return data;
}

export function getMatchDate(match) {
  return toDateKey(match?.date || match?.datetime);
}

export function buildCandidateMap(players) {
  return new Map(players.map((player) => [String(player.id), player]));
}

export async function getActivePlayers() {
  const players = await getPlayers();

  return players.filter((player) => normalize(player.status) === "aktiv");
}
