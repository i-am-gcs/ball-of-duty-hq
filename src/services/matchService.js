import { get, push, ref, remove, set, update } from "firebase/database";
import { matches as staticMatches } from "../data/matches";
import { database } from "../firebase/firebase";

function mergeMatches(firebaseMatches = {}) {
  const matchesById = new Map(
    staticMatches.map((match) => [String(match.id), match]),
  );

  Object.entries(firebaseMatches).forEach(([id, match]) => {
    if (match.deleted) {
      matchesById.delete(String(id));
      return;
    }

    matchesById.set(String(id), { id, ...match });
  });

  return [...matchesById.values()];
}

export async function getMatches() {
  const snapshot = await get(ref(database, "matches"));
  return mergeMatches(snapshot.exists() ? snapshot.val() : {});
}

export async function getMatchById(matchId) {
  const matches = await getMatches();
  return matches.find((match) => String(match.id) === String(matchId)) || null;
}

export async function createMatch(matchData) {
  const newMatchReference = push(ref(database, "matches"));
  await set(newMatchReference, matchData);
  return { id: newMatchReference.key, ...matchData };
}

export async function updateMatch(matchId, matchData) {
  await update(ref(database, `matches/${matchId}`), matchData);
  return { id: matchId, ...matchData };
}

export async function deleteMatch(matchId) {
  const isStaticMatch = staticMatches.some(
    (match) => String(match.id) === String(matchId),
  );

  if (isStaticMatch) {
    await set(ref(database, `matches/${matchId}`), { deleted: true });
    return;
  }

  await remove(ref(database, `matches/${matchId}`));
}
