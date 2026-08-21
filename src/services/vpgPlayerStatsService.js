import {
  filterMatchesByCompetition,
  getVpgTeamMatches,
} from "./vpgMatchService.js";

const VPG_API_BASE = "https://api.virtualprogaming.com/public";

const VPG_IMAGE_BASE =
  "https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEaQYaYw";

const BOD_TEAM_SLUG = "pannonia-fc";
const BOD_TEAM_NAME = "Ball of Duty CF";
const BOD_TEAM_ID = 36206;
const matchPlayerDataCache = new Map();
const matchRequestWaiters = [];
let activeMatchRequests = 0;
const MAX_PARALLEL_MATCH_REQUESTS = 6;

/**
 * Heti nézethez és kompatibilitási tartalékként használt leaderboardok.
 */
export const VPG_POSITION_LEADERBOARDS = [
  "top_gk",
  "top_cb",
  "top_fb",
  "top_cdm",
  "top_cam",
  "top_wingers",
  "top_strikers",
];

export const VPG_LEADERBOARD_TYPES = {
  HIGHEST_RATED: "highest_rated",
  TOP_GK: "top_gk",
  TOP_CB: "top_cb",
  TOP_FB: "top_fb",
  TOP_CDM: "top_cdm",
  TOP_CAM: "top_cam",
  TOP_WINGERS: "top_wingers",
  TOP_STRIKERS: "top_strikers",

  TOP_SCORER: "top_scorer",
  TOP_ASSIST: "top_assist",
};

/* =========================================================
   IMAGE HELPERS
   ========================================================= */

export function getVpgImageUrl(imageId) {
  if (!imageId) {
    return null;
  }

  return `${VPG_IMAGE_BASE}/${imageId}/smThumb`;
}

export function getVpgPlayerAvatarUrl(avatarId) {
  return getVpgImageUrl(avatarId);
}

export function getVpgTeamLogoUrl(logoId) {
  return getVpgImageUrl(logoId);
}

/* =========================================================
   COMPETITION / SEASON HELPERS
   ========================================================= */

export function getCompetitionVpgSeasonId(competition) {
  if (!competition) {
    return null;
  }

  return competition.vpg?.seasonId ?? competition.vpgSeasonId ?? null;
}

export function getCompetitionVpgLeagueSlug(competition) {
  if (!competition) {
    return null;
  }

  return competition.vpg?.leagueSlug ?? competition.vpgLeagueSlug ?? null;
}

export function hasVpgPlayerStats(competition) {
  return Boolean(getCompetitionVpgSeasonId(competition));
}

/**
 * VPG statisztikai competitionök lekérése.
 *
 * FONTOS:
 *
 * A VPG statisztikai egysége a VPG seasonId.
 *
 * Példa:
 *
 * Balkan Summer League
 *   seasonId: 18
 *
 * Balkan Cup
 *   seasonId: 18
 *
 * Ezek az ALL statisztikában EGYETLEN
 * VPG statisztikai szezonként jelennek meg.
 *
 * Ugyanez a jövőben:
 *
 * Balkan Summer League -> 29
 * Balkan Cup           -> 29
 *
 * esetén automatikusan egyetlen Balkan 29
 * statisztikai egységet eredményez.
 *
 * Konkrét competition kiválasztásánál viszont
 * továbbra is az eredeti competitiont adjuk vissza.
 */
