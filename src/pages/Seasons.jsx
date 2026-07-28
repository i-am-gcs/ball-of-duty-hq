import PageHeader from "../components/ui/PageHeader";
import { seasons } from "../data/mockData";
function Seasons() {
  return <div className="page-stack"><PageHeader eyebrow="Season archive" title="Szezonok" description="Eredmények, helyezések és szezonvégi díjazottak." /><section className="season-grid">{seasons.map((season) => <article className="season-card panel" key={season.id}><div className="panel-heading"><div><span className={`status-pill ${season.status === "Aktív" ? "status-pill--success" : ""}`}>{season.status}</span><h3>{season.name}</h3><p>{season.period}</p></div></div><h4>Versenysorozatok</h4><ul>{season.competitions.map((item) => <li key={item}>{item}</li>)}</ul><h4>Szezon játékosa</h4>{season.playerOfSeason.length ? <ol>{season.playerOfSeason.map((item) => <li key={item}>{item}</li>)}</ol> : <p className="muted">A szezon még folyamatban van.</p>}</article>)}</section></div>;
}
export default Seasons;
