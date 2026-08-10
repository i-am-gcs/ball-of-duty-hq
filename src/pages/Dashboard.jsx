import { Link } from "react-router-dom";
import StatCard from "../components/ui/StatCard";
import { players } from "../data/players";
import { results } from "../data/results";

function Dashboard() {
  const activePlayers = players.filter((player) => player.status === "Aktív").length;

  return (
    <div className="page-stack">
      <section className="dashboard-brand-hero">
        <div className="dashboard-brand-hero__content">
          <p className="eyebrow">Club overview</p>
          <h2>Üdv a Ball of Duty főhadiszállásán</h2>
          <p>A klub legfontosabb adatai, eredményei és következő feladatai egyetlen helyen.</p>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Keretlétszám" value={players.length} detail={`${activePlayers} aktív játékos`} icon="♟" />
        <StatCard label="Aktív szezon" value="III." detail="2026 / folyamatban" icon="◫" />
        <StatCard label="Következő mérkőzés" value="Vasárnap" detail="20:00 · HPCL I." icon="⚽" />
        <StatCard label="Aktuális helyezés" value="8." detail="HPCL I. osztály" icon="★" />
      </section>

      <section className="dashboard-grid">
        <article className="panel hero-panel">
          <div>
            <p className="eyebrow">Következő mérkőzés</p>
            <h3>Ball of Duty CF</h3>
            <div className="versus-row"><strong>BOD</strong><span>VS</span><strong>Royal Eleven</strong></div>
            <p>Vasárnap · 20:00 · HPCL I.</p>
          </div>
          <div className="match-badge">MATCH<br />DAY</div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Gyors műveletek</p><h3>Klubmenedzsment</h3></div></div>
          <div className="quick-actions">
            <Link to="/squad">Játékoskeret megnyitása</Link>
            <Link to="/voting">Új szavazás</Link>
            <Link to="/benefits">Benefit Tracker</Link>
            <Link to="/statistics">Statisztikák</Link>
          </div>
        </article>

        <article className="panel dashboard-wide">
          <div className="panel-heading"><div><p className="eyebrow">Legutóbbi eredmények</p><h3>Formamutató</h3></div><Link to="/statistics">Részletek →</Link></div>
          <div className="result-list">
            {results.map((result) => (
              <div className="result-row" key={result.id}>
                <div><strong>{result.opponent}</strong><span>{result.competition}</span></div>
                <b>{result.score}</b>
                <span className={`status-pill ${result.outcome === "Győzelem" ? "status-pill--success" : ""}`}>{result.outcome}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
export default Dashboard;
