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

  const division = competition.division
    ? ` · ${competition.division}`
    : "";

  const placement = competition.placement
    ? `${competition.placement}. hely`
    : "Még nincs eredmény";

  return {
    label: `${competition.shortName}${division}`,
    result: placement,
  };
}

function SeasonCard({ season }) {
  const seasonWinner = season.awards?.seasonPlayerPodium?.find(
    (player) => player.placement === 1
  );

  return (
    <article
      className={`season-card panel season-card--${season.status}`}
    >
      <div className="season-card__header">
        <span className={getStatusClass(season.status)}>
          {statusLabels[season.status] ?? season.status}
        </span>

        <h3>{season.name}</h3>

        <p className="season-card__period">
          {formatPeriod(season.period)}
        </p>
      </div>

      <div className="season-card__competitions">
        {season.competitions.map((competition) => {
          const competitionText = getCompetitionText(competition);

          return (
            <div
              className="season-card__competition"
              key={competition.id}
            >
              <div>
                <span className="season-card__competition-label">
                  {competition.type === "cup" ? "🏆" : "⚽"}
                  {competitionText.label}
                </span>

                <strong>
                  {competitionText.result}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="season-card__footer">
        <div>
          <span className="season-card__footer-label">
            Szezon játékosa
          </span>

          <strong>
            {seasonWinner
              ? `🥇 ${seasonWinner.nickname}`
              : "Még nincs kiosztva"}
          </strong>
        </div>

        <button className="season-card__button" type="button">
          Részletek →
        </button>
      </footer>
    </article>
  );
}

export default SeasonCard;