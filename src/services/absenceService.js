import { get, push, ref, remove, update } from "firebase/database";
import { database } from "../firebase/firebase";

const ABSENCES_PATH = "absences";

export async function getAbsences() {
  const snapshot = await get(ref(database, ABSENCES_PATH));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val()).map(([id, absence]) => ({
    id,
    ...absence,
  }));
}

export async function createAbsence(absenceData) {
  const absenceRef = push(ref(database, ABSENCES_PATH));

  const data = {
    playerId: absenceData.playerId,
    startDate: absenceData.startDate,
    endDate: absenceData.endDate,
    createdAt: Date.now(),
  };

  await update(absenceRef, data);

  return {
    id: absenceRef.key,
    ...data,
  };
}

export async function updateAbsence(absenceId, absenceData) {
  const data = {
    startDate: absenceData.startDate,
    endDate: absenceData.endDate,
  };

  await update(ref(database, `${ABSENCES_PATH}/${absenceId}`), data);

  return {
    id: absenceId,
    ...data,
  };
}

export async function deleteAbsence(absenceId) {
  await remove(ref(database, `${ABSENCES_PATH}/${absenceId}`));
}
export async function updateAbsenceReason(absenceId, reason) {
  await update(ref(database, `${ABSENCES_PATH}/${absenceId}`), {
    reason: reason.trim(),
  });

  return {
    id: absenceId,
    reason: reason.trim(),
  };
}