export function getVpgCompetitions(season, competitionId = "ALL") {
  if (!season) {
    return [];
  }

  const competitions = (season.competitions || []).filter((competition) =>
    hasVpgPlayerStats(competition),
  );

  /*
   * Konkrét competition kiválasztása.
   *
   * Itt NEM deduplikálunk seasonId alapján.
   *
   * Ha a felhasználó konkrétan egy competitiont választ,
   * akkor azt kapja vissza.
   */
  if (competitionId && competitionId !== "ALL") {
    return competitions.filter(
      (competition) => String(competition.id) === String(competitionId),
    );
  }

  /*
   * ALL statisztika.
   *
   * Egy VPG seasonId csak egyszer szerepelhet.
   */
  const uniqueByVpgSeason = new Map();

  for (const competition of competitions) {
    const vpgSeasonId = getCompetitionVpgSeasonId(competition);

    if (!vpgSeasonId) {
      continue;
    }

    const key = String(vpgSeasonId);

    if (!uniqueByVpgSeason.has(key)) {
      uniqueByVpgSeason.set(key, competition);
    }
  }

  return [...uniqueByVpgSeason.values()];
}

/* =========================================================
   VPG LEADERBOARD API
   ========================================================= */

export async function getVpgTeamLeaderboard(
  leaderboard,
  { season, weekly = false, limit = 100, offset = 0 } = {},
) {
  if (!leaderboard) {
    throw new Error("Nincs megadva VPG leaderboard típus.");
  }

  if (!season) {
    throw new Error("Nincs megadva VPG season ID.");
  }

  const params = new URLSearchParams();

  params.set("leaderboard", leaderboard);
  params.set("weekly", String(weekly));
  params.set("season", String(season));
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const url =
    `${VPG_API_BASE}/teams/${BOD_TEAM_SLUG}/leaderboard/` +
    `?${params.toString()}`;

  console.log("VPG LEADERBOARD REQUEST:", url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`VPG leaderboard API hiba: ${response.status}`);
  }

  const data = await response.json();

  if (!data || !Array.isArray(data.data)) {
    console.error("VPG leaderboard API ismeretlen válasz:", data);

    throw new Error(
      "A VPG leaderboard API nem megfelelő formátumú adatot adott vissza.",
    );
  }

  return data;
}

/**
 * Teljes VPG leaderboard lekérése.
 *
 * Nem csak az első 10 játékost kérjük le.
 */
export async function getAllVpgTeamLeaderboard(
  leaderboard,
  { season, weekly = false, pageSize = 100 } = {},
) {
  if (!season) {
    throw new Error("Nincs megadva VPG season ID.");
  }

  let offset = 0;
  let allPlayers = [];
  let totalCount = null;

  while (true) {
    const response = await getVpgTeamLeaderboard(leaderboard, {
      season,
      weekly,
      limit: pageSize,
      offset,
    });

    const players = response.data || [];

    allPlayers.push(...players);

    if (totalCount === null) {
      totalCount =
        typeof response.count === "number" ? response.count : players.length;
    }

    if (
      players.length === 0 ||
      allPlayers.length >= totalCount ||
      players.length < pageSize
    ) {
      break;
    }

    offset += pageSize;
  }

  return allPlayers;
}

/* =========================================================
   NORMALIZATION
   ========================================================= */

export function normalizeVpgPlayerStat(player) {
  return {
    username: player.username || "-",

    avatar: getVpgPlayerAvatarUrl(player.user_avatar),

    nationality: player.user_nationality || "",

    teamName: player.team_name || BOD_TEAM_NAME,

    teamSlug: player.team_slug || BOD_TEAM_SLUG,

    teamLogo: getVpgTeamLogoUrl(player.team_logo),

    points: Number(player.points ?? 0),

    /*
     * VPG által adott rating.
     *
     * Ha egy játékos több pozíciós leaderboardon
     * szerepel, az össze lesz adva.
     */
    matchRating: Number(player.match_rating ?? 0),

    // Pozíciós rekordnál ezt nem használjuk; a hiteles meccsszámot a
    // highest_rated leaderboard adja.
    matchesPlayed: Number(player.matches_played ?? 0),

    goals: player.goals != null ? Number(player.goals) : null,

    assists: player.assists != null ? Number(player.assists) : null,

    passAccuracy:
      player.pass_accuracy != null ? Number(player.pass_accuracy) : null,

    passesMade: player.passes_made != null ? Number(player.passes_made) : null,

    tacklesMade:
      player.tackles_made != null ? Number(player.tackles_made) : null,

    shots: player.shots != null ? Number(player.shots) : null,

    tackleSuccess:
      player.tackle_success != null ? Number(player.tackle_success) : null,

    standingTackles:
      player.standing_tackles != null ? Number(player.standing_tackles) : null,

    slidingTackles:
      player.sliding_tackles != null ? Number(player.sliding_tackles) : null,

    saves: player.saves != null ? Number(player.saves) : null,

    cleanSheet: player.clean_sheet != null ? Number(player.clean_sheet) : null,

    saveSuccess:
      player.save_success != null ? Number(player.save_success) : null,

    dribbleSuccess:
      player.dribble_success != null ? Number(player.dribble_success) : null,

    yellowCard: player.yellow_card != null ? Number(player.yellow_card) : null,

    redCard: player.red_card != null ? Number(player.red_card) : null,
  };
}

