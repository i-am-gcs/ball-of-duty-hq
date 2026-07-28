import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { players } from "../data/players";

const key = "bod-hq-vote";
function Voting() {
  const [selected, setSelected] = useState(() => localStorage.getItem(key) || "");
  const [submitted, setSubmitted] = useState(Boolean(localStorage.getItem(key)));
  useEffect(() => { if (submitted && selected) localStorage.setItem(key, selected); }, [submitted, selected]);
  function submitVote(event) { event.preventDefault(); if (selected) setSubmitted(true); }
  function resetVote() { localStorage.removeItem(key); setSelected(""); setSubmitted(false); }
  return <div className="page-stack"><PageHeader eyebrow="Team decision" title="Szezon játékosa szavazás" description="A leadott szavazat helyben, a böngészőben kerül mentésre." /><form className="panel voting-panel" onSubmit={submitVote}><div className="vote-list">{players.filter((p) => p.status === "Aktív").map((player) => <label className={`vote-option ${selected === player.nickname ? "vote-option--selected" : ""}`} key={player.id}><input type="radio" name="player" value={player.nickname} checked={selected === player.nickname} disabled={submitted} onChange={(event) => setSelected(event.target.value)} /><span className="player-avatar small">{player.nickname.slice(0,2).toUpperCase()}</span><span><strong>{player.nickname}</strong><small>{player.name} · {player.position}</small></span></label>)}</div><div className="form-actions">{submitted ? <><p className="success-message">Szavazat rögzítve: <strong>{selected}</strong></p><button type="button" className="button button--secondary" onClick={resetVote}>Szavazat törlése</button></> : <button className="button" disabled={!selected}>Szavazat leadása</button>}</div></form></div>;
}
export default Voting;
