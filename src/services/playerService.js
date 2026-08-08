import { get, ref } from "firebase/database";
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