/* =========================================================
   PLAYER MERGE
   ========================================================= */

const SUM_STAT_FIELDS = [
  "goals",
  "assists",
  "passesMade",
  "tacklesMade",
  "shots",
  "standingTackles",
  "slidingTackles",
  "saves",
  "cleanSheet",
  "yellowCard",
  "redCard",
];

/**
 * A nyers VPG meccsadatokra alkalmazott saját pontképlet.
 */
export function calculateVpgPoints(player) {
  const points =
    Number(player.matchRating ?? 0) +
    Number(player.goals ?? 0) * 10 +
    Number(player.assists ?? 0) * 7.5 +
    Number(player.passesMade ?? 0) * 0.2 +
    Number(player.tacklesMade ?? 0) * 2 +
    Number(player.shots ?? 0) * 0.3 +
    Number(player.saves ?? 0) +
    Number(player.cleanSheet ?? 0) * 10;

  return Math.round((points + Number.EPSILON) * 10) / 10;
}

const RATE_STAT_FIELDS = [
  "passAccuracy",
  "tackleSuccess",
  "saveSuccess",
  "dribbleSuccess",
];

function mergeStats(existing, incoming, mode) {
  for (const field of SUM_STAT_FIELDS) {
    existing[field] =
      mode === "max"
        ? Math.max(existing[field] ?? 0, incoming[field] ?? 0)
        : (existing[field] ?? 0) + (incoming[field] ?? 0);
  }

  // A százalékos statok nem összegezhetők. A CAM/CDM párnál a nagyobb
  // értéket, más pozíciók között az első tényleges értéket tartjuk meg.
  for (const field of RATE_STAT_FIELDS) {
    if (incoming[field] == null) continue;

    if (mode === "max") {
      existing[field] = Math.max(existing[field] ?? 0, incoming[field]);
    } else if (existing[field] == null) {
      existing[field] = incoming[field];
    }
  }
}

/* =========================================================
   POSITION LEADERBOARD MERGE
   ========================================================= */

