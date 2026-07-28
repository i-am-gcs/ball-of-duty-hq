import { useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { players } from "../data/mockData";

function Squad() {
  const [filter, setFilter] = useState("Összes");
  const [search, setSearch] = useState("");
  const positions = ["Összes", ...new Set(players.map((player) => player.position))];

  const visiblePlayers = useMemo(() => players.filter((player) => {
    const matchesPosition = filter === "Összes" || player.position === filter;
    const query = search.toLowerCase();
    const matchesSearch = player.name.toLowerCase().includes(query) || player.nickname.toLowerCase().includes(query);
    return matchesPosition && matchesSearch;
  }), [filter, search]);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Squad management" title="Játékoskeret" description="Keresés, pozíció szerinti szűrés és teljesítményadatok." />
      <section className="toolbar panel">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Játékos keresése..." />
        <div className="filter-row">
          {positions.map((position) => <button key={position} className={filter === position ? "active" : ""} onClick={() => setFilter(position)}>{position}</button>)}
        </div>
      </section>
      <section className="player-grid">
        {visiblePlayers.map((player) => (
          <article className="player-card panel" key={player.id}>
            <div className="player-top"><span className="position-badge">{player.position}</span><span className={`status-dot ${player.status === "Aktív" ? "status-dot--active" : ""}`}>{player.status}</span></div>
            <div className="player-avatar">{player.nickname.slice(0, 2).toUpperCase()}</div>
            <h3>{player.nickname}</h3><p>{player.name}</p>
            <div className="rating"><span>Overall</span><strong>{player.rating}</strong></div>
            <div className="player-stats"><div><strong>{player.appearances}</strong><span>Meccs</span></div><div><strong>{player.goals}</strong><span>Gól</span></div><div><strong>{player.assists}</strong><span>Gólpassz</span></div></div>
          </article>
        ))}
      </section>
    </div>
  );
}
export default Squad;
