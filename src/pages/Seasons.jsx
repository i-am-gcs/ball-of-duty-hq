import { useEffect, useMemo, useState } from "react";
import SeasonCard from "../components/seasons/SeasonCard";
import PageHeader from "../components/ui/PageHeader";
import {
  createSeason,
  deleteSeason,
  getSeasons,
  updateSeason,
} from "../services/seasonService";
import { useAuth } from "../contexts/AuthContext";

const emptySeasonForm = {
  name: "",
  status: "upcoming",
  startDate: "",
  endDate: "",
  competitions: "",
};

const statusPriority = { active: 1, upcoming: 2, completed: 3 };

function Seasons() {
  const { isAdmin } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [seasonForm, setSeasonForm] = useState(emptySeasonForm);
  const [editingSeason, setEditingSeason] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingSeasonId, setDeletingSeasonId] = useState(null);

  useEffect(() => {
    async function loadSeasons() {
      try {
        setLoading(true);
        setSeasons(await getSeasons());
      } catch (loadError) {
        console.error("Hiba a szezonok betöltésekor:", loadError);
        setError("Nem sikerült betölteni a szezonokat.");
      } finally {
        setLoading(false);
      }
    }

    loadSeasons();
  }, []);

  const sortedSeasons = useMemo(() => [...seasons].sort((first, second) => {
    const statusDifference =
      (statusPriority[first.status] || 99) - (statusPriority[second.status] || 99);
    if (statusDifference !== 0) return statusDifference;
    return String(second.period?.start || "").localeCompare(first.period?.start || "");
  }), [seasons]);

  function updateForm(event) {
    const { name, value } = event.target;
    setSeasonForm((current) => ({ ...current, [name]: value }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingSeason(null);
    setSeasonForm(emptySeasonForm);
    setFormError(null);
  }

  function openCreateForm() {
    setEditingSeason(null);
    setSeasonForm(emptySeasonForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(season) {
    setEditingSeason(season);
    setSeasonForm({
      name: season.name || season.title || "",
      status: season.status || "upcoming",
      startDate: season.period?.start || season.startDate || "",
      endDate: season.period?.end || season.endDate || "",
      competitions: (season.competitions || []).map((competition) => competition.name).join(", "),
    });
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitSeason(event) {
    event.preventDefault();
    const competitionNames = seasonForm.competitions
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    if (!seasonForm.name.trim() || !seasonForm.startDate) {
      setFormError("A szezon neve és kezdési dátuma kötelező.");
      return;
    }

    const existingCompetitions = editingSeason?.competitions || [];
    const seasonData = {
      ...(editingSeason || {}),
      name: seasonForm.name.trim(),
      status: seasonForm.status,
      period: { start: seasonForm.startDate, end: seasonForm.endDate || null },
      competitions: competitionNames.map((name, index) => {
        const existing = existingCompetitions.find((competition) => competition.name === name);
        return existing || {
          id: `competition-${Date.now()}-${index}`,
          name,
          shortName: name,
          type: "league",
          division: null,
          placement: null,
        };
      }),
      awards: editingSeason?.awards || { seasonPlayerPodium: [], individualAwards: [] },
      milestones: editingSeason?.milestones || [],
    };
    delete seasonData.id;

    try {
      setSaving(true);
      setFormError(null);
      if (editingSeason) {
        const updated = await updateSeason(editingSeason.id, seasonData);
        setSeasons((current) => current.map((season) =>
          String(season.id) === String(editingSeason.id) ? updated : season,
        ));
      } else {
        const created = await createSeason(seasonData);
        setSeasons((current) => [...current, created]);
      }
      closeForm();
    } catch (saveError) {
      console.error("Hiba a szezon mentésekor:", saveError);
      setFormError("Nem sikerült elmenteni a szezont.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSeason(season) {
    if (!window.confirm(`Biztosan törlöd ezt a szezont: ${season.name}?`)) return;
    try {
      setDeletingSeasonId(season.id);
      await deleteSeason(season.id);
      setSeasons((current) => current.filter((item) => String(item.id) !== String(season.id)));
    } catch (deleteError) {
      console.error("Hiba a szezon törlésekor:", deleteError);
      setError("Nem sikerült törölni a szezont.");
    } finally {
      setDeletingSeasonId(null);
    }
  }

  if (loading) return <div className="page-stack"><section className="panel crud-state">Szezonok betöltése...</section></div>;

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Season archive" title="Szezonok" description="Eredmények, helyezések és szezonvégi díjazottak." />

      {isAdmin && <div className="crud-actions">
        <button className={`button ${showForm ? "button--secondary" : ""}`} type="button" onClick={showForm ? closeForm : openCreateForm}>
          {showForm ? "Mégse" : "+ Szezon hozzáadása"}
        </button>
      </div>}

      {isAdmin && showForm && (
        <form className="panel crud-form" onSubmit={submitSeason}>
          <div className="crud-form__heading crud-form__wide"><p className="eyebrow">Season management</p><h3>{editingSeason ? "Szezon szerkesztése" : "Új szezon"}</h3></div>
          <label><span>Szezon neve</span><input name="name" value={seasonForm.name} onChange={updateForm} /></label>
          <label><span>Státusz</span><select name="status" value={seasonForm.status} onChange={updateForm}><option value="upcoming">Közelgő</option><option value="active">Aktív</option><option value="completed">Lezárt</option></select></label>
          <label><span>Kezdés</span><input type="date" name="startDate" value={seasonForm.startDate} onChange={updateForm} /></label>
          <label><span>Befejezés</span><input type="date" name="endDate" value={seasonForm.endDate} onChange={updateForm} /></label>
          <label className="crud-form__wide"><span>Versenysorozatok, vesszővel elválasztva</span><input name="competitions" value={seasonForm.competitions} onChange={updateForm} placeholder="HPCL, Balkan Summer League, Magyar Kupa" /></label>
          <div className="form-actions crud-form__wide"><button className="button" disabled={saving}>{saving ? "Mentés..." : editingSeason ? "Módosítások mentése" : "Szezon mentése"}</button>{formError && <span className="error-message">{formError}</span>}</div>
        </form>
      )}

      {error && <p className="error-message">{error}</p>}
      <section className="season-grid">
        {sortedSeasons.map((season) => (
          <SeasonCard key={season.id} season={season} onEdit={isAdmin ? openEditForm : null} onDelete={isAdmin ? removeSeason : null} deleting={String(deletingSeasonId) === String(season.id)} />
        ))}
      </section>
    </div>
  );
}

export default Seasons;
