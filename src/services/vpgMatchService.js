const VPG_API_BASE = "https://api.virtualprogaming.com/public";

const VPG_IMAGE_BASE =
  "https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEaQYaYw";

const BOD_TEAM_SLUG = "pannonia-fc";
const BOD_TEAM_ID = 36206;
const BOD_TEAM_NAME = "Ball of Duty CF";

/**
 * VPG csapatlogó URL.
 */
export function getVpgLogoUrl(logoId) {
  if (!logoId) {
    return null;
  }

  return `${VPG_IMAGE_BASE}/${logoId}/smThumb`;
}

/**
 * Csapatnév normalizálása.
 *
 * A VPG API néha láthatatlan karaktereket is
 * visszaadhat a csapatnevekben.
 */
function normalizeTeamName(name) {
  return String(name || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Ellenőrizzük, hogy a mérkőzésben szerepel-e
 * a Ball of Duty CF.
 *
 * A team endpoint használata miatt ez elsősorban
 * biztonsági ellenőrzés.
 */
function isBodTeam(teamId, teamName) {
  if (teamId != null && Number(teamId) === BOD_TEAM_ID) {
    return true;
  }

  return normalizeTeamName(teamName) === normalizeTeamName(BOD_TEAM_NAME);
}

/**
 * BOD csapat összes VPG mérkőzésének lekérése.
 *
 * match_status:
 * - scheduled
 * - complete
 *
 * Fontos:
 * A team endpoint közvetlenül a BOD mérkőzéseit adja.
 *
 * Ezért nem kell:
 * - liga endpointból lekérni az összes meccset
 * - majd BOD-ra szűrni.
 */
export async function getVpgTeamMatches(matchStatus = "scheduled") {
  const params = new URLSearchParams();

  params.set("match_status", matchStatus);
  params.set("limit", "128");
  params.set("offset", "0");

  const url =
    `${VPG_API_BASE}/teams/${BOD_TEAM_SLUG}/matches/?` + params.toString();

  console.log("VPG TEAM MATCHES REQUEST:", url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`VPG csapat meccsek API hiba: ${response.status}`);
  }

  const data = await response.json();

  console.log("VPG TEAM MATCHES RESPONSE:", data);

  if (!data || !Array.isArray(data.data)) {
    console.error("VPG csapat meccsek API ismeretlen válasz:", data);

    throw new Error(
      "A VPG csapat meccsek API nem megfelelő formátumú adatot adott vissza.",
    );
  }

  return data.data;
}

/**
 * Mérkőzések szűrése VPG season ID alapján.
 *
 * A team endpoint több szezon mérkőzéseit is
 * visszaadhatja.
 *
 * Ezért az alkalmazás mindig az adott
 * seasonId alapján szűr.
 */
export function filterMatchesBySeason(matches, seasonId) {
  if (!seasonId) {
    return [];
  }

  const filteredMatches = matches.filter(
    (match) => Number(match.season) === Number(seasonId),
  );

  console.log(
    "VPG SEASON FILTER:",
    seasonId,
    "TOTAL MATCHES:",
    filteredMatches.length,
  );

  return filteredMatches;
}

/**
 * Scheduled BOD mérkőzések lekérése.
 *
 * Csak az adott szezon mérkőzéseit adja vissza.
 */
export async function getVpgSeasonMatches(seasonId) {
  if (!seasonId) {
    throw new Error("Nincs megadva VPG season ID.");
  }

  const matches = await getVpgTeamMatches("scheduled");

  const seasonMatches = filterMatchesBySeason(matches, seasonId);

  console.log("VPG BOD SCHEDULED MATCHES:", seasonMatches);

  return seasonMatches;
}

/**
 * Complete BOD mérkőzések lekérése.
 *
 * Csak az adott szezon mérkőzéseit adja vissza.
 */
export async function getVpgCompletedMatches(seasonId) {
  if (!seasonId) {
    throw new Error("Nincs megadva VPG season ID.");
  }

  const matches = await getVpgTeamMatches("complete");

  const seasonMatches = filterMatchesBySeason(matches, seasonId);

  console.log("VPG BOD COMPLETED MATCHES:", seasonMatches);

  return seasonMatches
    .map(normalizeVpgMatch)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
}

/**
 * VPG mérkőzés normalizálása.
 *
 * Az alkalmazás többi része ezt az egységes
 * struktúrát használja.
 */
export function normalizeVpgMatch(match) {
  const isHome = isBodTeam(match.home_id, match.home_name);

  const isAway = isBodTeam(match.away_id, match.away_name);

  let opponentName = "-";
  let opponentLogo = null;

  if (isHome) {
    opponentName = match.away_name || "-";
    opponentLogo = getVpgLogoUrl(match.away_logo);
  }

  if (isAway) {
    opponentName = match.home_name || "-";
    opponentLogo = getVpgLogoUrl(match.home_logo);
  }

  const homeScore = Number(match.home_score ?? 0);
  const awayScore = Number(match.away_score ?? 0);

  let result = null;

  if (match.status === "complete") {
    if (isHome) {
      if (homeScore > awayScore) {
        result = "win";
      } else if (homeScore < awayScore) {
        result = "loss";
      } else {
        result = "draw";
      }
    }

    if (isAway) {
      if (awayScore > homeScore) {
        result = "win";
      } else if (awayScore < homeScore) {
        result = "loss";
      } else {
        result = "draw";
      }
    }
  }

  return {
    id: match.id,

    seasonId: Number(match.season ?? 0),

    datetime: match.datetime,

    status: match.status,

    matchDay: Number(match.match_day ?? 0),

    isHome,

    isAway,

    opponentName,

    opponentLogo,

    homeName: match.home_name || "-",

    awayName: match.away_name || "-",

    homeLogo: getVpgLogoUrl(match.home_logo),

    awayLogo: getVpgLogoUrl(match.away_logo),

    homeScore,

    awayScore,

    result,

    homeId: Number(match.home_id ?? 0),

    awayId: Number(match.away_id ?? 0),

    homeSlug: match.home_slug || "",

    awaySlug: match.away_slug || "",

    leagueId: Number(match.league_id ?? 0),

    leagueName: match.league_name || "",

    leagueSlug: match.league_slug || "",

    leagueLogo: getVpgLogoUrl(match.league_logo),

    communityName: match.community_name || "",

    communitySlug: match.community_slug || "",

    communityLogo: getVpgLogoUrl(match.community_logo),

    tournamentName: match.tournament_name || "",

    tournamentSlug: match.tournament_slug || "",

    tournamentLogo: getVpgLogoUrl(match.tournament_logo),
  };
}

/**
 * BOD scheduled mérkőzéseinek lekérése
 * és normalizálása.
 */
export async function getVpgSeasonMatchesNormalized(seasonId) {
  const matches = await getVpgSeasonMatches(seasonId);

  return matches
    .map(normalizeVpgMatch)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
}

/**
 * Következő BOD mérkőzés.
 */
export async function getNextVpgMatch(seasonId) {
  const matches = await getVpgSeasonMatchesNormalized(seasonId);

  return (
    matches.find((match) => new Date(match.datetime) >= new Date()) || null
  );
}

/**
 * Következő N BOD mérkőzés.
 */
export async function getUpcomingVpgMatches(seasonId, limit = 5) {
  const matches = await getVpgSeasonMatchesNormalized(seasonId);

  return matches
    .filter((match) => new Date(match.datetime) >= new Date())
    .slice(0, limit);
}

/**
 * Legutóbbi N BOD eredmény.
 */
export async function getRecentVpgResults(seasonId, limit = 5) {
  const matches = await getVpgCompletedMatches(seasonId);

  return matches.slice(0, limit);
}
