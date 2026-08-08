import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { getPlayers } from "../services/playerService";

function Squad() {
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState("Összes");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPlayers() {
      try {
        setLoading(true);
        setError(null);

        const playerData = await getPlayers();

        setPlayers(playerData);
      } catch (error) {
        console.error("Hiba a játékosok betöltésekor:", error);

        setError("Nem sikerült betölteni a játékosokat.");
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();
  }, []);

  const positions = useMemo(() => {
    const playerPositions = players.map((player) => player.position);

    return ["Összes", ...new Set(playerPositions)];
  }, [players]);

  const visiblePlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesPosition = filter === "Összes" || player.position === filter;

      const query = search.trim().toLowerCase();

      const playerName = player.name?.toLowerCase() || "";
      const playerNickname = player.nickname?.toLowerCase() || "";

      const matchesSearch =
        playerName.includes(query) || playerNickname.includes(query);

      return matchesPosition && matchesSearch;
    });
  }, [players, filter, search]);

  if (loading) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Squad management"
          title="Játékoskeret"
          description="Keresés, pozíció szerinti szűrés és teljesítményadatok."
        />

        <section className="panel">
          <p>Játékosok betöltése...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Squad management"
          title="Játékoskeret"
          description="Keresés, pozíció szerinti szűrés és teljesítményadatok."
        />

        <section className="panel">
          <p>{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Squad management"
        title="Játékoskeret"
        description="Keresés, pozíció szerinti szűrés és teljesítményadatok."
      />

      <section className="toolbar panel">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Játékos keresése..."
        />

        <div className="filter-row">
          {positions.map((position) => (
            <button
              key={position}
              className={filter === position ? "active" : ""}
              onClick={() => setFilter(position)}
            >
              {position}
            </button>
          ))}
        </div>
      </section>

      {visiblePlayers.length === 0 ? (
        <section className="panel">
          <p>Nem található a feltételeknek megfelelő játékos.</p>
        </section>
      ) : (
        <section className="player-grid">
          {visiblePlayers.map((player) => (
            <article className="player-card panel" key={player.id}>
              <div className="player-top">
                <span className="position-badge">{player.position}</span>

                <span
                  className={`status-dot ${
                    player.status === "Aktív" ? "status-dot--active" : ""
                  }`}
                >
                  {player.status}
                </span>
              </div>

              <div className="player-avatar">
                {player.nickname?.slice(0, 2).toUpperCase()}
              </div>

              <h3>{player.nickname}</h3>

              <p>{player.name}</p>

              <div className="rating">
                <span>Overall</span>
                <strong>{player.rating}</strong>
              </div>

              <div className="player-stats">
                <div>
                  <strong>{player.appearances}</strong>
                  <span>Meccs</span>
                </div>

                <div>
                  <strong>{player.goals}</strong>
                  <span>Gól</span>
                </div>

                <div>
                  <strong>{player.assists}</strong>
                  <span>Gólpassz</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default Squad;
