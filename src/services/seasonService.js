import { get, push, ref, remove, set, update } from "firebase/database";

import { seasons as staticSeasons } from "../data/seasons";
import { database } from "../firebase/firebase";

/* =========================================================
   HELPERS
   ========================================================= */

/**
 * Nevek normalizálása összehasonlításhoz.
 *
 * Például:
 *
 * "Balkan Summer League"
 * "Balkan Summer League - League 2"
 *
 * összehasonlítható legyen.
 */
function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Két competition nevének összehasonlítása.
 *
 * Elfogadjuk:
 *
 * Balkan Summer League
 * Balkan Summer League - League 2
 *
 * kapcsolatát is.
 */
function competitionNamesMatch(firstName, secondName) {
  const first = normalizeName(firstName);
  const second = normalizeName(secondName);

  if (!first || !second) {
    return false;
  }

  return first === second || first.includes(second) || second.includes(first);
}

/**
 * Megkeresi a Firebase competitionhez
 * tartozó static competitiont.
 */
function findStaticCompetition(firebaseCompetition, staticCompetitions = []) {
  /*
   * 1. ID alapján.
   */
  const byId = staticCompetitions.find(
    (competition) => String(competition.id) === String(firebaseCompetition?.id),
  );

  if (byId) {
    return byId;
  }

  /*
   * 2. Név alapján.
   *
   * Ez kezeli például:
   *
   * Firebase:
   * Balkan Summer League - League 2
   *
   * Static:
   * Balkan Summer League
   */
  return staticCompetitions.find((competition) =>
    competitionNamesMatch(firebaseCompetition?.name, competition.name),
  );
}

/**
 * Firebase competition + static competition merge.
 *
 * A static adat adja a konfigurációt,
 * a Firebase adat pedig az aktuális állapotot.
 *
 * A történelmi placement esetében
 * a static seasons.js értéke az elsődleges.
 */
function mergeCompetition(firebaseCompetition, staticCompetitions = []) {
  const staticCompetition = findStaticCompetition(
    firebaseCompetition,
    staticCompetitions,
  );

  /*
   * Ha nincs static megfelelő,
   * akkor csak a Firebase adatot használjuk.
   */
  if (!staticCompetition) {
    return {
      ...firebaseCompetition,
    };
  }

  /*
   * Static az alap.
   * Firebase felülírhatja az adatokat.
   *
   * Kivételek:
   *
   * 1. placement
   *    A saját történelmi adatunkból jön.
   *
   * 2. vpg
   *    A VPG konfigurációt megtartjuk
   *    a static adatból, de támogatjuk
   *    az esetleges Firebase konfigurációt is.
   */
  return {
    ...staticCompetition,
    ...firebaseCompetition,

    /*
     * A szezon végső helyezése a static adatból
     * legyen elsődleges.
     *
     * Példa:
     *
     * static: 7
     * Firebase: 8
     *
     * eredmény: 7
     */
    placement:
      staticCompetition.placement ?? firebaseCompetition.placement ?? null,

    /*
     * Új VPG struktúra:
     *
     * vpg: {
     *   seasonId,
     *   leagueSlug
     * }
     */
    vpg: {
      ...(staticCompetition.vpg || {}),
      ...(firebaseCompetition.vpg || {}),
    },

    /*
     * Régi VPG mezők támogatása.
     */
    vpgLeagueSlug:
      firebaseCompetition.vpgLeagueSlug ??
      staticCompetition.vpgLeagueSlug ??
      staticCompetition.vpg?.leagueSlug ??
      null,

    vpgSeasonId:
      firebaseCompetition.vpgSeasonId ??
      staticCompetition.vpgSeasonId ??
      staticCompetition.vpg?.seasonId ??
      null,
  };
}

/**
 * Megkeresi, hogy egy Firebase szezon
 * melyik static szezonhoz tartozik.
 */
