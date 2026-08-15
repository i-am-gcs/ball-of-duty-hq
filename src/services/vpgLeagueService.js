const VPG_API_BASE = "https://api.virtualprogaming.com/public";

const VPG_IMAGE_BASE =
  "https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEaQYaYw";

/**
 * VPG csapatlogó URL generálása.
 */
export function getVpgLogoUrl(logoId) {
  if (!logoId) {
    return null;
  }

  return `${VPG_IMAGE_BASE}/${logoId}/smThumb`;
}

/**
 * VPG liga alapadatainak lekérése.
 */
export async function getVpgLeague(leagueSlug) {
  if (!leagueSlug) {
    throw new Error("Nincs megadva VPG league slug.");
  }

  const response = await fetch(`${VPG_API_BASE}/leagues/${leagueSlug}/`);

  if (!response.ok) {
    throw new Error(`VPG liga API hiba: ${response.status}`);
  }

  return response.json();
}

/**
 * VPG liga tabellájának lekérése.
 *
 * Példa:
 *
 * /leagues/Balkan-Championship%20B/table/?season=18&is_history=false
 */
export async function getVpgLeagueStandings(
  leagueSlug,
  vpgSeasonId,
  isHistory = false,
) {
  if (!leagueSlug) {
    throw new Error("Nincs megadva VPG league slug.");
  }

  if (!vpgSeasonId) {
    throw new Error("Nincs megadva VPG season ID.");
  }

  const url =
    `${VPG_API_BASE}/leagues/${leagueSlug}/table/` +
    `?season=${vpgSeasonId}` +
    `&is_history=${isHistory}`;

  console.log("VPG STANDINGS REQUEST:", url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`VPG tabella API hiba: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    console.error("VPG tabella API nem tömböt adott vissza:", data);

    throw new Error(
      "A VPG tabella API nem megfelelő formátumú adatot adott vissza.",
    );
  }

  return data;
}

/**
 * Egy VPG tabellabejegyzés normalizálása.
 */
export function normalizeVpgStanding(team, index) {
  return {
    position: index + 1,

    teamName: team.team_name || team.name || "-",

    abbreviation: team.team_abbr || team.abbr || "",

    slug: team.team_slug || team.slug || null,

    logo: getVpgLogoUrl(team.team_logo || team.logo),

    played: Number(team.played ?? 0),

    wins: Number(team.wins ?? 0),

    draws: Number(team.draws ?? 0),

    losses: Number(team.losses ?? 0),

    goalsFor: Number(team.score_for ?? 0),

    goalsAgainst: Number(team.score_against ?? 0),

    points: Number(team.points ?? 0),

    titles: Number(team.titles ?? 0),
  };
}

/**
 * VPG tabella lekérése és normalizálása.
 */
export async function getVpgLeagueStandingsNormalized(
  leagueSlug,
  vpgSeasonId,
  isHistory = false,
) {
  const standings = await getVpgLeagueStandings(
    leagueSlug,
    vpgSeasonId,
    isHistory,
  );

  return standings.map(normalizeVpgStanding);
}

/**
 * Ball of Duty liga statisztika + tabella.
 *
 * A SeasonDetails ezt használja.
 */
export async function getBodLeagueStats(competition) {
  if (!competition) {
    throw new Error("Nincs megadva VPG versenysorozat.");
  }

  const leagueSlug = competition.vpgLeagueSlug;

  const vpgSeasonId = competition.vpgSeasonId;

  if (!leagueSlug) {
    throw new Error("A versenysorozathoz nincs megadva vpgLeagueSlug.");
  }

  if (!vpgSeasonId) {
    throw new Error("A versenysorozathoz nincs megadva vpgSeasonId.");
  }

  return getVpgLeagueStandingsNormalized(leagueSlug, vpgSeasonId, false);
}
