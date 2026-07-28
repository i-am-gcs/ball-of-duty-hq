import PageHeader from "../components/ui/PageHeader";
import { players } from "../data/players";

function Statistics() {
  const topScorers = [...players]
    .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))
    .slice(0, 5);

  const maxGoals = Math.max(1, ...topScorers.map((player) => player.goals ?? 0));
  const totalGoals = players.reduce((sum, player) => sum + (player.goals ?? 0), 0);
  const totalAssists = players.reduce((sum, player) => sum + (player.assists ?? 0), 0);
  const playersWithRating = players.filter((player) => Number.isFinite(player.rating));
  const averageRating = playersWithRating.length
    ? Math.round(playersWithRating.reduce((sum, player) => sum + player.rating, 0) / playersWithRating.length)
    : "–";

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Performance center"
        title="Statisztikák"
        description="Csapat- és játékosmutatók."
      />

      <section className="dashboard-grid">
        <article className="panel dashboard-wide">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Top scorers</p>
              <h3>Góllövőlista</h3>
            </div>
          </div>

          {topScorers.length === 0 ? (
            <p className="muted">Még nincs rögzített játékosstatisztika.</p>
          ) : (
            <div className="chart-list">
              {topScorers.map((player, index) => (
                <div className="chart-row" key={player.id}>
                  <span>{index + 1}. {player.nickname}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${((player.goals ?? 0) / maxGoals) * 100}%` }}
                    />
                  </div>
                  <strong>{player.goals ?? 0}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Csapatátlag</p>
          <h3>Teljesítménymutatók</h3>
          <div className="metric-list">
            <div><span>Átlagos overall</span><strong>{averageRating}</strong></div>
            <div><span>Összes gól</span><strong>{totalGoals}</strong></div>
            <div><span>Összes gólpassz</span><strong>{totalAssists}</strong></div>
            <div><span>Aktív játékosok</span><strong>{players.filter((player) => player.status === "Aktív").length}</strong></div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default Statistics;
