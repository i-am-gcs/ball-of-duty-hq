import { players } from "../data/players";
import { seasons } from "../data/seasons";
import { benefitTrackerData } from "../data/benefitTracker";

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
 * Egy adott szezonhoz tartozó manuális Benefit adatok.
 */
function getSeasonBenefitData(seasonId) {
  return benefitTrackerData[seasonId]?.players ?? {};
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
 *
 * 5 büntetőpont esetén automatikus
 * Benefit jogosultság-vesztés.
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
 * Sikeresen teljesített BOD szezonok.
 */
function getCompletedSeasonIds() {
  return seasons
    .filter((season) => season.status === "completed")
    .sort((a, b) => a.id - b.id)
    .map((season) => season.id);
}

/**
 * Játékos hűségszint.
 */
export function getPlayerLoyaltyLevel(playerId) {
  const completedSeasonIds = getCompletedSeasonIds();

  if (!completedSeasonIds.length) {
    return {
      level: "Recruit",
      icon: "🟢",
      completedSeasons: 0,
    };
  }

  const player = players.find(
    (item) =>
      String(item.id) === String(playerId) ||
      item.nickname === playerId ||
      item.username === playerId,
  );

  const playerSeasons = player?.completedSeasons;

  if (!Array.isArray(playerSeasons)) {
    return {
      level: "Recruit",
      icon: "🟢",
      completedSeasons: 0,
    };
  }

  let consecutive = 0;

  for (let index = completedSeasonIds.length - 1; index >= 0; index -= 1) {
    if (playerSeasons.includes(completedSeasonIds[index])) {
      consecutive += 1;
    } else {
      break;
    }
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
 * Játékos megkeresése VPG statisztikából.
 */
function findVpgPlayer(stats, player) {
  if (!player) {
    return null;
  }

  const nickname = String(player.nickname ?? "").toLowerCase();
  const username = String(player.username ?? "").toLowerCase();

  return (
    stats.find((stat) => {
      const statUsername = String(stat.username ?? "").toLowerCase();

      return statUsername === nickname || statUsername === username;
    }) ?? null
  );
}

/**
 * Kombinált pont:
 *
 * HPCL VPG pont + Balkan VPG pont
 * osztva kettővel.
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
 * Versenysorozat felismerése.
 */
function findCompetitionByType(competitions, type) {
  if (type === "hpcl") {
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

  if (type === "balkan") {
    return (
      competitions.find(
        (competition) => competition.shortName?.toLowerCase() === "balkan",
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

  return null;
}

/**
 * Aktuális szezon Benefit Board.
 *
 * FONTOS:
 * - kizárólag az aktuális BOD szezont használja
 * - VPG statisztikát a meglévő VPG service-ből kér
 * - attendance / voting / penalty / TOTW
 *   manuális Benefit adatból érkezik
 */
export async function getCurrentBenefitBoard() {
  const season = getCurrentSeason();

  if (!season) {
    return {
      season: null,
      players: [],
    };
  }

  const benefitData = getSeasonBenefitData(season.id);

  /**
   * Csak az aktuális szezon VPG
   * statisztikával rendelkező versenyei.
   */
  const vpgCompetitions = getVpgCompetitions(season, "ALL");

  /**
   * HPCL és Balkan versenyek.
   */
  const hpclCompetition = findCompetitionByType(vpgCompetitions, "hpcl");

  const balkanCompetition = findCompetitionByType(vpgCompetitions, "balkan");

  /**
   * VPG statisztikák lekérése külön
   * versenysorozatonként.
   *
   * NEM módosítjuk a működő
   * vpgPlayerStatsService-t.
   */
  let hpclStats = [];
  let balkanStats = [];

  if (hpclCompetition) {
    hpclStats = await getSeasonPlayerStats({
      competition: hpclCompetition,
      weekly: false,
    });
  }

  if (balkanCompetition) {
    balkanStats = await getSeasonPlayerStats({
      competition: balkanCompetition,
      weekly: false,
    });
  }

  /**
   * Ha egyik versenysorozathoz sincs adat,
   * üres VPG statisztikával dolgozunk.
   */
  const hasVpgData = hpclStats.length > 0 || balkanStats.length > 0;

  const rows = players.map((player) => {
    /**
     * Manuális Benefit adatok.
     */
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
     * Loyalty.
     */
    const loyalty = getPlayerLoyaltyLevel(player.id);

    /**
     * VPG játékos HPCL-ben.
     */
    const hpclPlayer = findVpgPlayer(hpclStats, player);

    /**
     * VPG játékos Balkanban.
     */
    const balkanPlayer = findVpgPlayer(balkanStats, player);

    /**
     * VPG pontok.
     */
    const hpclPoints =
      hpclPlayer?.points !== undefined ? Number(hpclPlayer.points) : null;

    const balkanPoints =
      balkanPlayer?.points !== undefined ? Number(balkanPlayer.points) : null;

    /**
     * VPG pont:
     *
     * Az aktuális szezonban szereplő
     * versenysorozatok pontjainak összege.
     *
     * Ha csak egy versenyben van adat,
     * annak pontját használjuk.
     */
    let vpgPoints = null;

    if (hpclPoints !== null || balkanPoints !== null) {
      vpgPoints = (hpclPoints ?? 0) + (balkanPoints ?? 0);
    }

    /**
     * Kombinált pont:
     *
     * HPCL + Balkan pont átlaga.
     *
     * Csak akkor létezik,
     * ha mindkét versenyben van adat.
     */
    const combinedPoints = calculateCombinedPoints(hpclPoints, balkanPoints);

    /**
     * Meccsszám.
     *
     * Külön versenysorozatok,
     * ezért ezeket összeadjuk.
     */
    const matchesPlayed =
      (hpclPlayer?.matchesPlayed ?? 0) + (balkanPlayer?.matchesPlayed ?? 0);

    /**
     * Ha egyik VPG versenyben sincs adat,
     * ne mutassunk 0-t úgy, mintha
     * valódi VPG adat lenne.
     */
    const finalMatchesPlayed =
      hasVpgData && (hpclPlayer || balkanPlayer) ? matchesPlayed : null;

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

      playerName: player.nickname ?? player.username ?? "Ismeretlen",

      loyaltyLevel: loyalty.level,

      loyaltyIcon: loyalty.icon,

      matchesPlayed: finalMatchesPlayed,

      /**
       * Aktuális szezon összes VPG pontja.
       */
      vpgPoints,

      /**
       * HPCL pont külön.
       *
       * A JSX-nek jelenleg nem kötelező,
       * de később jól jöhet.
       */
      hpclPoints,

      /**
       * Balkan pont külön.
       */
      balkanPoints,

      /**
       * HPCL + Balkan átlag.
       */
      combinedPoints,

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

      penaltyPoints,

      totwAppearances: Number(benefit.totwAppearances ?? 0),

      totwBonus: Number(benefit.totwBonus ?? 0),

      status,
    };
  });

  /**
   * Benefit Board sorrend:
   *
   * 1. Benefit státusz
   * 2. Kombinált pont
   * 3. VPG pont
   * 4. Meccsszám
   *
   * Ez csak a megjelenítési sorrend,
   * az adatokat nem módosítja.
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
