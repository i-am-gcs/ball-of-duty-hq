const VPG_API_BASE = "https://api.virtualprogaming.com/public";

const VPG_IMAGE_BASE =
  "https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEaQYaYw";

const BOD_TEAM_SLUG = "pannonia-fc";
const BOD_TEAM_NAME = "Ball of Duty CF";

/**
 * A fő statisztikához használt VPG leaderboardok.
 *
 * highest_rated NEM kell.
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

export function getVpgCompetitions(season, competitionId = "ALL") {
  if (!season) {
    return [];
  }

  const competitions = (season.competitions || []).filter((competition) =>
    hasVpgPlayerStats(competition),
  );

  if (!competitionId || competitionId === "ALL") {
    return competitions;
  }

  return competitions.filter(
    (competition) => String(competition.id) === String(competitionId),
  );
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
     * FONTOS:
     * Ez a VPG által adott rating.
     *
     * Ha egy játékos több pozíciós
     * leaderboardon szerepel, az
     * össze lesz adva.
     */
    matchRating: Number(player.match_rating ?? 0),

    /*
     * A meccsszámot később MAX alapján
     * kezeljük, mert ugyanaz a játékos
     * több pozícióban is szerepelhet.
     */
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

    possessionWon:
      player.possession_won != null ? Number(player.possession_won) : null,

    interceptions:
      player.interceptions != null ? Number(player.interceptions) : null,

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

function mergePlayerStats(existing, incoming) {
  /*
   * Összegző statok.
   */
  existing.points += incoming.points;

  existing.matchRating += incoming.matchRating;

  existing.goals = (existing.goals ?? 0) + (incoming.goals ?? 0);

  existing.assists = (existing.assists ?? 0) + (incoming.assists ?? 0);

  existing.passesMade = (existing.passesMade ?? 0) + (incoming.passesMade ?? 0);

  existing.tacklesMade =
    (existing.tacklesMade ?? 0) + (incoming.tacklesMade ?? 0);

  existing.shots = (existing.shots ?? 0) + (incoming.shots ?? 0);

  existing.possessionWon =
    (existing.possessionWon ?? 0) + (incoming.possessionWon ?? 0);

  existing.interceptions =
    (existing.interceptions ?? 0) + (incoming.interceptions ?? 0);

  existing.standingTackles =
    (existing.standingTackles ?? 0) + (incoming.standingTackles ?? 0);

  existing.slidingTackles =
    (existing.slidingTackles ?? 0) + (incoming.slidingTackles ?? 0);

  existing.saves = (existing.saves ?? 0) + (incoming.saves ?? 0);

  existing.cleanSheet = (existing.cleanSheet ?? 0) + (incoming.cleanSheet ?? 0);

  existing.yellowCard = (existing.yellowCard ?? 0) + (incoming.yellowCard ?? 0);

  existing.redCard = (existing.redCard ?? 0) + (incoming.redCard ?? 0);

  /*
   * MECCSSZÁMOT NEM ADJUK ÖSSZE.
   *
   * Ugyanaz a játékos szerepelhet
   * CB + CDM + CAM stb. leaderboardon.
   *
   * A VPG ugyanazt a meccsszámot
   * adhatja vissza több helyen.
   */
  existing.matchesPlayed = Math.max(
    existing.matchesPlayed,
    incoming.matchesPlayed,
  );

  /*
   * A százalékos / rate statoknál
   * megtartjuk az első tényleges
   * értéket.
   *
   * Ezeket nem adjuk össze.
   */
  if (existing.passAccuracy == null && incoming.passAccuracy != null) {
    existing.passAccuracy = incoming.passAccuracy;
  }

  if (existing.tackleSuccess == null && incoming.tackleSuccess != null) {
    existing.tackleSuccess = incoming.tackleSuccess;
  }

  if (existing.saveSuccess == null && incoming.saveSuccess != null) {
    existing.saveSuccess = incoming.saveSuccess;
  }

  if (existing.dribbleSuccess == null && incoming.dribbleSuccess != null) {
    existing.dribbleSuccess = incoming.dribbleSuccess;
  }
}

/* =========================================================
   POSITION LEADERBOARD MERGE
   ========================================================= */

export function mergePositionLeaderboards(leaderboards) {
  const playersByUsername = new Map();

  for (const leaderboard of leaderboards) {
    for (const rawPlayer of leaderboard.players) {
      const player = normalizeVpgPlayerStat(rawPlayer);

      const key = player.username.toLowerCase();

      if (!playersByUsername.has(key)) {
        playersByUsername.set(key, {
          ...player,
        });

        continue;
      }

      const existing = playersByUsername.get(key);

      mergePlayerStats(existing, player);
    }
  }

  return [...playersByUsername.values()].sort((a, b) => b.points - a.points);
}

/* =========================================================
   SINGLE COMPETITION PLAYER STATS
   ========================================================= */

export async function getSeasonPlayerStats({
  competition,
  weekly = false,
} = {}) {
  const vpgSeasonId = getCompetitionVpgSeasonId(competition);

  if (!vpgSeasonId) {
    throw new Error("A competitionhöz nincs megadva VPG season ID.");
  }

  const leaderboards = await Promise.all(
    VPG_POSITION_LEADERBOARDS.map(async (leaderboard) => {
      const players = await getAllVpgTeamLeaderboard(leaderboard, {
        season: vpgSeasonId,
        weekly,
      });

      return {
        leaderboard,
        players,
      };
    }),
  );

  return mergePositionLeaderboards(leaderboards);
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
       * Minden competition külön
       * VPG szezon / versenysorozat,
       * ezért itt már összeadjuk
       * a meccseket.
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

      existing.possessionWon =
        (existing.possessionWon ?? 0) + (player.possessionWon ?? 0);

      existing.interceptions =
        (existing.interceptions ?? 0) + (player.interceptions ?? 0);

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

      /*
       * Rate / százalékos statok:
       * csak az első nem-null értéket
       * tartjuk meg.
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

  const competitions = getVpgCompetitions(season, competitionId);

  if (competitions.length === 0) {
    throw new Error(
      "A kiválasztott szezonhoz nincs VPG statisztikával rendelkező versenysorozat.",
    );
  }

  const isAll = !competitionId || competitionId === "ALL";

  const playerStats = isAll
    ? await getSeasonAllCompetitionPlayerStats({
        competitions,
        weekly,
      })
    : await getSeasonPlayerStats({
        competition: competitions[0],
        weekly,
      });

  const topScorers = isAll
    ? await getSeasonAllCompetitionTopScorers({
        competitions,
        weekly,
      })
    : await getSeasonTopScorers({
        competition: competitions[0],
        weekly,
      });

  const topAssists = isAll
    ? await getSeasonAllCompetitionTopAssists({
        competitions,
        weekly,
      })
    : await getSeasonTopAssists({
        competition: competitions[0],
        weekly,
      });

  return {
    seasonId: season.id ?? null,

    seasonName: season.name ?? null,

    competitionId: isAll ? "ALL" : competitions[0].id,

    competitionName: isAll ? "Összes" : (competitions[0].name ?? null),

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