export function mergePositionLeaderboards(leaderboards) {
  const playersByUsername = new Map();

  const highestRated = leaderboards.find(
    ({ leaderboard }) => leaderboard === VPG_LEADERBOARD_TYPES.HIGHEST_RATED,
  );

  for (const rawPlayer of highestRated?.players ?? []) {
    const player = normalizeVpgPlayerStat(rawPlayer);
    const emptyPlayer = {
      ...player,
      points: 0,
      _centralMidfieldStats: null,
    };

    for (const field of SUM_STAT_FIELDS) emptyPlayer[field] = 0;
    for (const field of RATE_STAT_FIELDS) emptyPlayer[field] = null;

    playersByUsername.set(player.username.toLowerCase(), emptyPlayer);
  }

  for (const leaderboard of leaderboards) {
    if (leaderboard.leaderboard === VPG_LEADERBOARD_TYPES.HIGHEST_RATED) {
      continue;
    }

    const isCentralMidfield =
      leaderboard.leaderboard === VPG_LEADERBOARD_TYPES.TOP_CAM ||
      leaderboard.leaderboard === VPG_LEADERBOARD_TYPES.TOP_CDM;

    for (const rawPlayer of leaderboard.players) {
      const player = normalizeVpgPlayerStat(rawPlayer);

      const key = player.username.toLowerCase();

      if (!playersByUsername.has(key)) {
        const emptyPlayer = {
          ...player,
          points: 0,
          matchRating: 0,
          matchesPlayed: 0,
          _centralMidfieldStats: null,
        };

        for (const field of SUM_STAT_FIELDS) emptyPlayer[field] = 0;
        for (const field of RATE_STAT_FIELDS) emptyPlayer[field] = null;

        playersByUsername.set(key, emptyPlayer);
      }

      const existing = playersByUsername.get(key);

      if (isCentralMidfield) {
        if (!existing._centralMidfieldStats) {
          existing._centralMidfieldStats = { ...player };
        } else {
          mergeStats(existing._centralMidfieldStats, player, "max");
        }
      } else {
        mergeStats(existing, player, "sum");
      }
    }
  }

  return [...playersByUsername.values()]
    .map((player) => {
      if (player._centralMidfieldStats) {
        mergeStats(player, player._centralMidfieldStats, "sum");
      }
      delete player._centralMidfieldStats;
      player.points = calculateVpgPoints(player);
      return player;
    })
    .sort((a, b) => b.points - a.points);
}

/* =========================================================
   SINGLE COMPETITION PLAYER STATS
   ========================================================= */

async function getSeasonLeaderboardPlayerStats({
  competition,
  weekly = false,
} = {}) {
  const vpgSeasonId = getCompetitionVpgSeasonId(competition);

  if (!vpgSeasonId) {
    throw new Error("A competitionhöz nincs megadva VPG season ID.");
  }

  const leaderboards = await Promise.all(
    [VPG_LEADERBOARD_TYPES.HIGHEST_RATED, ...VPG_POSITION_LEADERBOARDS].map(
      async (leaderboard) => {
        const players = await getAllVpgTeamLeaderboard(leaderboard, {
          season: vpgSeasonId,
          weekly,
        });

        return {
          leaderboard,
          players,
        };
      },
    ),
  );

  return mergePositionLeaderboards(leaderboards);
}

