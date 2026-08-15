import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import {
  createAbsence,
  deleteAbsence,
  getAbsences,
  updateAbsence,
} from "../services/absenceService";
import { getPlayers } from "../services/playerService";
import AdminAbsencePanel from "../components/calendar/AdminAbsencePanel";

import "../styles/calendar.css";
import "../styles/admin-absence.css";

const WEEKDAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

const MONTHS = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
];

function formatDate(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isDateInRange(dateString, startDate, endDate) {
  return dateString >= startDate && dateString <= endDate;
}

function Calendar() {
  const { profile, isAdmin } = useAuth();

  /* ---------------------------------------------
     CALENDAR
     --------------------------------------------- */

  const [currentDate, setCurrentDate] = useState(new Date());

  /* ---------------------------------------------
     DATA
     --------------------------------------------- */

  const [absences, setAbsences] = useState([]);

  const [players, setPlayers] = useState([]);

  /* ---------------------------------------------
     LOADING / ERROR
     --------------------------------------------- */

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* ---------------------------------------------
     FORM
     --------------------------------------------- */

  const [showForm, setShowForm] = useState(false);

  const [editingAbsenceId, setEditingAbsenceId] = useState(null);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
  });

  /* ---------------------------------------------
     ADMIN
     --------------------------------------------- */

  const [selectedDate, setSelectedDate] = useState("");

  /* ---------------------------------------------
     LOAD DATA
     --------------------------------------------- */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const absencesData = await getAbsences();

        setAbsences(absencesData);

        /*
         * A játékoslista csak az admin nézethez
         * szükséges.
         */
        if (isAdmin) {
          const playersData = await getPlayers();

          setPlayers(playersData);
        }
      } catch (loadError) {
        console.error("Távollétek betöltési hiba:", loadError);

        setError("Nem sikerült betölteni a távolléteket.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isAdmin]);

  /* ---------------------------------------------
     CALENDAR DAYS
     --------------------------------------------- */

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();

    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const lastDay = new Date(year, month + 1, 0);

    /*
     * JavaScript:
     * Sunday = 0
     * Monday = 1
     *
     * A BoD naptár hétfővel kezdődik.
     */
    const firstWeekday = (firstDay.getDay() + 6) % 7;

    const daysInMonth = lastDay.getDate();

    const days = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentDate]);

  /* ---------------------------------------------
     OWN ABSENCES
     --------------------------------------------- */

  const ownAbsences = useMemo(() => {
    if (!profile?.playerId) {
      return [];
    }

    return absences.filter((absence) => absence.playerId === profile.playerId);
  }, [absences, profile]);

  /* ---------------------------------------------
     ADMIN PLAYER MAP
     --------------------------------------------- */

  const playerMap = useMemo(() => {
    return Object.fromEntries(players.map((player) => [player.id, player]));
  }, [players]);

  /* ---------------------------------------------
     ADMIN ABSENCES
     --------------------------------------------- */

  const enrichedAbsences = useMemo(() => {
    return [...absences]
      .map((absence) => ({
        ...absence,
        player: playerMap[absence.playerId],
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [absences, playerMap]);

  /* ---------------------------------------------
     ADMIN SELECTED DAY
     --------------------------------------------- */

  const selectedDayAbsences = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return enrichedAbsences.filter((absence) =>
      isDateInRange(selectedDate, absence.startDate, absence.endDate),
    );
  }, [selectedDate, enrichedAbsences]);

  /* ---------------------------------------------
     ADMIN UPCOMING
     --------------------------------------------- */

  const upcomingAbsences = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return enrichedAbsences.filter((absence) => absence.endDate >= today);
  }, [enrichedAbsences]);

  /* ---------------------------------------------
     MONTH NAVIGATION
     --------------------------------------------- */

  function previousMonth() {
    setCurrentDate(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  }

  function nextMonth() {
    setCurrentDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  /* ---------------------------------------------
     FORM
     --------------------------------------------- */

  function openCreateForm() {
    setEditingAbsenceId(null);

    setFormData({
      startDate: "",
      endDate: "",
    });

    setFormError("");
    setShowForm(true);
  }

  function openEditForm(absence) {
    setEditingAbsenceId(absence.id);

    setFormData({
      startDate: absence.startDate,
      endDate: absence.endDate,
    });

    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);

    setEditingAbsenceId(null);

    setFormData({
      startDate: "",
      endDate: "",
    });

    setFormError("");
  }

  function updateForm(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /* ---------------------------------------------
     SAVE ABSENCE
     --------------------------------------------- */

  async function submitAbsence(event) {
    event.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      setFormError("A kezdő- és záródátum megadása kötelező.");

      return;
    }

    if (formData.endDate < formData.startDate) {
      setFormError("A záródátum nem lehet korábbi a kezdődátumnál.");

      return;
    }

    if (!profile?.playerId) {
      setFormError("A profilod nincs összekötve játékossal.");

      return;
    }

    try {
      setSaving(true);
      setFormError("");

      if (editingAbsenceId) {
        const updated = await updateAbsence(editingAbsenceId, formData);

        setAbsences((current) =>
          current.map((absence) =>
            absence.id === editingAbsenceId
              ? {
                  ...absence,
                  ...updated,
                }
              : absence,
          ),
        );
      } else {
        const created = await createAbsence({
          ...formData,
          playerId: profile.playerId,
        });

        setAbsences((current) => [...current, created]);
      }

      closeForm();
    } catch (saveError) {
      console.error("Távollét mentési hiba:", saveError);

      setFormError("Nem sikerült elmenteni a távollétet.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------
     DELETE ABSENCE
     --------------------------------------------- */

  async function removeOwnAbsence(absence) {
    const confirmed = window.confirm(
      "Biztosan törölni szeretnéd ezt a távollétet?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(absence.id);

      await deleteAbsence(absence.id);

      setAbsences((current) =>
        current.filter((item) => item.id !== absence.id),
      );
    } catch (deleteError) {
      console.error("Távollét törlési hiba:", deleteError);

      setError("Nem sikerült törölni a távollétet.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ---------------------------------------------
     DAY HELPERS
     --------------------------------------------- */

  function getAbsencesForDay(date) {
    if (!date) {
      return [];
    }

    const dateString = formatDate(date);

    return ownAbsences.filter((absence) =>
      isDateInRange(dateString, absence.startDate, absence.endDate),
    );
  }

  function isToday(date) {
    if (!date) {
      return false;
    }

    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  /* ---------------------------------------------
     ADMIN ABSENCE UPDATE
     --------------------------------------------- */

  function handleAdminAbsenceUpdated(updated) {
    setAbsences((current) =>
      current.map((absence) =>
        absence.id === updated.id
          ? {
              ...absence,
              ...updated,
            }
          : absence,
      ),
    );
  }

  /* ---------------------------------------------
     RENDER
     --------------------------------------------- */

  return (
    <div className="page-stack">
      {/* =========================================
          PAGE HEADER
          ========================================= */}

      <PageHeader
        eyebrow="Availability"
        title="Távolléti naptár"
        description="Jelöld előre azokat az időszakokat, amikor nem tudsz részt venni az edzéseken vagy mérkőzéseken."
      />

      {/* =========================================
          PLAYER CALENDAR
          ========================================= */}

      <section className="panel absence-calendar">
        <div className="absence-calendar__toolbar">
          <button
            type="button"
            className="button button--secondary"
            onClick={previousMonth}
          >
            ‹
          </button>

          <div className="absence-calendar__month">
            <h2>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>

            <button
              type="button"
              className="absence-calendar__today"
              onClick={goToToday}
            >
              Ma
            </button>
          </div>

          <button
            type="button"
            className="button button--secondary"
            onClick={nextMonth}
          >
            ›
          </button>
        </div>

        <div className="absence-calendar__weekdays">
          {WEEKDAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="absence-calendar__grid">
          {calendarDays.map((date, index) => {
            if (!date) {
              return (
                <div
                  className="absence-calendar__day absence-calendar__day--empty"
                  key={`empty-${index}`}
                />
              );
            }

            const dayAbsences = getAbsencesForDay(date);

            return (
              <div
                className={`absence-calendar__day ${
                  isToday(date) ? "absence-calendar__day--today" : ""
                } ${dayAbsences.length ? "absence-calendar__day--absent" : ""}`}
                key={formatDate(date)}
              >
                <span className="absence-calendar__date">{date.getDate()}</span>

                {dayAbsences.length > 0 && (
                  <div className="absence-calendar__marker">Távollét</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================
          OWN ABSENCES
          ========================================= */}

      <section className="panel absence-list">
        <div className="absence-list__header">
          <div>
            <p className="eyebrow">Saját távollétek</p>

            <h2>Előre jelzett időszakok</h2>
          </div>

          <button type="button" className="button" onClick={openCreateForm}>
            + Távollét hozzáadása
          </button>
        </div>

        {loading && <p>Távollétek betöltése...</p>}

        {error && <p className="error-message">{error}</p>}

        {!loading && !error && ownAbsences.length === 0 && (
          <div className="absence-list__empty">
            <span>📅</span>

            <h3>Nincs bejelentett távolléted</h3>

            <p>Ha előre tudod, hogy nem tudsz részt venni, jelöld be itt.</p>
          </div>
        )}

        {!loading && ownAbsences.length > 0 && (
          <div className="absence-items">
            {[...ownAbsences]
              .sort((a, b) => a.startDate.localeCompare(b.startDate))
              .map((absence) => (
                <article className="absence-item" key={absence.id}>
                  <div className="absence-item__icon">🗓️</div>

                  <div className="absence-item__info">
                    <strong>
                      {formatDisplayDate(absence.startDate)}

                      {absence.startDate !== absence.endDate &&
                        ` → ${formatDisplayDate(absence.endDate)}`}
                    </strong>

                    <span>Távollét</span>
                  </div>

                  <div className="absence-item__actions">
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => openEditForm(absence)}
                    >
                      Szerkesztés
                    </button>

                    <button
                      type="button"
                      className="button absence-item__delete"
                      disabled={deletingId === absence.id}
                      onClick={() => removeOwnAbsence(absence)}
                    >
                      {deletingId === absence.id ? "Törlés..." : "Törlés"}
                    </button>
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>

      {/* =========================================
          ADMIN VIEW
          ========================================= */}

      {isAdmin && (
        <AdminAbsencePanel
          absences={absences}
          players={players}
          onAbsenceUpdated={handleAdminAbsenceUpdated}
        />
      )}

      {/* =========================================
          ABSENCE MODAL
          ========================================= */}

      {showForm && (
        <div className="absence-modal-backdrop" onClick={closeForm}>
          <section
            className="panel absence-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="absence-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absence-modal__close"
              onClick={closeForm}
              aria-label="Bezárás"
            >
              ×
            </button>

            <p className="eyebrow">Availability</p>

            <h2 id="absence-form-title">
              {editingAbsenceId ? "Távollét szerkesztése" : "Új távollét"}
            </h2>

            <p className="absence-modal__description">
              Jelöld meg azt az időszakot, amikor nem vagy elérhető.
            </p>

            <form className="absence-form" onSubmit={submitAbsence}>
              <label>
                <span>Kezdő dátum</span>

                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={updateForm}
                />
              </label>

              <label>
                <span>Záró dátum</span>

                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={updateForm}
                />
              </label>

              <div className="absence-form__note">
                <span>ℹ️</span>

                <p>
                  A távolléted miatt az érintett időszakra nem lesz kötelező
                  külön szavaznod.
                </p>
              </div>

              {formError && <p className="error-message">{formError}</p>}

              <div className="absence-form__actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={closeForm}
                >
                  Mégse
                </button>

                <button type="submit" className="button" disabled={saving}>
                  {saving
                    ? "Mentés..."
                    : editingAbsenceId
                      ? "Módosítás mentése"
                      : "Távollét mentése"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Calendar;
