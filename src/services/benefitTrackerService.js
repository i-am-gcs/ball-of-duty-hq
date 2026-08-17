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

    const end = season.period.end
      ? new Date(`${season.period.end}T23:59:59`)
      : null;

    if (!end) {
      return today >= start;
    }

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
  /**
   * Manuális büntetőpont.
   */
  if (penaltyPoints >= 5) {
    return {
      key: "blocked",
      label: "Nem jogosult",
      icon: "🔴",
    };
  }

  /**
   * Csak a LE NEM ADOTT SZAVAZAT számít.
   *
   * A votingRate azt mutatja, hogy a játékos
   * a számára releváns pollok hány százalékában
   * adott le ténylegesen szavazatot.
   *
   * IGEN = szavazott
   * NEM = szavazott
   * nincs szavazat = nem szavazott
   *
   * A jelenléti százalékot itt NEM használjuk.
   */
  if (votingRate !== null && votingRate < 50) {
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

/* =========================================================
   DISCORD BENEFIT LOGIKA
   ========================================================= */

/**
 * Discord válasz szövegének normalizálása.
 *
 * IGEN / igen / IGEN  /  igen
 * mind ugyanaz lesz.
 */
function normalizeDiscordAnswer(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Nálunk minden Benefit poll:
 *
 * ID 1 = IGEN
 * ID 2 = NEM
 *
 * Csak akkor tekintjük IGEN-nek,
 * ha mindkét feltétel teljesül.
 */
function isYesAnswer(answer) {
  if (!answer) {
    return false;
  }

  const answerId = Number(answer.id);

  const answerText = normalizeDiscordAnswer(answer.text);

  return answerId === 1 && answerText === "igen";
}

/**
 * Megnézzük, hogy a játékos leadott-e szavazatot.
 */
function hasVoted(playerResult) {
  return playerResult?.status === "VOTED";
}

/**
 * Megnézzük, hogy a játékos IGEN-nel szavazott-e.
 */
function hasVotedYes(playerResult) {
  if (!hasVoted(playerResult)) {
    return false;
  }

  return (playerResult.answers ?? []).some((answer) => isYesAnswer(answer));
}

/**
 * Discord szavazási adatok betöltése.
 *
 * A forrás:
 *
 * discordPolls
 * +
 * discordPollResults
 *
 * A szezonhoz tartozást KIZÁRÓLAG:
 *
 * poll.closedAt
 *
 * határozza meg.
 *
 * Releváns poll egy játékosnak:
 *
 * playerResults között szerepel
 * az adott playerId.
 */
async function loadSeasonDiscordVoteData(season) {
  const [pollsSnapshot, resultsSnapshot] = await Promise.all([
    get(ref(database, "discordPolls")),
    get(ref(database, "discordPollResults")),
  ]);

  if (!pollsSnapshot.exists() || !resultsSnapshot.exists()) {
    return {};
  }

  const pollsData = pollsSnapshot.val() ?? {};

  const resultsData = resultsSnapshot.val() ?? {};

  const seasonStart = new Date(`${season.period.start}T00:00:00`).getTime();

  const seasonEnd = season.period.end
    ? new Date(`${season.period.end}T23:59:59`).getTime()
    : Infinity;

  const polls = Object.entries(pollsData)
    .map(([pollId, poll]) => ({
      id: pollId,
      ...poll,
    }))
    .filter((poll) => {
      /**
       * NINCS category szűrés!
       *
       * A Benefit Trackernek minden olyan
       * lezárt Discord poll releváns lehet,
       * amelyben az adott játékos szerepel
       * playerResults alatt.
       */

      if (!poll?.closedAt) {
        return false;
      }

      const closedAt = new Date(poll.closedAt).getTime();

      if (Number.isNaN(closedAt)) {
        return false;
      }

      return closedAt >= seasonStart && closedAt <= seasonEnd;
    });

  const playerVoteData = {};

  for (const poll of polls) {
    const pollResults = resultsData[poll.id];

    if (!pollResults?.playerResults) {
      continue;
    }

    const playerResults = Object.values(pollResults.playerResults);

    for (const playerResult of playerResults) {
      const playerId = playerResult?.playerId;

      if (!playerId) {
        continue;
      }

      if (!playerVoteData[playerId]) {
        playerVoteData[playerId] = {
          attended: 0,
          participated: 0,
          total: 0,
        };
      }

      /**
       * Ez a poll az adott játékos
       * számára releváns.
       */
      playerVoteData[playerId].total += 1;

      /**
       * Szavazás:
       *
       * leadott szavazat /
       * releváns pollok
       */
      if (hasVoted(playerResult)) {
        playerVoteData[playerId].participated += 1;
      }

      /**
       * Jelenlét:
       *
       * IGEN /
       * releváns pollok
       */
      if (hasVotedYes(playerResult)) {
        playerVoteData[playerId].attended += 1;
      }
    }
  }

  return playerVoteData;
}

/* =========================================================
   CURRENT BENEFIT BOARD
   ========================================================= */

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
   * Manuális / Benefit adatok.
   *
   * Innen továbbra is:
   *
   * - büntetőpont
   * - TOTW
   */
  const benefitData = await getSeasonBenefitData(season.id);

  /**
   * Discord szavazási adatok.
   *
   * Automatikusan:
   *
   * - jelenlét
   * - szavazás
   */
  const discordVoteData = await loadSeasonDiscordVoteData(season);

  /**
   * Aktuális szezon VPG adatok.
   */
  const currentSeasonVpgData = await loadSeasonVpgData(season);

  /**
   * Korábbi lezárt szezonok VPG adatai
   * a loyalty számításához.
   */
  const completedSeasons = getCompletedSeasons();

  const completedSeasonData = await Promise.all(
    completedSeasons.map(async (completedSeason) => ({
      season: completedSeason,

      vpgData: await loadSeasonVpgData(completedSeason),
    })),
  );

  /**
   * Aktuális HPCL / Balkan competition.
   */
  const hpclCompetition = findHpclCompetition(
    currentSeasonVpgData.competitions,
  );

  const balkanCompetition = findBalkanCompetition(
    currentSeasonVpgData.competitions,
  );

  /**
   * Competition statok.
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
   * Csak aktív squad játékosok.
   */
  const activePlayers = firebasePlayers.filter(
    (player) => player.status === "Aktív",
  );

  const rows = activePlayers.map((player) => {
    const benefit = benefitData[player.id] ?? {};

    /**
     * Discord adatok.
     */
    const discordVote = discordVoteData[player.id] ?? null;

    const attendance = discordVote
      ? {
          attended: discordVote.attended,

          total: discordVote.total,
        }
      : {
          attended: 0,
          total: 0,
        };

    const voting = discordVote
      ? {
          participated: discordVote.participated,

          total: discordVote.total,
        }
      : {
          participated: 0,
          total: 0,
        };

    const attendanceRate = calculateAttendanceRate(attendance);

    const votingRate = calculateVotingRate(voting);

    /**
     * Büntetőpont továbbra is manuális.
     */
    const penaltyPoints = Number(benefit.penaltyPoints ?? 0);

    /**
     * Automatikus loyalty.
     */
    const loyalty = calculateLoyaltyLevel(player, completedSeasonData);

    /**
     * VPG játékos keresése.
     */
    const hpclPlayer = findVpgPlayer(hpclPlayerMap, player);

    const balkanPlayer = findVpgPlayer(balkanPlayerMap, player);

    /**
     * HPCL pont.
     */
    const hpclPoints =
      hpclPlayer?.points !== undefined ? Number(hpclPlayer.points) : null;

    /**
     * Balkan / BSL pont.
     */
    const balkanPoints =
      balkanPlayer?.points !== undefined ? Number(balkanPlayer.points) : null;

    /**
     * Összes VPG pont.
     */
    let vpgPoints = null;

    if (hpclPoints !== null || balkanPoints !== null) {
      vpgPoints = (hpclPoints ?? 0) + (balkanPoints ?? 0);
    }

    /**
     * HPCL + Balkan átlag.
     */
    const combinedPoints = calculateCombinedPoints(hpclPoints, balkanPoints);

    /**
     * Aktuális szezon meccsszám.
     */
    const matchesPlayed =
      Number(hpclPlayer?.matchesPlayed ?? 0) +
      Number(balkanPlayer?.matchesPlayed ?? 0);

    const hasCurrentVpgStats = Boolean(hpclPlayer || balkanPlayer);

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

      vpgUsername: player.vpgUsername ?? "",

      loyaltyLevel: loyalty.level,

      loyaltyIcon: loyalty.icon,

      completedSeasons: loyalty.completedSeasons,

      matchesPlayed: finalMatchesPlayed,

      vpgPoints,

      hpclPoints,

      balkanPoints,

      combinedPoints,

      /**
       * Discordból automatikus.
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
       * Manuális admin adatok.
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
