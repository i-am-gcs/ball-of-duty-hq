import { useMemo, useState } from "react";
import { updateAbsenceReason } from "../../services/absenceService";

function formatDate(dateString) {
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

function getDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);

  const end = new Date(`${endDate}T00:00:00`);

  return Math.round((end - start) / 86400000) + 1;
}

function isDateInAbsence(date, absence) {
  return date >= absence.startDate && date <= absence.endDate;
}

export default function AdminAbsencePanel({
  absences,
  players,
  onAbsenceUpdated,
}) {
  const [selectedDate, setSelectedDate] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [reasonValue, setReasonValue] = useState("");

  const [savingId, setSavingId] = useState(null);

  const [error, setError] = useState("");

  const playerMap = useMemo(() => {
    return Object.fromEntries(players.map((player) => [player.id, player]));
  }, [players]);

  const enrichedAbsences = useMemo(() => {
    return [...absences]
      .map((absence) => ({
        ...absence,
        player: playerMap[absence.playerId],
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [absences, playerMap]);

  const selectedDayAbsences = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return enrichedAbsences.filter((absence) =>
      isDateInAbsence(selectedDate, absence),
    );
  }, [selectedDate, enrichedAbsences]);

  const upcomingAbsences = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return enrichedAbsences.filter((absence) => absence.endDate >= today);
  }, [enrichedAbsences]);

  function startEditing(absence) {
    setEditingId(absence.id);

    setReasonValue(absence.reason || "");

    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setReasonValue("");
    setError("");
  }

  async function saveReason(absence) {
    try {
      setSavingId(absence.id);
      setError("");

      const updated = await updateAbsenceReason(absence.id, reasonValue);

      if (onAbsenceUpdated) {
        onAbsenceUpdated(updated);
      }

      cancelEditing();
    } catch (saveError) {
      console.error("Távollét ok mentési hiba:", saveError);

      setError("Nem sikerült elmenteni a távollét okát.");
    } finally {
      setSavingId(null);
    }
  }

  function getPlayerName(player) {
    return player?.nickname || player?.name || "Ismeretlen játékos";
  }

  return (
    <section className="admin-absence-panel">
      {/* HEADER */}

      <div className="admin-absence-panel__header">
        <div>
          <span className="section-kicker">ADMIN</span>

          <h2>Csapat távollétek</h2>

          <p>Az összes játékos előre jelzett távolléte egy helyen.</p>
        </div>

        <div className="admin-absence-panel__count">
          <strong>{enrichedAbsences.length}</strong>

          <span>bejelentett távollét</span>
        </div>
      </div>

      {/* CONTENT */}

      <div className="admin-absence-panel__content">
        {/* DAY CHECK */}

        <div className="admin-absence-panel__calendar">
          <div className="admin-absence-panel__calendar-header">
            <div>
              <span className="section-kicker">NAP ELLENŐRZÉSE</span>

              <h3>Kik hiányoznak?</h3>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          {!selectedDate ? (
            <div className="admin-absence-panel__empty">
              <span>📅</span>

              <strong>Válassz ki egy napot</strong>

              <p>
                Megmutatjuk, kik jelezték előre, hogy az adott napon nem
                elérhetők.
              </p>
            </div>
          ) : (
            <div className="admin-day-result">
              <div className="admin-day-result__header">
                <div>
                  <span className="section-kicker">KIVÁLASZTOTT NAP</span>

                  <h3>{formatDate(selectedDate)}</h3>
                </div>

                <div className="admin-day-result__count">
                  {selectedDayAbsences.length}
                </div>
              </div>

              {selectedDayAbsences.length === 0 ? (
                <div className="admin-day-result__available">
                  ✓ Nincs bejelentett távollét
                </div>
              ) : (
                <div className="admin-day-result__players">
                  {selectedDayAbsences.map((absence) => {
                    const player = absence.player;

                    const playerName = getPlayerName(player);

                    return (
                      <div key={absence.id} className="admin-absence-player">
                        <div className="admin-absence-player__avatar">
                          {player?.avatarUrl ? (
                            <img src={player.avatarUrl} alt="" />
                          ) : (
                            playerName.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="admin-absence-player__info">
                          <strong>{playerName}</strong>

                          <span>
                            {formatDate(absence.startDate)} –{" "}
                            {formatDate(absence.endDate)}
                          </span>

                          {absence.reason && <small>{absence.reason}</small>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ABSENCE LIST */}

        <div className="admin-absence-panel__list">
          <div className="admin-absence-panel__list-header">
            <div>
              <span className="section-kicker">KÖVETKEZŐ IDŐSZAKOK</span>

              <h3>Bejelentett távollétek</h3>
            </div>

            <span className="admin-absence-panel__list-count">
              {upcomingAbsences.length}
            </span>
          </div>

          {error && <p className="error-message">{error}</p>}

          {upcomingAbsences.length === 0 ? (
            <div className="admin-absence-panel__empty">
              <span>✓</span>

              <strong>Nincs bejelentett távollét</strong>

              <p>Jelenleg nincs előre jelzett távollét.</p>
            </div>
          ) : (
            <div className="admin-absence-list">
              {upcomingAbsences.map((absence) => {
                const player = absence.player;

                const playerName = getPlayerName(player);

                const isEditing = editingId === absence.id;

                return (
                  <div key={absence.id} className="admin-absence-row">
                    {/* PLAYER */}

                    <div className="admin-absence-row__player">
                      <div className="admin-absence-row__avatar">
                        {player?.avatarUrl ? (
                          <img src={player.avatarUrl} alt="" />
                        ) : (
                          playerName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div>
                        <strong>{playerName}</strong>

                        {player?.name && player.nickname !== player.name && (
                          <span>{player.name}</span>
                        )}
                      </div>
                    </div>

                    {/* DATES */}

                    <div className="admin-absence-row__dates">
                      <strong>{formatDate(absence.startDate)}</strong>

                      <span>{formatDate(absence.endDate)}</span>
                    </div>

                    {/* DAYS */}

                    <div className="admin-absence-row__days">
                      <strong>
                        {getDays(absence.startDate, absence.endDate)}
                      </strong>

                      <span>nap</span>
                    </div>

                    {/* REASON */}

                    <div className="admin-absence-row__reason">
                      <span className="admin-absence-row__reason-label">
                        OK
                      </span>

                      {isEditing ? (
                        <div className="admin-absence-row__reason-edit">
                          <input
                            type="text"
                            value={reasonValue}
                            onChange={(event) =>
                              setReasonValue(event.target.value)
                            }
                            placeholder="Pl. szabadság, munka, vizsga..."
                            autoFocus
                          />

                          <div>
                            <button
                              type="button"
                              className="button"
                              disabled={savingId === absence.id}
                              onClick={() => saveReason(absence)}
                            >
                              {savingId === absence.id ? "Mentés..." : "Mentés"}
                            </button>

                            <button
                              type="button"
                              className="button button--secondary"
                              onClick={cancelEditing}
                            >
                              Mégse
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="admin-absence-row__reason-value"
                          onClick={() => startEditing(absence)}
                          title="Távollét okának szerkesztése"
                        >
                          {absence.reason || "Nincs megadva"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