function findStaticSeason(firebaseSeason) {
  const firebaseName = normalizeName(firebaseSeason?.name);

  /*
   * 1. Pontos szezon név.
   */
  const exactSeason = staticSeasons.find(
    (season) => normalizeName(season.name) === firebaseName,
  );

  if (exactSeason) {
    return exactSeason;
  }

  /*
   * 2. Competition alapján.
   *
   * Például:
   *
   * Firebase season:
   * Balkan Summer League
   *
   * Firebase competition:
   * Balkan Summer League - League 2
   *
   * Static competition:
   * Balkan Summer League
   */
  const firebaseCompetitions = firebaseSeason?.competitions || [];

  for (const firebaseCompetition of firebaseCompetitions) {
    for (const staticSeason of staticSeasons) {
      const matchingCompetition = findStaticCompetition(
        firebaseCompetition,
        staticSeason.competitions || [],
      );

      if (matchingCompetition) {
        return staticSeason;
      }
    }
  }

  /*
   * 3. Kezdési dátum alapján.
   */
  const firebaseStart =
    firebaseSeason?.period?.start || firebaseSeason?.startDate;

  if (firebaseStart) {
    const matchingByDate = staticSeasons.find(
      (season) => season.period?.start === firebaseStart,
    );

    if (matchingByDate) {
      return matchingByDate;
    }
  }

  return null;
}

/* =========================================================
   SEASON MERGE
   ========================================================= */

/**
 * Egy Firebase szezon merge-elése
 * a hozzá tartozó static szezon adataival.
 */
function mergeSeason(firebaseId, firebaseSeason) {
  const staticSeason = findStaticSeason(firebaseSeason);

  /*
   * Ha nincs static megfelelő,
   * Firebase-only szezon.
   */
  if (!staticSeason) {
    return {
      id: firebaseId,
      ...firebaseSeason,

      competitions: (firebaseSeason.competitions || []).map((competition) =>
        mergeCompetition(competition, []),
      ),
    };
  }

  const firebaseCompetitions = firebaseSeason.competitions || [];

  /*
   * Firebase competitionök merge-elése
   * a static competition konfigurációval.
   */
  const mergedFirebaseCompetitions = firebaseCompetitions.map(
    (firebaseCompetition) =>
      mergeCompetition(firebaseCompetition, staticSeason.competitions || []),
  );

  /*
   * Olyan static competitionök,
   * amelyek még egyáltalán nincsenek Firebase-ben.
   *
   * Ezeket is megtartjuk.
   */
  const staticOnlyCompetitions = (staticSeason.competitions || []).filter(
    (staticCompetition) => {
      return !mergedFirebaseCompetitions.some(
        (firebaseCompetition) =>
          String(firebaseCompetition.id) === String(staticCompetition.id) ||
          competitionNamesMatch(
            firebaseCompetition.name,
            staticCompetition.name,
          ),
      );
    },
  );

  const competitions = [
    ...mergedFirebaseCompetitions,
    ...staticOnlyCompetitions,
  ];

  return {
    /*
     * Static szezon az alap.
     */
    ...staticSeason,

    /*
     * Firebase szezon felülírhatja
     * az alapadatokat.
     */
    ...firebaseSeason,

    /*
     * Mindig a Firebase ID marad
     * a megjelenített szezon ID.
     */
    id: firebaseId,

    /*
     * Period merge.
     */
    period: {
      ...(staticSeason.period || {}),
      ...(firebaseSeason.period || {}),
    },

    /*
     * Competition merge.
     */
    competitions,

    /*
     * Awards merge.
     */
    awards: {
      ...(staticSeason.awards || {}),
      ...(firebaseSeason.awards || {}),
    },

    /*
     * Milestones.
     */
    milestones: firebaseSeason.milestones ?? staticSeason.milestones ?? [],
  };
}

/* =========================================================
   ALL SEASONS MERGE
   ========================================================= */

/**
 * Firebase + static szezonok összefésülése.
 */
