import { useEffect, useMemo, useState } from "react";
import MatchCard from "../components/matches/MatchCard";
import PageHeader from "../components/ui/PageHeader";
import { createMatch, deleteMatch, getMatches, updateMatch } from "../services/matchService";
import { getSeasons } from "../services/seasonService";
import { useAuth } from "../contexts/AuthContext";

const emptyMatchForm = {
  seasonId: "", competition: "", stage: "", date: "", kickoff: "",
  homeTeam: "Ball of Duty", awayTeam: "", homeScore: "", awayScore: "", notes: "",
};

function getOutcome(match) {
  const isHome = match.homeTeam === "Ball of Duty";
  const clubScore = isHome ? match.homeScore : match.awayScore;
  const opponentScore = isHome ? match.awayScore : match.homeScore;
  if (clubScore > opponentScore) return "Win";
  if (clubScore < opponentScore) return "Loss";
  return "Draw";
}

function Matches() {
  const { isAdmin } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedCompetition, setSelectedCompetition] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [matchForm, setMatchForm] = useState(emptyMatchForm);
  const [editingMatch, setEditingMatch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingMatchId, setDeletingMatchId] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [seasonData, matchData] = await Promise.all([getSeasons(), getMatches()]);
        const sorted = [...seasonData].sort((a, b) => String(b.period?.start || "").localeCompare(a.period?.start || ""));
        setSeasons(sorted);
        setMatches(matchData);
        setSelectedSeasonId(String(sorted[0]?.id || ""));
      } catch (loadError) {
        console.error("Hiba a mérkőzések betöltésekor:", loadError);
        setError("Nem sikerült betölteni a mérkőzéseket.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const seasonMatches = useMemo(() => matches.filter(
    (match) => String(match.seasonId) === selectedSeasonId,
  ), [matches, selectedSeasonId]);

  const competitionNames = [...new Set(seasonMatches.map((match) => match.competition).filter(Boolean))];
  const filteredMatches = selectedCompetition === "all"
    ? seasonMatches
    : seasonMatches.filter((match) => match.competition === selectedCompetition);

  function updateForm(event) {
    const { name, value } = event.target;
    setMatchForm((current) => ({ ...current, [name]: value }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingMatch(null);
    setMatchForm(emptyMatchForm);
    setFormError(null);
  }

  function openCreateForm() {
    setEditingMatch(null);
    setMatchForm({ ...emptyMatchForm, seasonId: selectedSeasonId });
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(match) {
    setEditingMatch(match);
    setMatchForm({
      seasonId: String(match.seasonId || ""), competition: match.competition || "",
      stage: match.stage || "", date: match.date || "", kickoff: match.kickoff || "",
      homeTeam: match.homeTeam || "", awayTeam: match.awayTeam || "",
      homeScore: String(match.homeScore ?? ""), awayScore: String(match.awayScore ?? ""),
      notes: match.notes || "",
    });
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitMatch(event) {
    event.preventDefault();
    if (!matchForm.seasonId || !matchForm.competition.trim() || !matchForm.date ||
        !matchForm.homeTeam.trim() || !matchForm.awayTeam.trim() ||
        matchForm.homeScore === "" || matchForm.awayScore === "") {
      setFormError("A szezon, versenysorozat, dátum, csapatok és eredmény kötelező.");
      return;
    }

    const matchData = {
      ...(editingMatch || {}), seasonId: matchForm.seasonId,
      competition: matchForm.competition.trim(), stage: matchForm.stage.trim(),
      date: matchForm.date, kickoff: matchForm.kickoff,
      homeTeam: matchForm.homeTeam.trim(), awayTeam: matchForm.awayTeam.trim(),
      homeScore: Number(matchForm.homeScore), awayScore: Number(matchForm.awayScore),
      notes: matchForm.notes.trim(), lineup: editingMatch?.lineup || [], events: editingMatch?.events || [],
    };
    matchData.outcome = getOutcome(matchData);
    delete matchData.id;

    try {
      setSaving(true);
      if (editingMatch) {
        const updated = await updateMatch(editingMatch.id, matchData);
        setMatches((current) => current.map((match) => String(match.id) === String(editingMatch.id) ? updated : match));
      } else {
        const created = await createMatch(matchData);
        setMatches((current) => [...current, created]);
      }
      setSelectedSeasonId(String(matchData.seasonId));
      setSelectedCompetition("all");
      closeForm();
    } catch (saveError) {
      console.error("Hiba a mérkőzés mentésekor:", saveError);
      setFormError("Nem sikerült elmenteni a mérkőzést.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMatch(match) {
    if (!window.confirm(`Biztosan törlöd ezt a mérkőzést: ${match.homeTeam} – ${match.awayTeam}?`)) return;
    try {
      setDeletingMatchId(match.id);
      await deleteMatch(match.id);
      setMatches((current) => current.filter((item) => String(item.id) !== String(match.id)));
    } catch (deleteError) {
      console.error("Hiba a mérkőzés törlésekor:", deleteError);
      setError("Nem sikerült törölni a mérkőzést.");
    } finally {
      setDeletingMatchId(null);
    }
  }

  if (loading) return <div className="page-stack"><section className="panel crud-state">Mérkőzések betöltése...</section></div>;

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Match archive" title="Mérkőzések" description="A klub hivatalos mérkőzéseinek és eredményeinek archívuma." />
      {isAdmin && <div className="crud-actions"><button className={`button ${showForm ? "button--secondary" : ""}`} type="button" onClick={showForm ? closeForm : openCreateForm}>{showForm ? "Mégse" : "+ Mérkőzés hozzáadása"}</button></div>}

      {isAdmin && showForm && (
        <form className="panel crud-form" onSubmit={submitMatch}>
          <div className="crud-form__heading crud-form__wide"><p className="eyebrow">Match management</p><h3>{editingMatch ? "Mérkőzés szerkesztése" : "Új mérkőzés"}</h3></div>
          <label><span>Szezon</span><select name="seasonId" value={matchForm.seasonId} onChange={updateForm}><option value="">Válassz szezont</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
          <label><span>Versenysorozat</span><input name="competition" value={matchForm.competition} onChange={updateForm} /></label>
          <label><span>Szakasz / forduló</span><input name="stage" value={matchForm.stage} onChange={updateForm} /></label>
          <label><span>Dátum</span><input type="date" name="date" value={matchForm.date} onChange={updateForm} /></label>
          <label><span>Kezdés</span><input type="time" name="kickoff" value={matchForm.kickoff} onChange={updateForm} /></label>
          <span />
          <label><span>Hazai csapat</span><input name="homeTeam" value={matchForm.homeTeam} onChange={updateForm} /></label>
          <label><span>Vendégcsapat</span><input name="awayTeam" value={matchForm.awayTeam} onChange={updateForm} /></label>
          <label><span>Hazai gól</span><input type="number" min="0" name="homeScore" value={matchForm.homeScore} onChange={updateForm} /></label>
          <label><span>Vendég gól</span><input type="number" min="0" name="awayScore" value={matchForm.awayScore} onChange={updateForm} /></label>
          <label className="crud-form__wide"><span>Megjegyzés</span><textarea rows="3" name="notes" value={matchForm.notes} onChange={updateForm} /></label>
          <div className="form-actions crud-form__wide"><button className="button" disabled={saving}>{saving ? "Mentés..." : editingMatch ? "Módosítások mentése" : "Mérkőzés mentése"}</button>{formError && <span className="error-message">{formError}</span>}</div>
        </form>
      )}

      <section className="panel match-toolbar">
        <label className="match-toolbar__field"><span>Szezon</span><select value={selectedSeasonId} onChange={(event) => { setSelectedSeasonId(event.target.value); setSelectedCompetition("all"); }}>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
        <div className="match-toolbar__filters"><button type="button" className={selectedCompetition === "all" ? "active" : ""} onClick={() => setSelectedCompetition("all")}>Összes</button>{competitionNames.map((name) => <button type="button" key={name} className={selectedCompetition === name ? "active" : ""} onClick={() => setSelectedCompetition(name)}>{name}</button>)}</div>
      </section>

      {error && <p className="error-message">{error}</p>}
      {filteredMatches.length > 0 ? <section className="match-list">{filteredMatches.map((match) => <MatchCard key={match.id} match={match} onEdit={isAdmin ? openEditForm : null} onDelete={isAdmin ? removeMatch : null} deleting={String(deletingMatchId) === String(match.id)} />)}</section> : <section className="panel match-empty-state"><p className="eyebrow">No matches</p><h3>Nincs rögzített mérkőzés</h3><p>Ehhez a szezonhoz és versenysorozathoz még nem adtunk mérkőzést.</p></section>}
    </div>
  );
}

export default Matches;
