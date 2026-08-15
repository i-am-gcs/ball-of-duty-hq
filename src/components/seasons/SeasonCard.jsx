import { Link } from "react-router-dom";

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

function getSeasonStats(season) {
  const competitions = season.competitions || [];

  return competitions.reduce(
    (total, competition) => {
      if (!competition.stats) {
        return total;
      }

      return {
        played: total.played + (competition.stats.played || 0),

        wins: total.wins + (competition.stats.wins || 0),

        draws: total.draws + (competition.stats.draws || 0),

        losses: total.losses + (competition.stats.losses || 0),
      };
    },
    {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    },
  );
}

function SeasonCard({ season, onEdit, onDelete, deleting }) {
  const seasonWinner = season.awards?.seasonPlayerPodium?.find(
    (player) => player.placement === 1,
  );

  const seasonStats = getSeasonStats(season);

  const isCompleted = season.status === "completed";

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

                {/* Lezárt szezon:
                      helyezés / kupaszereplés */}
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
              <strong className="season-stat--win">{seasonStats.wins}</strong>

              <span>GYŐZELEM</span>
            </div>

            <div>
              <strong>{seasonStats.draws}</strong>

              <span>DÖNTETLEN</span>
            </div>

            <div>
              <strong className="season-stat--loss">
                {seasonStats.losses}
              </strong>

              <span>VERESÉG</span>
            </div>

            <div>
              <strong>{seasonStats.played}</strong>

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