function mergeSeasons(firebaseSeasons = {}) {
  const firebaseEntries = Object.entries(firebaseSeasons);

  /*
   * Törölt Firebase rekordok.
   */
  const deletedFirebaseEntries = firebaseEntries.filter(
    ([, firebaseSeason]) => firebaseSeason?.deleted,
  );

  /*
   * Aktív Firebase szezonok merge-elése.
   */
  const mergedFirebaseSeasons = firebaseEntries
    .filter(([, firebaseSeason]) => firebaseSeason && !firebaseSeason.deleted)
    .map(([firebaseId, firebaseSeason]) =>
      mergeSeason(firebaseId, firebaseSeason),
    );

  /*
   * Megkeressük, mely static szezonokat
   * fedik le Firebase rekordok.
   */
  const matchedStaticIds = new Set();

  mergedFirebaseSeasons.forEach((firebaseSeason) => {
    const staticSeason = findStaticSeason(firebaseSeason);

    if (staticSeason) {
      matchedStaticIds.add(String(staticSeason.id));
    }
  });

  /*
   * Törölt static szezonok ID-i.
   */
  const deletedStaticIds = new Set();

  deletedFirebaseEntries.forEach(([firebaseId, firebaseSeason]) => {
    /*
     * Először próbáljuk a Firebase
     * tartalma alapján megtalálni.
     */
    const staticSeason = findStaticSeason(firebaseSeason);

    if (staticSeason) {
      deletedStaticIds.add(String(staticSeason.id));

      return;
    }

    /*
     * Ha nincs content alapján találat,
     * akkor maga a Firebase ID lehet
     * static ID.
     */
    deletedStaticIds.add(String(firebaseId));
  });

  /*
   * Static szezonok, amelyekhez nincs
   * Firebase megfelelő.
   */
  const staticOnlySeasons = staticSeasons.filter(
    (staticSeason) => !matchedStaticIds.has(String(staticSeason.id)),
  );

  /*
   * Végeredmény.
   */
  return [
    ...mergedFirebaseSeasons,

    ...staticOnlySeasons.filter(
      (staticSeason) => !deletedStaticIds.has(String(staticSeason.id)),
    ),
  ];
}

/* =========================================================
   READ
   ========================================================= */

/**
 * Összes szezon lekérése.
 */
export async function getSeasons() {
  const snapshot = await get(ref(database, "seasons"));

  const firebaseSeasons = snapshot.exists() ? snapshot.val() : {};

  return mergeSeasons(firebaseSeasons);
}

/**
 * Egy szezon lekérése ID alapján.
 */
export async function getSeasonById(seasonId) {
  const seasons = await getSeasons();

  return (
    seasons.find((season) => String(season.id) === String(seasonId)) || null
  );
}

/* =========================================================
   ACTIVE SEASON
   ========================================================= */

/**
 * Aktuális szezon lekérése.
 *
 * Elsőként explicit active státuszt keresünk.
 * Ha nincs, dátum alapján keresünk.
 */
export async function getActiveSeason() {
  const seasons = await getSeasons();

  /*
   * 1. Explicit active státusz.
   */
  const explicitActive = seasons.find(
    (season) =>
      season.status === "active" ||
      season.status === "Aktív" ||
      season.active === true,
  );

  if (explicitActive) {
    return explicitActive;
  }

  /*
   * 2. Dátum alapján.
   */
  const today = new Date();

  return (
    seasons.find((season) => {
      const start = season.period?.start || season.startDate;

      const end = season.period?.end || season.endDate;

      if (!start || !end) {
        return false;
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      return today >= startDate && today <= endDate;
    }) || null
  );
}

/* =========================================================
   CREATE
   ========================================================= */

/**
 * Új szezon létrehozása.
 */
export async function createSeason(seasonData) {
  const newSeasonReference = push(ref(database, "seasons"));

  await set(newSeasonReference, seasonData);

  return {
    id: newSeasonReference.key,
    ...seasonData,
  };
}

/* =========================================================
   UPDATE
   ========================================================= */

/**
 * Szezon módosítása.
 */
export async function updateSeason(seasonId, seasonData) {
  await update(ref(database, `seasons/${seasonId}`), seasonData);

  return {
    id: seasonId,
    ...seasonData,
  };
}

/* =========================================================
   DELETE
   ========================================================= */

/**
 * Szezon törlése.
 *
 * Static szezon esetén soft delete.
 * Firebase-only szezon esetén valódi törlés.
 */
export async function deleteSeason(seasonId) {
  /*
   * Megnézzük, hogy static szezon-e.
   */
  const isStaticSeason = staticSeasons.some(
    (season) => String(season.id) === String(seasonId),
  );

  /*
   * Static szezon:
   * soft delete.
   */
  if (isStaticSeason) {
    await set(ref(database, `seasons/${seasonId}`), {
      deleted: true,
    });

    return;
  }

  /*
   * Firebase-only szezon:
   * valódi törlés.
   */
  await remove(ref(database, `seasons/${seasonId}`));
}
