import { get, push, ref, remove, set, update } from "firebase/database";
import { seasons as staticSeasons } from "../data/seasons";
import { database } from "../firebase/firebase";

function mergeSeasons(firebaseSeasons = {}) {
  const seasonsById = new Map(
    staticSeasons.map((season) => [String(season.id), season]),
  );

  Object.entries(firebaseSeasons).forEach(([id, season]) => {
    if (season.deleted) {
      seasonsById.delete(String(id));
      return;
    }

    seasonsById.set(String(id), { id, ...season });
  });

  return [...seasonsById.values()];
}

export async function getSeasons() {
  const snapshot = await get(ref(database, "seasons"));
  return mergeSeasons(snapshot.exists() ? snapshot.val() : {});
}

export async function getSeasonById(seasonId) {
  const seasons = await getSeasons();
  return seasons.find((season) => String(season.id) === String(seasonId)) || null;
}

export async function createSeason(seasonData) {
  const newSeasonReference = push(ref(database, "seasons"));
  await set(newSeasonReference, seasonData);
  return { id: newSeasonReference.key, ...seasonData };
}

export async function updateSeason(seasonId, seasonData) {
  await update(ref(database, `seasons/${seasonId}`), seasonData);
  return { id: seasonId, ...seasonData };
}

export async function deleteSeason(seasonId) {
  const isStaticSeason = staticSeasons.some(
    (season) => String(season.id) === String(seasonId),
  );

  if (isStaticSeason) {
    await set(ref(database, `seasons/${seasonId}`), { deleted: true });
    return;
  }

  await remove(ref(database, `seasons/${seasonId}`));
}