async function getVpgMatchPlayerData(matchId) {
  const key = String(matchId);

  if (matchPlayerDataCache.has(key)) {
    return matchPlayerDataCache.get(key);
  }

  const request = (async () => {
    if (activeMatchRequests >= MAX_PARALLEL_MATCH_REQUESTS) {
      await new Promise((resolve) => matchRequestWaiters.push(resolve));
    } else {
      activeMatchRequests += 1;
    }

    try {
      const response = await fetch(`${VPG_API_BASE}/matches/${matchId}/data/`);

      if (!response.ok) {
        throw new Error(`VPG meccsstatisztika API hiba: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("A VPG meccsstatisztika ismeretlen formátumú.");
      }

      return data;
    } finally {
      const nextRequest = matchRequestWaiters.shift();
      if (nextRequest) nextRequest();
      else activeMatchRequests -= 1;
    }
  })();

  matchPlayerDataCache.set(key, request);

  try {
    return await request;
  } catch (error) {
    matchPlayerDataCache.delete(key);
    throw error;
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );

  return results;
}

function aggregateMatchPlayerStats(matchPlayerLists) {
  const playersByUsername = new Map();

  for (const matchPlayers of matchPlayerLists) {
    for (const rawPlayer of matchPlayers) {
      if (Number(rawPlayer.team_id) !== BOD_TEAM_ID) continue;

      const player = normalizeVpgPlayerStat({
        ...rawPlayer,
        user_avatar: rawPlayer.user_avatar ?? rawPlayer.avatar,
      });
      const key = player.username.toLowerCase();

      if (!playersByUsername.has(key)) {
        const emptyPlayer = {
          ...player,
          points: 0,
          matchRating: 0,
          matchesPlayed: 0,
          positions: {},
        };

        for (const field of SUM_STAT_FIELDS) emptyPlayer[field] = 0;
        for (const field of RATE_STAT_FIELDS) emptyPlayer[field] = null;
        playersByUsername.set(key, emptyPlayer);
      }

      const existing = playersByUsername.get(key);
      existing.matchRating += player.matchRating;
      existing.matchesPlayed += 1;
      mergeStats(existing, player, "sum");

      const position = String(rawPlayer.position || "").toUpperCase();
      if (position) {
        existing.positions[position] =
          (existing.positions[position] ?? 0) + 1;
      }
    }
  }

  return [...playersByUsername.values()]
    .map((player) => ({
      ...player,
      matchRating: Math.round((player.matchRating + Number.EPSILON) * 10) / 10,
      points: calculateVpgPoints(player),
    }))
    .sort((a, b) => b.points - a.points);
}

async function getSeasonMatchPlayerStats({ competition } = {}) {
  const completedMatches = await getVpgTeamMatches("complete");
  const competitionMatches = filterMatchesByCompetition(
    completedMatches,
    competition,
  );

  if (competitionMatches.length === 0) return [];

  const matchPlayerLists = await mapWithConcurrency(
    competitionMatches,
    6,
    (match) => getVpgMatchPlayerData(match.id),
  );

  return aggregateMatchPlayerStats(matchPlayerLists);
}

export async function getSeasonPlayerStats({
  competition,
  weekly = false,
} = {}) {
  // A publikus meccs-adat endpointnak nincs heti szűrése; ezt a ritkán
  // használt nézetet változatlanul a VPG leaderboard szolgálja ki.
  if (weekly) {
    return getSeasonLeaderboardPlayerStats({ competition, weekly });
  }

  const matchStats = await getSeasonMatchPlayerStats({ competition });

  // A VPG completed-meccs feedje nem őrzi az összes régi seasont. Ha az
  // adott competitionből egyetlen meccs sem érhető el, a történelmi
  // loyalty és örökranglista miatt megtartjuk a régi leaderboard-forrást.
  if (matchStats.length === 0) {
    return getSeasonLeaderboardPlayerStats({ competition, weekly });
  }

  return matchStats;
}

/* =========================================================
   MULTIPLE COMPETITION PLAYER STATS
   ========================================================= */

export async function getSeasonAllCompetitionPlayerStats({
  competitions = [],
  weekly = false,
} = {}) {
  if (!Array.isArray(competitions) || competitions.length === 0) {
    return [];
  }

  const competitionStats = await Promise.all(
    competitions.map(async (competition) => ({
      competition,

      players: await getSeasonPlayerStats({
        competition,
        weekly,
      }),
    })),
  );

  const playersByUsername = new Map();

  for (const { competition, players } of competitionStats) {
    for (const player of players) {
      const key = player.username.toLowerCase();

      if (!playersByUsername.has(key)) {
        playersByUsername.set(key, {
          ...player,

          _competitionMatches: player.matchesPlayed,
        });

        continue;
      }

      const existing = playersByUsername.get(key);

      /*
       * Itt már valóban külön VPG seasonök
       * kerülnek összeadásra.
       *
       * Például:
       *
       * HPCL 14
       * +
       * Balkan 18
       *
       * Ez helyes.
       *
       * Balkan Summer League 18
       * +
       * Balkan Cup 18
       *
       * viszont már nem kerülhet ide kétszer,
       * mert a getVpgCompetitions() ALL módban
       * seasonId alapján deduplikál.
       */

      existing._competitionMatches += player.matchesPlayed;

      /*
       * Összesített statok.
       */
      existing.points += player.points;

      existing.matchRating += player.matchRating;

      existing.goals = (existing.goals ?? 0) + (player.goals ?? 0);

      existing.assists = (existing.assists ?? 0) + (player.assists ?? 0);

      existing.passesMade =
        (existing.passesMade ?? 0) + (player.passesMade ?? 0);

      existing.tacklesMade =
        (existing.tacklesMade ?? 0) + (player.tacklesMade ?? 0);

      existing.shots = (existing.shots ?? 0) + (player.shots ?? 0);

      existing.standingTackles =
        (existing.standingTackles ?? 0) + (player.standingTackles ?? 0);

      existing.slidingTackles =
        (existing.slidingTackles ?? 0) + (player.slidingTackles ?? 0);

      existing.saves = (existing.saves ?? 0) + (player.saves ?? 0);

      existing.cleanSheet =
        (existing.cleanSheet ?? 0) + (player.cleanSheet ?? 0);

      existing.yellowCard =
        (existing.yellowCard ?? 0) + (player.yellowCard ?? 0);

      existing.redCard = (existing.redCard ?? 0) + (player.redCard ?? 0);

      for (const [position, count] of Object.entries(player.positions ?? {})) {
        existing.positions = existing.positions ?? {};
        existing.positions[position] =
          (existing.positions[position] ?? 0) + Number(count ?? 0);
      }

      /*
       * Rate / százalékos statok:
       * csak az első nem-null értéket tartjuk meg.
       */
      if (existing.passAccuracy == null && player.passAccuracy != null) {
        existing.passAccuracy = player.passAccuracy;
      }

      if (existing.tackleSuccess == null && player.tackleSuccess != null) {
        existing.tackleSuccess = player.tackleSuccess;
      }

      if (existing.saveSuccess == null && player.saveSuccess != null) {
        existing.saveSuccess = player.saveSuccess;
      }

      if (existing.dribbleSuccess == null && player.dribbleSuccess != null) {
        existing.dribbleSuccess = player.dribbleSuccess;
      }
    }
  }

  return [...playersByUsername.values()]
    .map((player) => {
      player.matchesPlayed = player._competitionMatches;
      player.matchRating =
        Math.round((player.matchRating + Number.EPSILON) * 10) / 10;
      player.points = calculateVpgPoints(player);

      delete player._competitionMatches;

      return player;
    })
    .sort((a, b) => b.points - a.points);
}

/* =========================================================
   SCORERS
   ========================================================= */

export async function getSeasonTopScorers({
  competition,
  weekly = false,
} = {}) {
  const vpgSeasonId = getCompetitionVpgSeasonId(competition);

  if (!vpgSeasonId) {
    throw new Error("A competitionhöz nincs megadva VPG season ID.");
  }

  const players = await getAllVpgTeamLeaderboard(
    VPG_LEADERBOARD_TYPES.TOP_SCORER,
    {
      season: vpgSeasonId,
      weekly,
    },
  );

  return players
    .map(normalizeVpgPlayerStat)
    .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));
}

export async function getSeasonAllCompetitionTopScorers({
  competitions = [],
  weekly = false,
} = {}) {
  if (!Array.isArray(competitions) || competitions.length === 0) {
    return [];
  }

  const lists = await Promise.all(
    competitions.map((competition) =>
      getSeasonTopScorers({
        competition,
        weekly,
      }),
    ),
  );

  const playersByUsername = new Map();

  for (const players of lists) {
    for (const player of players) {
      const key = player.username.toLowerCase();

      if (!playersByUsername.has(key)) {
        playersByUsername.set(key, {
          ...player,
        });

        continue;
      }

      const existing = playersByUsername.get(key);

      existing.goals = (existing.goals ?? 0) + (player.goals ?? 0);

      existing.matchesPlayed =
        (existing.matchesPlayed ?? 0) + (player.matchesPlayed ?? 0);
    }
  }

  return [...playersByUsername.values()].sort(
    (a, b) => (b.goals ?? 0) - (a.goals ?? 0),
  );
}

/* =========================================================
   ASSISTS
   ========================================================= */

export async function getSeasonTopAssists({
  competition,
  weekly = false,
} = {}) {
  const vpgSeasonId = getCompetitionVpgSeasonId(competition);

  if (!vpgSeasonId) {
    throw new Error("A competitionhöz nincs megadva VPG season ID.");
  }

  const players = await getAllVpgTeamLeaderboard(
    VPG_LEADERBOARD_TYPES.TOP_ASSIST,
    {
      season: vpgSeasonId,
      weekly,
    },
  );

  return players
    .map(normalizeVpgPlayerStat)
    .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0));
}

export async function getSeasonAllCompetitionTopAssists({
  competitions = [],
  weekly = false,
} = {}) {
  if (!Array.isArray(competitions) || competitions.length === 0) {
    return [];
  }

  const lists = await Promise.all(
    competitions.map((competition) =>
      getSeasonTopAssists({
        competition,
        weekly,
      }),
    ),
  );

  const playersByUsername = new Map();

  for (const players of lists) {
    for (const player of players) {
      const key = player.username.toLowerCase();

      if (!playersByUsername.has(key)) {
        playersByUsername.set(key, {
          ...player,
        });

        continue;
      }

      const existing = playersByUsername.get(key);

      existing.assists = (existing.assists ?? 0) + (player.assists ?? 0);

      existing.matchesPlayed =
        (existing.matchesPlayed ?? 0) + (player.matchesPlayed ?? 0);
    }
  }

  return [...playersByUsername.values()].sort(
    (a, b) => (b.assists ?? 0) - (a.assists ?? 0),
  );
}

/* =========================================================
   COMPLETE SEASON STATISTICS
   ========================================================= */

export async function getSeasonStatistics({
  season,
  competitionId = "ALL",
  weekly = false,
} = {}) {
  if (!season) {
    throw new Error("Nincs megadva BOD szezon.");
  }

  const isAll = !competitionId || competitionId === "ALL";
  const competitions = getVpgCompetitions(season, competitionId);

  if (competitions.length === 0) {
    throw new Error(
      "A kiválasztott szezonhoz nincs VPG statisztikával rendelkező versenysorozat.",
    );
  }

  // ALL módban minden konfigurált sorozat meccseit feldolgozzuk. A kimeneti
  // competition-lista továbbra is VPG seasonId szerint deduplikált marad,
  // ahogy azt a felület eddig is várta.
  const statsCompetitions = isAll
    ? (season.competitions ?? []).filter(hasVpgPlayerStats)
    : competitions;

  const playerStats = isAll
    ? await getSeasonAllCompetitionPlayerStats({
        competitions: statsCompetitions,
        weekly,
      })
    : await getSeasonPlayerStats({
        competition: competitions[0],
        weekly,
      });

  /*
   * A góllista és az assistlista ugyanabból a meccsszinten összesített
   * játékoslistából készül, mint a benefithez használt pontszám.
   */
  const topScorers = [...playerStats].sort(
    (a, b) => (b.goals ?? 0) - (a.goals ?? 0),
  );
  const topAssists = [...playerStats].sort(
    (a, b) => (b.assists ?? 0) - (a.assists ?? 0),
  );

  return {
    seasonId: season.id ?? null,

    seasonName: season.name ?? null,

    competitionId: isAll ? "ALL" : competitions[0].id,

    competitionName: isAll ? "Összes" : (competitions[0].name ?? null),

    /*
     * Az ALL statisztikában már a VPG seasonök
     * reprezentálják a statisztikai egységeket.
     *
     * Ezért például:
     *
     * Balkan Summer League 18
     * Balkan Cup 18
     *
     * csak egyszer jelenik meg.
     */
    competitions: competitions.map((competition) => ({
      id: competition.id,

      name: competition.name,

      shortName: competition.shortName,

      vpgSeasonId: getCompetitionVpgSeasonId(competition),

      vpgLeagueSlug: getCompetitionVpgLeagueSlug(competition),
    })),

    playerStats,

    topScorers,

    topAssists,
  };
}
