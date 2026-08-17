import { get, ref, update } from "firebase/database";

import { database } from "../firebase/firebase";

import { seasons } from "../data/seasons";
import { benefitTrackerData } from "../data/benefitTracker";

import { getPlayers } from "./playerService";

import {
  getSeasonPlayerStats,
  getVpgCompetitions,
} from "./vpgPlayerStatsService";

/**
 * Aktuális BOD szezon meghatározása.
 */
export function getCurrentSeason() {
  const today = new Date();

  const activeSeason = seasons.find((season) => {
    const start = new Date(`${season.period.start}T00:00:00`);
    const end = new Date(`${season.period.end}T23:59:59`);

    return today >= start && today <= end;
  });

  if (activeSeason) {
    return activeSeason;
  }

  return (
    seasons.find((season) => season.status === "upcoming") ??
    seasons[seasons.length - 1] ??
    null
  );
}

/**
 * Egy adott szezon Benefit adatai.
 *
 * Elsődlegesen Firebase-ből olvasunk.
 *
 * A benefitTrackerData továbbra is fallbackként
 * megmarad, hogy a meglévő adatstruktúra ne törjön el.
 */
async function getSeasonBenefitData(seasonId) {
  const localData = benefitTrackerData[seasonId]?.players ?? {};

  const benefitReference = ref(database, `benefitTracker/${seasonId}/players`);

  const snapshot = await get(benefitReference);

  if (!snapshot.exists()) {
    return localData;
  }

  return {
    ...localData,
    ...snapshot.val(),
  };
}

/**
 * Egy játékos Benefit adatainak frissítése
 * az aktuális / megadott szezonban.
 *
 * Például:
 *
 * updatePlayerBenefit(3, playerId, {
 *   penaltyPoints: 2,
 * });
 */
export async function updatePlayerBenefit(seasonId, playerId, changes) {
  const playerBenefitReference = ref(
    database,
    `benefitTracker/${seasonId}/players/${playerId}`,
  );

  await update(playerBenefitReference, changes);

  return {
    playerId,
    ...changes,
  };
}

/**
 * Százalék számítása.
 */
function calculatePercentage(value, total) {
  if (!total || total <= 0) {
    return null;
  }

  return Math.round((value / total) * 100);
}

/**
 * Jelenléti százalék.
 */
export function calculateAttendanceRate(attendance) {
  return calculatePercentage(attendance?.attended ?? 0, attendance?.total ?? 0);
}

/**
 * Szavazási százalék.
 */
export function calculateVotingRate(voting) {
  return calculatePercentage(voting?.participated ?? 0, voting?.total ?? 0);
}

/**
 * Benefit státusz.
 */
export function getBenefitStatus({
  penaltyPoints = 0,
  attendanceRate,
  votingRate,
}) {
  if (penaltyPoints >= 5) {
    return {
      key: "blocked",
      label: "Nem jogosult",
      icon: "🔴",
    };
  }

  if (
    (attendanceRate !== null && attendanceRate < 50) ||
    (votingRate !== null && votingRate < 50)
  ) {
    return {
      key: "warning",
      label: "Figyelem",
      icon: "🟡",
    };
  }

  return {
    key: "active",
    label: "Rendben",
    icon: "🟢",
  };
}

/**
 * Lezárt BOD szezonok.
 *
 * Csak ezek számítanak bele a loyalty rendszerbe.
 */
function getCompletedSeasons() {
  return seasons
    .filter((season) => season.status === "completed")
    .sort((a, b) => b.id - a.id);
}

/**
 * VPG username normalizálása.
 */
function normalizeVpgUsername(username) {
  return String(username ?? "")
    .trim()
    .toLowerCase();
}

/**
 * VPG statisztikai tömbből Map készítése.
 */
function createVpgPlayerMap(stats) {
  return new Map(
    stats
      .filter((stat) => stat?.username)
      .map((stat) => [normalizeVpgUsername(stat.username), stat]),
  );
}

/**
 * Játékos megkeresése a VPG Map-ben.
 */
function findVpgPlayer(vpgPlayerMap, player) {
  const username = normalizeVpgUsername(player?.vpgUsername);

  if (!username) {
    return null;
  }

  return vpgPlayerMap.get(username) ?? null;
}

/**
 * Egy szezon összes VPG statisztikájának betöltése.
 *
 * Egy szezonban minden versenyt csak egyszer kérünk le.
 */
async function loadSeasonVpgData(season) {
  if (!season) {
    return {
      competitions: [],
      competitionStats: [],
    };
  }

  const competitions = getVpgCompetitions(season, "ALL");

  if (!competitions.length) {
    return {
      competitions: [],
      competitionStats: [],
    };
  }

  const competitionStats = await Promise.all(
    competitions.map(async (competition) => {
      const stats = await getSeasonPlayerStats({
        competition,
        weekly: false,
      });

      return {
        competition,
        stats,
        playerMap: createVpgPlayerMap(stats),
      };
    }),
  );

  return {
    competitions,
    competitionStats,
  };
}

