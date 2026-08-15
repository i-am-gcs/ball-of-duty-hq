const VPG_API_BASE = "https://api.virtualprogaming.com/public";

const VPG_IMAGE_BASE =
  "https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEaQYaYw";

const BOD_TEAM_ID = 36206;
const BOD_TEAM_SLUG = "pannonia-fc";

/**
 * VPG logo ID -> használható kép URL
 */
function getVpgLogoUrl(logoId) {
  if (!logoId) {
    return null;
  }

  return `${VPG_IMAGE_BASE}/${logoId}/smThumb`;
}

async function fetchVpgMatches({
  status = "scheduled",
  limit = 100,
  offset = 0,
} = {}) {
  const params = new URLSearchParams({
    match_status: status,
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(
    `${VPG_API_BASE}/teams/${BOD_TEAM_SLUG}/matches?${params}`,
  );

  if (!response.ok) {
    throw new Error(`VPG API hiba: ${response.status}`);
  }

  const data = await response.json();

  return data;
}

/**
 * Következő VPG mérkőzések.
 *
 * Csak a ténylegesen BoD-hoz tartozó,
 * jövőbeli scheduled meccseket adjuk vissza.
 */
export async function getUpcomingVpgMatches() {
  const data = await fetchVpgMatches({
    status: "scheduled",
    limit: 100,
    offset: 0,
  });

  const now = Date.now();

  return (data.data || [])
    .filter((match) => {
      const isOurMatch =
        Number(match.home_id) === BOD_TEAM_ID ||
        Number(match.away_id) === BOD_TEAM_ID;

      const matchTime = Date.parse(match.datetime);

      return isOurMatch && Number.isFinite(matchTime) && matchTime >= now;
    })
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
}

/**
 * Egy VPG meccs normalizált formában.
 *
 * A UI-nak nem kell tudnia a teljes VPG API
 * struktúrát.
 */
export function normalizeVpgMatch(match) {
  const isHome = Number(match.home_id) === BOD_TEAM_ID;

  return {
    id: String(match.id),

    datetime: match.datetime,

    date: match.datetime ? match.datetime.split("T")[0] : null,

    homeTeam: match.home_name,
    awayTeam: match.away_name,

    opponent: isHome ? match.away_name : match.home_name,

    isHome,

    homeLogo: getVpgLogoUrl(match.home_logo),

    awayLogo: getVpgLogoUrl(match.away_logo),

    opponentLogo: getVpgLogoUrl(isHome ? match.away_logo : match.home_logo),

    competition: match.league_name || match.tournament_name || "VPG",

    competitionSlug: match.league_slug || match.tournament_slug || null,

    community: match.community_name || null,

    matchDay: match.match_day ?? null,

    season: match.season ?? null,

    status: match.status,

    homeId: match.home_id,

    awayId: match.away_id,

    homeSlug: match.home_slug,

    awaySlug: match.away_slug,
  };
}

/**
 * UI-ready következő VPG meccsek.
 */
export async function getUpcomingVpgMatchesNormalized() {
  const matches = await getUpcomingVpgMatches();

  return matches.map(normalizeVpgMatch);
}
