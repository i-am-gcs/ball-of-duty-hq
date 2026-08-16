const VPG_API_BASE = "https://api.virtualprogaming.com/public";

const VPG_IMAGE_BASE =
  "https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEAqYaYw";

const BOD_TEAM_SLUG = "pannonia-fc";
const BOD_TEAM_NAME = "Ball of Duty CF";

/**
 * VPG kép URL generálása.
 */
export function getVpgImageUrl(imageId) {
  if (!imageId) {
    return null;
  }

  return `${VPG_IMAGE_BASE}/${imageId}/smThumb`;
}

/**
 * VPG játékos avatar URL.
 */
export function getVpgPlayerAvatarUrl(avatarId) {
  return getVpgImageUrl(avatarId);
}

/**
 * VPG csapatlogó URL.
 */
export function getVpgTeamLogoUrl(logoId) {
  return getVpgImageUrl(logoId);
}

/**
 * VPG leaderboard kategóriák.
 *
 * A leaderboard value-kat csak akkor
 * egészítjük ki, amikor a Networkből
 * megerősítettük a pontos VPG paramétereket.
 */
export const VPG_LEADERBOARD_TYPES = {
  HIGHEST_RATED: "highest_rated",

  // Ezeket később a VPG Network alapján töltjük ki.
  TOP_GK: null,
  TOP_CB: null,
  TOP_FB: null,
  TOP_CDM: null,
  TOP_CAM: null,
  TOP_WINGERS: null,
  TOP_STRIKERS: null,
  TOP_SCORER: null,
  TOP_ASSIST: null,
};

/**
 * VPG team leaderboard lekérése.
 *
 * Példa:
 *
 * /teams/pannonia-fc/leaderboard/
 * ?leaderboard=highest_rated
 * &weekly=false
 * &limit=10
 * &offset=0
 */
export async function getVpgTeamLeaderboard(
  leaderboard,
  { weekly = false, limit = 10, offset = 0 } = {},
) {
  if (!leaderboard) {
    throw new Error("Nincs megadva VPG leaderboard típus.");
  }

  const params = new URLSearchParams();

  params.set("leaderboard", leaderboard);
  params.set("weekly", String(weekly));
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

  console.log("VPG LEADERBOARD RESPONSE:", data);

  if (!data || !Array.isArray(data.data)) {
    console.error("VPG leaderboard API ismeretlen válasz:", data);

    throw new Error(
      "A VPG leaderboard API nem megfelelő formátumú adatot adott vissza.",
    );
  }

  return data;
}

/**
 * VPG leaderboard játékos normalizálása.
 *
 * Az alkalmazás többi része ezt az egységes
 * struktúrát használhatja.
 */
export function normalizeVpgPlayerStat(player) {
  return {
    username: player.username || "-",

    avatar: getVpgPlayerAvatarUrl(player.user_avatar),

    nationality: player.user_nationality || "",

    teamName: player.team_name || BOD_TEAM_NAME,

    teamSlug: player.team_slug || BOD_TEAM_SLUG,

    teamLogo: getVpgTeamLogoUrl(player.team_logo),

    points: Number(player.points ?? 0),

    matchRating: Number(player.match_rating ?? 0),

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

/**
 * Normalizált BOD leaderboard lekérése.
 */
export async function getVpgPlayerLeaderboard(leaderboard, options = {}) {
  const data = await getVpgTeamLeaderboard(leaderboard, options);

  return data.data.map(normalizeVpgPlayerStat);
}

/**
 * Legmagasabb értékelésű BOD játékosok.
 *
 * Ezt elsősorban teszteléshez használjuk,
 * mert a végleges Statistics UI-ban
 * nem tervezzük megjeleníteni.
 */
export async function getVpgHighestRatedPlayers(options = {}) {
  return getVpgPlayerLeaderboard(VPG_LEADERBOARD_TYPES.HIGHEST_RATED, options);
}

/**
 * Heti leaderboard lekérése.
 */
export async function getVpgWeeklyLeaderboard(leaderboard, options = {}) {
  return getVpgPlayerLeaderboard(leaderboard, {
    ...options,
    weekly: true,
  });
}

/**
 * Összesített leaderboard lekérése.
 */
export async function getVpgAllTimeLeaderboard(leaderboard, options = {}) {
  return getVpgPlayerLeaderboard(leaderboard, {
    ...options,
    weekly: false,
  });
}