/**
 * VPG stat keresése egy adott versenyhez.
 */
function findCompetitionStats(seasonVpgData, competition) {
  if (!competition) {
    return null;
  }

  return (
    seasonVpgData.competitionStats.find(
      (item) => item.competition.id === competition.id,
    ) ?? null
  );
}

/**
 * HPCL verseny felismerése.
 */
function findHpclCompetition(competitions) {
  return (
    competitions.find(
      (competition) => competition.shortName?.toLowerCase() === "hpcl",
    ) ??
    competitions.find(
      (competition) => competition.leagueSlug?.toLowerCase() === "hpcl1",
    ) ??
    competitions.find(
      (competition) => competition.vpg?.leagueSlug?.toLowerCase() === "hpcl1",
    ) ??
    null
  );
}

/**
 * Balkan / BSL verseny felismerése.
 */
function findBalkanCompetition(competitions) {
  return (
    competitions.find(
      (competition) => competition.shortName?.toLowerCase() === "balkan",
    ) ??
    competitions.find((competition) =>
      competition.shortName?.toLowerCase().includes("balkan"),
    ) ??
    competitions.find((competition) =>
      competition.shortName?.toLowerCase().includes("bsl"),
    ) ??
    competitions.find((competition) =>
      competition.leagueSlug?.toLowerCase().includes("balkan"),
    ) ??
    competitions.find((competition) =>
      competition.vpg?.leagueSlug?.toLowerCase().includes("balkan"),
    ) ??
    null
  );
}

/**
 * Egy adott játékos teljesített-e egy lezárt szezont?
 *
 * Legalább 1 hivatalos mérkőzés elegendő.
 */
function hasPlayedCompletedSeason(player, seasonVpgData) {
  if (!player?.vpgUsername) {
    return false;
  }

  const username = normalizeVpgUsername(player.vpgUsername);

  return seasonVpgData.competitionStats.some(({ playerMap }) => {
    const vpgPlayer = playerMap.get(username);

    return vpgPlayer && Number(vpgPlayer.matchesPlayed ?? 0) > 0;
  });
}

/**
 * Loyalty rang automatikus kiszámítása.
 */
function calculateLoyaltyLevel(player, completedSeasonData) {
  if (!player?.vpgUsername) {
    return {
      level: "Recruit",
      icon: "🟢",
      completedSeasons: 0,
    };
  }

  let consecutive = 0;

  for (const seasonData of completedSeasonData) {
    const played = hasPlayedCompletedSeason(player, seasonData.vpgData);

    if (!played) {
      break;
    }

    consecutive += 1;
  }

  if (consecutive >= 5) {
    return {
      level: "Legend",
      icon: "🟡",
      completedSeasons: consecutive,
    };
  }

  if (consecutive >= 3) {
    return {
      level: "Veteran",
      icon: "🟣",
      completedSeasons: consecutive,
    };
  }

  if (consecutive >= 2) {
    return {
      level: "Operator",
      icon: "🔵",
      completedSeasons: consecutive,
    };
  }

  return {
    level: "Recruit",
    icon: "🟢",
    completedSeasons: consecutive,
  };
}

/**
 * Kombinált pont:
 *
 * HPCL + Balkan pontok átlaga.
 */
export function calculateCombinedPoints(hpclPoints, balkanPoints) {
  if (
    hpclPoints === null ||
    hpclPoints === undefined ||
    balkanPoints === null ||
    balkanPoints === undefined
  ) {
    return null;
  }

  return Math.round(((hpclPoints + balkanPoints) / 2) * 10) / 10;
}

/**
 * Aktuális szezon Benefit Board.
 */
