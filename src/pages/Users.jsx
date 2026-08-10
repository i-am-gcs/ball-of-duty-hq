import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { getPlayers } from "../services/playerService";
import { getUsers, reviewAndLinkUser } from "../services/userService";

const statusLabels = { pending: "Jóváhagyásra vár", approved: "Engedélyezve", rejected: "Elutasítva" };

function Users() {
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    Promise.all([getUsers(), getPlayers()]).then(([userData, playerData]) => {
      setUsers(userData);
      setPlayers(playerData);
      setSelectedPlayers(Object.fromEntries(userData.map((user) => [user.id, user.playerId || ""])));
    }).catch((loadError) => {
      console.error("Nem sikerült betölteni a felhasználókat:", loadError);
      setError("Nem sikerült betölteni a felhasználókat.");
    }).finally(() => setLoading(false));
  }, []);

  const sortedUsers = useMemo(() => [...users].sort((a, b) => {
    if ((a.status || "pending") === (b.status || "pending")) return String(b.createdAt || "").localeCompare(a.createdAt || "");
    return (a.status || "pending") === "pending" ? -1 : 1;
  }), [users]);

  async function saveAccess(user, status) {
    try {
      setSavingId(user.id);
      const playerId = selectedPlayers[user.id] || "";
      await reviewAndLinkUser({ userId: user.id, status, playerId, previousPlayerId: user.playerId });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status, playerId: playerId || null } : item));
      setPlayers((current) => current.map((player) => {
        if (String(player.id) === String(user.playerId) && String(player.id) !== String(playerId)) return { ...player, userId: null };
        if (String(player.id) === String(playerId)) return { ...player, userId: user.id };
        return player;
      }));
    } catch (saveError) {
      console.error("Nem sikerült módosítani a hozzáférést:", saveError);
      setError("Nem sikerült módosítani a felhasználó hozzáférését.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Access management" title="Felhasználók" description="Regisztrációk jóváhagyása és a klubfelület hozzáféréseinek kezelése." />
      {error && <p className="error-message">{error}</p>}
      {loading ? <section className="panel crud-state">Felhasználók betöltése...</section> : (
        <section className="user-list">
          {sortedUsers.map((user) => {
            const status = user.status || "pending";
            const availablePlayers = players.filter((player) => !player.userId || player.userId === user.id);
            return <article className="panel user-card" key={user.id}>
              <div className="user-card__identity"><div className="avatar">{(user.displayName || user.email || "?").slice(0, 2).toUpperCase()}</div><div><strong>{user.displayName || "Névtelen felhasználó"}</strong><span>{user.email}</span></div></div>
              <span className={`approval-pill approval-pill--${status}`}>{statusLabels[status] || status}</span>
              <label className="user-card__player"><span>Játékosprofil</span><select value={selectedPlayers[user.id] || ""} onChange={(event) => setSelectedPlayers((current) => ({ ...current, [user.id]: event.target.value }))}><option value="">Nincs hozzárendelve</option>{availablePlayers.map((player) => <option key={player.id} value={player.id}>{player.nickname} · {player.name}</option>)}</select></label>
              <div className="user-card__actions">
                <button type="button" className="button" disabled={savingId === user.id} onClick={() => saveAccess(user, "approved")}>{savingId === user.id ? "Mentés..." : status === "approved" ? "Kapcsolat mentése" : "Jóváhagyás"}</button>
                {status !== "rejected" && <button type="button" className="button button--secondary" disabled={savingId === user.id} onClick={() => saveAccess(user, "rejected")}>Elutasítás</button>}
              </div>
            </article>;
          })}
        </section>
      )}
    </div>
  );
}

export default Users;
