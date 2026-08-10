import { get, push, ref, remove, set, update } from "firebase/database";
import { database } from "../firebase/firebase";

export async function getPlayers() {
  const playersReference = ref(database, "players");

  const snapshot = await get(playersReference);

  if (!snapshot.exists()) {
    return [];
  }

  const playersObject = snapshot.val();

  const players = Object.entries(playersObject).map(([id, player]) => ({
    id,
    ...player,
  }));

  return players;
}

export async function getPlayer(playerId) {
  const snapshot = await get(ref(database, `players/${playerId}`));
  if (!snapshot.exists()) return null;
  return { id: playerId, ...snapshot.val() };
}

export async function createPlayer(playerData) {
  const playersReference = ref(database, "players");
  const newPlayerReference = push(playersReference);

  await set(newPlayerReference, playerData);

  return {
    id: newPlayerReference.key,
    ...playerData,
  };
}

export async function updatePlayer(playerId, playerData) {
  const playerReference = ref(database, `players/${playerId}`);

  await update(playerReference, playerData);

  return {
    id: playerId,
    ...playerData,
  };
}

export async function deletePlayer(playerId) {
  const playerReference = ref(database, `players/${playerId}`);

  await remove(playerReference);
}
