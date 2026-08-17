import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getBodLeagueStats } from "../../services/vpgLeagueService";

const statusLabels = {
  completed: "Lezárt",
  active: "Aktív",
  upcoming: "Közelgő",
};

function formatPeriod(period) {
  if (!period) {
    return "Nincs megadott időszak";
  }

  if (!period.end) {
    return `${period.start} –`;
  }

  return `${period.start} – ${period.end}`;
}

function getStatusClass(status) {
  if (status === "active") {
    return "status-pill status-pill--success";
  }

  if (status === "upcoming") {
    return "status-pill status-pill--upcoming";
  }

  return "status-pill";
}

function getCompetitionText(competition) {
  if (competition.type === "cup") {
    return {
      label: competition.shortName,
      result: competition.stage,
    };
  }

  const division = competition.division ? ` · ${competition.division}` : "";

  const placement = competition.placement
    ? `${competition.placement}. hely`
    : "Még nincs eredmény";

  return {
    label: `${competition.shortName}${division}`,
    result: placement,
  };
}

/*
 * =====================================================
 * STATISZTIKÁK
 * =====================================================
 *
 * Elsődleges forrás:
 * competition.stats
 *
 * Ha nincs manuálisan tárolt stat,
 * de van VPG seasonId, akkor a VPG tabellából
 * töltjük be a BOD aktuális statisztikáit.
 *
 * FONTOS:
 * - csak league competition számít
 * - cup competition nem számít bele
 * - ugyanaz a VPG seasonId csak egyszer kerül lekérésre
 */

function getStoredCompetitionStats(competition) {
  if (!competition?.stats) {
    return null;
  }

  return {
    played: Number(competition.stats.played || 0),
    wins: Number(competition.stats.wins || 0),
    draws: Number(competition.stats.draws || 0),
    losses: Number(competition.stats.losses || 0),
  };
}

function getEmptyStats() {
  return {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  };
}

function getSeasonStatsFromStoredData(season) {
  const competitions = season.competitions || [];

  return competitions.reduce((total, competition) => {
    /*
     * A kupák nem számítanak bele
     * a szezon formájába.
     */
    if (competition.type !== "league") {
      return total;
    }

    const stats = getStoredCompetitionStats(competition);

    if (!stats) {
      return total;
    }

    return {
      played: total.played + stats.played,
      wins: total.wins + stats.wins,
      draws: total.draws + stats.draws,
      losses: total.losses + stats.losses,
    };
  }, getEmptyStats());
}

/*
 * Egy VPG standings sorból egységes stat objektum.
 */
function getStatsFromVpgStanding(standing) {
  if (!standing) {
    return null;
  }

  return {
    played: Number(standing.played || 0),
    wins: Number(standing.wins || 0),
    draws: Number(standing.draws || 0),
    losses: Number(standing.losses || 0),
  };
}

/*
 * Megkeressük a BOD sort a VPG tabellában.
 *
 * Elsődlegesen team slug alapján próbáljuk,
 * másodsorban név alapján.
 */
function findBodStanding(standings) {
  if (!Array.isArray(standings)) {
    return null;
  }

  return (
    standings.find(
      (standing) => String(standing.slug || "").toLowerCase() === "pannonia-fc",
    ) ||
    standings.find(
      (standing) =>
        String(standing.teamName || "")
          .trim()
          .toLowerCase() === "ball of duty cf",
    ) ||
    null
  );
}

/*
 * A teljes szezon statisztikáját összeállítjuk.
 *
 * Egy competition:
 *
 * stats van
 *    -> Firebase-ben tárolt adat
 *
 * stats nincs + VPG seasonId van
 *    -> VPG adat
 *
 * stats nincs + nincs VPG
 *    -> 0
 */
async function loadSeasonStats(season) {
  const competitions = season.competitions || [];

  const leagueCompetitions = competitions.filter(
    (competition) => competition.type === "league",
  );

  if (leagueCompetitions.length === 0) {
    return getEmptyStats();
  }

  const total = getEmptyStats();

  /*
   * Ugyanazt a VPG seasonId-t csak egyszer kérjük le.
   *
   * Ez azért fontos, mert például:
   *
   * Balkan Summer League
   * Balkan Cup
   *
   * ugyanahhoz a VPG szezonhoz kapcsolódhat.
   *
   * A kupát eleve kiszűrtük, így nem lesz dupla stat.
   */
  const loadedVpgSeasons = new Set();

  for (const competition of leagueCompetitions) {
    /*
     * Ha van mentett stat, azt használjuk.
     */
    const storedStats = getStoredCompetitionStats(competition);

    if (storedStats) {
      total.played += storedStats.played;
      total.wins += storedStats.wins;
      total.draws += storedStats.draws;
      total.losses += storedStats.losses;

      continue;
    }

    /*
     * Ha nincs stat, csak akkor megyünk VPG-re,
     * ha van VPG seasonId.
     */
    const vpgSeasonId = competition.vpg?.seasonId;

    if (!vpgSeasonId) {
      continue;
    }

    const normalizedSeasonId = String(vpgSeasonId);

    /*
     * Ugyanazt a VPG szezont ne kérjük le kétszer.
     */
    if (loadedVpgSeasons.has(normalizedSeasonId)) {
      continue;
    }

    loadedVpgSeasons.add(normalizedSeasonId);

    try {
      const vpgCompetition = {
        ...competition,

        vpgLeagueSlug: competition.vpg?.leagueSlug || "",
        vpgSeasonId: competition.vpg?.seasonId || null,

        /*
         * Ugyanaz a beállítás, amit a SeasonDetails
         * is használ.
         */
        vpgIsHistory: false,
      };

      const standings = await getBodLeagueStats(vpgCompetition);

      const bodStanding = findBodStanding(standings);

      const vpgStats = getStatsFromVpgStanding(bodStanding);

      if (!vpgStats) {
        console.warn(
          "BOD nem található a VPG tabellában:",
          vpgSeasonId,
          competition.name,
        );

        continue;
      }

      total.played += vpgStats.played;
      total.wins += vpgStats.wins;
      total.draws += vpgStats.draws;
      total.losses += vpgStats.losses;
    } catch (error) {
      /*
       * Egy VPG hiba ne tegye használhatatlanná
       * az egész szezonoldalt.
       */
      console.error(
        "VPG szezon statisztika betöltési hiba:",
        competition.name,
        error,
      );
    }
  }

  return total;
}