export async function getCurrentBenefitBoard() {
  const season = getCurrentSeason();

  if (!season) {
    return {
      season: null,
      players: [],
    };
  }

  /**
   * Aktuális Firebase squad.
   */
  const firebasePlayers = await getPlayers();

  /**
   * Aktuális szezon Benefit adatai Firebase-ből.
   */
  const benefitData = await getSeasonBenefitData(season.id);

  /**
   * Aktuális szezon VPG adatok.
   */
  const currentSeasonVpgData = await loadSeasonVpgData(season);

  /**
   * Lezárt szezonok VPG adatai.
   *
   * Minden lezárt szezon csak egyszer kerül lekérésre.
   */
  const completedSeasons = getCompletedSeasons();

  const completedSeasonData = await Promise.all(
    completedSeasons.map(async (completedSeason) => ({
      season: completedSeason,
      vpgData: await loadSeasonVpgData(completedSeason),
    })),
  );

  /**
   * Aktuális HPCL / Balkan versenyek.
   */
  const hpclCompetition = findHpclCompetition(
    currentSeasonVpgData.competitions,
  );

  const balkanCompetition = findBalkanCompetition(
    currentSeasonVpgData.competitions,
  );

  /**
   * Aktuális verseny stat map-ek.
   */
  const hpclStatsData = findCompetitionStats(
    currentSeasonVpgData,
    hpclCompetition,
  );

  const balkanStatsData = findCompetitionStats(
    currentSeasonVpgData,
    balkanCompetition,
  );

  const hpclPlayerMap = hpclStatsData?.playerMap ?? new Map();

  const balkanPlayerMap = balkanStatsData?.playerMap ?? new Map();

  /**
   * Aktív squad összeállítása.
   *
   * A Benefit Tracker kizárólag az aktív játékosokat mutatja.
   * A Firebase-ből érkező admin / technikai / inaktív rekordok
   * ezért nem kerülnek bele a Benefit Boardba.
   */
  const activePlayers = firebasePlayers.filter(
    (player) => player.status === "Aktív",
  );

  const rows = activePlayers.map((player) => {
    const benefit = benefitData[player.id] ?? {};

    const attendance = benefit.attendance ?? {
      attended: 0,
      total: 0,
    };

    const voting = benefit.voting ?? {
      participated: 0,
      total: 0,
    };

    const attendanceRate = calculateAttendanceRate(attendance);

    const votingRate = calculateVotingRate(voting);

    const penaltyPoints = Number(benefit.penaltyPoints ?? 0);

    /**
     * Automatikus loyalty.
     */
    const loyalty = calculateLoyaltyLevel(player, completedSeasonData);

    /**
     * Aktuális VPG játékos.
     */
    const hpclPlayer = findVpgPlayer(hpclPlayerMap, player);

    const balkanPlayer = findVpgPlayer(balkanPlayerMap, player);

    /**
     * Aktuális VPG pontok.
     */
    const hpclPoints =
      hpclPlayer?.points !== undefined ? Number(hpclPlayer.points) : null;

    const balkanPoints =
      balkanPlayer?.points !== undefined ? Number(balkanPlayer.points) : null;

    /**
     * Összes aktuális VPG pont.
     */
    let vpgPoints = null;

    if (hpclPoints !== null || balkanPoints !== null) {
      vpgPoints = (hpclPoints ?? 0) + (balkanPoints ?? 0);
    }

    /**
     * Kombinált pont.
     */
    const combinedPoints = calculateCombinedPoints(hpclPoints, balkanPoints);

    /**
     * Aktuális szezon meccsszám.
     */
    const matchesPlayed =
      (hpclPlayer?.matchesPlayed ?? 0) + (balkanPlayer?.matchesPlayed ?? 0);

    const hasCurrentVpgStats = hpclPlayer || balkanPlayer;

    const finalMatchesPlayed = hasCurrentVpgStats ? matchesPlayed : null;

    /**
     * Benefit státusz.
     */
    const status = getBenefitStatus({
      penaltyPoints,
      attendanceRate,
      votingRate,
    });

    return {
      playerId: player.id,

      playerName:
        player.nickname ?? player.username ?? player.name ?? "Ismeretlen",

      /**
       * Firebase profilból.
       */
      vpgUsername: player.vpgUsername ?? "",

      /**
       * Automatikus loyalty.
       */
      loyaltyLevel: loyalty.level,

      loyaltyIcon: loyalty.icon,

      completedSeasons: loyalty.completedSeasons,

      /**
       * Aktuális szezon VPG.
       */
      matchesPlayed: finalMatchesPlayed,

      vpgPoints,

      hpclPoints,

      balkanPoints,

      combinedPoints,

      /**
       * Discord / Benefit.
       */
      attendance: {
        attended: attendance.attended,

        total: attendance.total,

        rate: attendanceRate,
      },

      voting: {
        participated: voting.participated,

        total: voting.total,

        rate: votingRate,
      },

      /**
       * Admin által kezelhető.
       */
      penaltyPoints,

      totwAppearances: Number(benefit.totwAppearances ?? 0),

      totwBonus: Number(benefit.totwBonus ?? 0),

      status,
    };
  });

  /**
   * Benefit Board sorrend.
   *
   * 1. Kombinált pont
   * 2. VPG pont
   * 3. Meccsszám
   */
  rows.sort((a, b) => {
    const combinedA = a.combinedPoints ?? -1;

    const combinedB = b.combinedPoints ?? -1;

    if (combinedB !== combinedA) {
      return combinedB - combinedA;
    }

    const vpgA = a.vpgPoints ?? -1;

    const vpgB = b.vpgPoints ?? -1;

    if (vpgB !== vpgA) {
      return vpgB - vpgA;
    }

    return (b.matchesPlayed ?? 0) - (a.matchesPlayed ?? 0);
  });

  return {
    season,
    players: rows,
  };
}
