import { Link, useParams } from "react-router-dom";
import { seasons } from "../data/seasons";
import SeasonStatistics from "../components/seasons/SeasonStatistics";

function SeasonDetails() {
  const { seasonId } = useParams();

  const selectedSeason = seasons.find(
    (season) => String(season.id) === seasonId,
  );

  if (!selectedSeason) {
    return (
      <div className="page-stack">
        <section className="panel season-details__not-found">
          <p className="eyebrow">Season archive</p>

          <h2>A szezon nem található</h2>

          <Link to="/seasons" className="button button--secondary">
            Vissza a szezonokhoz
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Link to="/seasons" className="season-details__back">
        ← Vissza a szezonokhoz
      </Link>

      <header className="panel season-details__hero">
        <div>
          <div className="season-details__hero-top">
            <span
              className={`status-pill ${
                selectedSeason.status === "active"
                  ? "status-pill--success"
                  : ""
              }`}
            >
              {selectedSeason.status === "active"
                ? "Aktív szezon"
                : selectedSeason.status === "upcoming"
                  ? "Közelgő szezon"
                  : "Lezárt szezon"}
            </span>

            <span className="season-details__number">
              Season {selectedSeason.id}
            </span>
          </div>

          <p className="eyebrow">Ball of Duty</p>

          <h2>{selectedSeason.title}</h2>

          <p className="season-details__period">
            {selectedSeason.startDate} – {selectedSeason.endDate}
          </p>
        </div>
      </header>

      <SeasonStatistics
        competitions={selectedSeason.competitions ?? []}
      />

      <section>
        <div className="season-details__section-heading">
          <div>
            <p className="eyebrow">Competitions</p>
            <h3>Versenyek</h3>
          </div>
        </div>

        <div className="season-details__competition-grid">
          {selectedSeason.competitions?.map((competition) => (
            <article
              className="panel season-details__competition-card"
              key={competition.id ?? competition.name}
            >
              <div className="season-details__competition-header">
                <div>
                  <span>{competition.type}</span>

                  <h4>{competition.name}</h4>
                </div>

                <strong>{competition.placement}</strong>
              </div>

              {competition.division && (
                <p className="muted">{competition.division}</p>
              )}

              {competition.stats && (
                <div className="season-details__stats-row">
                  <div>
                    <span>Meccs</span>
                    <strong>{competition.stats.played}</strong>
                  </div>

                  <div>
                    <span>Győzelem</span>
                    <strong>{competition.stats.wins}</strong>
                  </div>

                  <div>
                    <span>Döntetlen</span>
                    <strong>{competition.stats.draws}</strong>
                  </div>

                  <div>
                    <span>Vereség</span>
                    <strong>{competition.stats.losses}</strong>
                  </div>

                  <div>
                    <span>Gólkülönbség</span>
                    <strong>
                      {competition.stats.goalsFor}–
                      {competition.stats.goalsAgainst}
                    </strong>
                  </div>

                  {competition.stats.points !== undefined && (
                    <div>
                      <span>Pont</span>
                      <strong>{competition.stats.points}</strong>
                    </div>
                  )}
                </div>
              )}

              {competition.opponent && (
                <div className="season-details__cup-result">
                  <span>{competition.round}</span>

                  <strong>
                    Ball of Duty {competition.goalsFor}–
                    {competition.goalsAgainst} {competition.opponent}
                  </strong>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {selectedSeason.seasonPlayers?.length > 0 && (
        <section className="panel season-details__section">
          <div className="season-details__section-heading">
            <div>
              <p className="eyebrow">Player voting</p>
              <h3>A szezon játékosai</h3>
            </div>
          </div>

          <div className="season-details__podium">
            {selectedSeason.seasonPlayers.map((player, index) => (
              <article
                className="season-details__podium-player"
                key={player.playerId ?? player.name}
              >
                <span className="season-details__podium-position">
                  {index + 1}.
                </span>

                <div>
                  <strong>{player.name}</strong>

                  {player.nickname && (
                    <span>{player.nickname}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {selectedSeason.individualAwards?.length > 0 && (
        <section className="panel season-details__section">
          <div className="season-details__section-heading">
            <div>
              <p className="eyebrow">Individual recognition</p>
              <h3>Egyéni elismerések</h3>
            </div>
          </div>

          <div className="season-details__awards">
            {selectedSeason.individualAwards.map((award) => (
              <article
                className="season-details__award"
                key={`${award.playerName}-${award.title}`}
              >
                <div>
                  <strong>{award.playerName}</strong>

                  <span>{award.position}</span>
                </div>

                <p>{award.title}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {selectedSeason.milestones?.length > 0 && (
        <section className="panel season-details__section">
          <div className="season-details__section-heading">
            <div>
              <p className="eyebrow">Club history</p>
              <h3>Mérföldkövek</h3>
            </div>
          </div>

          <div className="season-details__milestones">
            {selectedSeason.milestones.map((milestone) => (
              <div
                className="season-details__milestone"
                key={milestone}
              >
                <span>✓</span>

                <p>{milestone}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default SeasonDetails;