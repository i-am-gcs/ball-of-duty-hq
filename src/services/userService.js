import { get, ref, update } from "firebase/database";
import { database } from "../firebase/firebase";

export async function getUsers() {
  const snapshot = await get(ref(database, "users"));
  if (!snapshot.exists()) return [];
  return Object.entries(snapshot.val()).map(([id, user]) => ({ id, ...user }));
}

export async function setUserStatus(userId, status) {
  await update(ref(database, `users/${userId}`), {
    status,
    reviewedAt: new Date().toISOString(),
  });
  return status;
}

export async function reviewAndLinkUser({ userId, status, playerId, previousPlayerId }) {
  const changes = {
    [`users/${userId}/status`]: status,
    [`users/${userId}/reviewedAt`]: new Date().toISOString(),
    [`users/${userId}/playerId`]: playerId || null,
  };

  if (previousPlayerId && previousPlayerId !== playerId) {
    changes[`players/${previousPlayerId}/userId`] = null;
  }

  if (playerId) {
    changes[`players/${playerId}/userId`] = userId;
  }

  await update(ref(database), changes);
  return { status, playerId: playerId || null };
}