function SeasonCard({ season, onEdit, onDelete, deleting }) {
  const [seasonStats, setSeasonStats] = useState(() =>
    getSeasonStatsFromStoredData(season),
  );

  const [statsLoading, setStatsLoading] = useState(false);

  const seasonWinner = season.awards?.seasonPlayerPodium?.find(
    (player) => player.placement === 1,
  );

  const isCompleted = season.status === "completed";

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      /*
       * Lezárt szezonoknál továbbra is a mentett adatokat
       * használjuk.
       */
      if (isCompleted) {
        setSeasonStats(getSeasonStatsFromStoredData(season));
        return;
      }

      /*
       * Először megmutatjuk, ami már lokálisan elérhető.
       */
      setSeasonStats(getSeasonStatsFromStoredData(season));

      /*
       * Megnézzük, van-e olyan liga competition,
       * amelyhez VPG seasonId tartozik,
       * de nincs kézzel mentett stats.
       */
      const needsVpg = (season.competitions || []).some(
        (competition) =>
          competition.type === "league" &&
          !competition.stats &&
          competition.vpg?.seasonId,
      );

      if (!needsVpg) {
        return;
      }

      try {
        setStatsLoading(true);

        const stats = await loadSeasonStats(season);

        if (mounted) {
          setSeasonStats(stats);
        }
      } catch (error) {
        console.error("Szezon VPG statisztika betöltési hiba:", error);
      } finally {
        if (mounted) {
          setStatsLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      mounted = false;
    };
  }, [season, isCompleted]);

  return (
    <article className={`season-card panel season-card--${season.status}`}>
      {/* =========================================
          HEADER
          ========================================= */}

      <div className="season-card__header">
        <span className={getStatusClass(season.status)}>
          {statusLabels[season.status] ?? season.status}
        </span>

        <h3>{season.name}</h3>

        <p className="season-card__period">{formatPeriod(season.period)}</p>
      </div>

      {/* =========================================
          COMPETITIONS
          ========================================= */}

      <div className="season-card__competitions">
        {season.competitions?.map((competition) => {
          const competitionText = getCompetitionText(competition);

          return (
            <div className="season-card__competition" key={competition.id}>
              <div>
                <span className="season-card__competition-label">
                  {competition.type === "cup" ? "🏆" : "⚽"}

                  {competitionText.label}
                </span>

                {isCompleted ? (
                  <strong>{competitionText.result}</strong>
                ) : (
                  <strong>
                    {competition.division || "Induló versenysorozat"}
                  </strong>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================
          CURRENT SEASON STATS
          ========================================= */}

      {!isCompleted && (
        <div className="season-card__stats">
          <span className="season-card__stats-title">Szezon formája</span>

          <div className="season-card__stats-grid">
            <div>
              <strong className="season-stat--win">
                {statsLoading ? "…" : seasonStats.wins}
              </strong>

              <span>GYŐZELEM</span>
            </div>

            <div>
              <strong>{statsLoading ? "…" : seasonStats.draws}</strong>

              <span>DÖNTETLEN</span>
            </div>

            <div>
              <strong className="season-stat--loss">
                {statsLoading ? "…" : seasonStats.losses}
              </strong>

              <span>VERESÉG</span>
            </div>

            <div>
              <strong>{statsLoading ? "…" : seasonStats.played}</strong>

              <span>ÖSSZES</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          FOOTER
          ========================================= */}

      <footer className="season-card__footer">
        {isCompleted ? (
          <div>
            <span className="season-card__footer-label">Szezon játékosa</span>

            <strong>
              {seasonWinner
                ? `🥇 ${seasonWinner.nickname}`
                : "Még nincs kiosztva"}
            </strong>
          </div>
        ) : (
          <div>
            <span className="season-card__footer-label">Aktuális szezon</span>

            <strong>
              {season.status === "active" ? "Folyamatban" : "Hamarosan indul"}
            </strong>
          </div>
        )}

        <Link className="season-card__button" to={`/seasons/${season.id}`}>
          Részletek →
        </Link>
      </footer>

      {/* =========================================
          ADMIN ACTIONS
          ========================================= */}

      {onEdit && onDelete && (
        <div className="season-card__actions">
          <button
            className="button button--secondary"
            type="button"
            onClick={() => onEdit(season)}
          >
            Szerkesztés
          </button>

          <button
            className="button season-card__delete"
            type="button"
            disabled={deleting}
            onClick={() => onDelete(season)}
          >
            {deleting ? "Törlés..." : "Törlés"}
          </button>
        </div>
      )}
    </article>
  );
}

export default SeasonCard;
