import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import { matches } from "../data/matches";

function MatchDetails() {
  const { matchId } = useParams();

  const selectedMatch = matches.find(
    (match) => match.id === Number(matchId)
  );

  if (!selectedMatch) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Match archive"
          title="A mérkőzés nem található"
          description="A megadott azonosítóval nem szerepel mérkőzés az archívumban."
        />

        <section className="panel match-details-empty">
          <p>Lehetséges, hogy a mérkőzést törölték vagy hibás linket nyitottál meg.</p>

          <Link to="/matches" className="match-details-back-link">
            ← Vissza a mérkőzésekhez
          </Link>
        </section>
      </div>
    );
  }

  const hasLineup = selectedMatch.lineup.length > 0;
  const hasEvents = selectedMatch.events.length > 0;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Match archive"
        title={`${selectedMatch.homeTeam} – ${selectedMatch.awayTeam}`}
        description={`${selectedMatch.competition} · ${selectedMatch.stage}`}
      />

      <Link to="/matches" className="match-details-back-link">
        ← Vissza a mérkőzésekhez
      </Link>

      <section className="panel match-details-hero">
        <div className="match-details-hero__meta">
          <span>{selectedMatch.competition}</span>
          <strong>{selectedMatch.stage}</strong>
        </div>

        <div className="match-details-scoreboard">
          <div className="match-details-team">
            <span>Hazai csapat</span>
            <strong>{selectedMatch.homeTeam}</strong>
          </div>

          <div className="match-details-score">
            <strong>
              {selectedMatch.homeScore} : {selectedMatch.awayScore}
            </strong>

            <span
              className={`status-pill ${
                selectedMatch.outcome === "Win"
                  ? "status-pill--success"
                  : selectedMatch.outcome === "Draw"
                    ? "status-pill--neutral"
                    : "status-pill--danger"
              }`}
            >
              {selectedMatch.outcome}
            </span>
          </div>

          <div className="match-details-team match-details-team--away">
            <span>Vendégcsapat</span>
            <strong>{selectedMatch.awayTeam}</strong>
          </div>
        </div>

        <div className="match-details-hero__footer">
          <span>{selectedMatch.date}</span>
          <strong>{selectedMatch.kickoff}</strong>
        </div>
      </section>

      <section className="match-details-grid">
        <article className="panel match-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Mérkőzésadatok</p>
              <h3>Információk</h3>
            </div>
          </div>

          <div className="match-info-list">
            <div className="match-info-row">
              <span>Versenysorozat</span>
              <strong>{selectedMatch.competition}</strong>
            </div>

            <div className="match-info-row">
              <span>Szakasz</span>
              <strong>{selectedMatch.stage}</strong>
            </div>

            <div className="match-info-row">
              <span>Dátum</span>
              <strong>{selectedMatch.date}</strong>
            </div>

            <div className="match-info-row">
              <span>Kezdés</span>
              <strong>{selectedMatch.kickoff}</strong>
            </div>

            <div className="match-info-row">
              <span>Szezonazonosító</span>
              <strong>{selectedMatch.seasonId}</strong>
            </div>
          </div>
        </article>

        <article className="panel match-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Keret</p>
              <h3>Kezdőcsapat</h3>
            </div>
          </div>

          {hasLineup ? (
            <div className="match-lineup-list">
              {selectedMatch.lineup.map((player, index) => (
                <div
                  className="match-lineup-player"
                  key={`${player}-${index}`}
                >
                  <span>{index + 1}</span>
                  <strong>{player}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <p>Ehhez a mérkőzéshez még nincs rögzített összeállítás.</p>
            </div>
          )}
        </article>

        <article className="panel match-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Mérkőzés eseményei</p>
              <h3>Idővonal</h3>
            </div>
          </div>

          {hasEvents ? (
            <div className="match-events-list">
              {selectedMatch.events.map((event, index) => (
                <div
                  className="match-event-row"
                  key={`${event.minute}-${event.player}-${index}`}
                >
                  <span className="match-event-minute">
                    {event.minute}'
                  </span>

                  <span className="match-event-icon">
                    {event.type === "goal" ? "⚽" : "•"}
                  </span>

                  <div>
                    <strong>{event.player}</strong>
                    <span>{event.type}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <p>Ehhez a mérkőzéshez még nincs rögzített esemény.</p>
            </div>
          )}
        </article>

        <article className="panel match-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Meccsjegyzet</p>
              <h3>Megjegyzések</h3>
            </div>
          </div>

          <p className="match-details-notes">
            {selectedMatch.notes || "Ehhez a mérkőzéshez még nincs megjegyzés."}
          </p>
        </article>
      </section>
    </div>
  );
}

export default MatchDetails;