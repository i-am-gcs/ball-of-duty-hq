import { useMemo, useState } from "react";

function formatDate(dateString) {
  if (!dateString) return "-";

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

export default function AdminAbsencePanel({ absences, players }) {
  const [selectedDate, setSelectedDate] = useState("");

  const playerMap = useMemo(() => {
    return Object.fromEntries(players.map((player) => [player.id, player]));
  }, [players]);

  const enrichedAbsences = useMemo(() => {
    return [...absences]
      .map((absence) => ({
        ...absence,
        player: playerMap[absence.playerId],
      }))
      .sort((a, b) => {
        return a.startDate.localeCompare(b.startDate);
      });
  }, [absences, playerMap]);

  const selectedDayAbsences = useMemo(() => {
    if (!selectedDate) return [];

    return enrichedAbsences.filter((absence) =>
      isDateInAbsence(selectedDate, absence),
    );
  }, [selectedDate, enrichedAbsences]);

  const upcomingAbsences = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return enrichedAbsences.filter((absence) => absence.endDate >= today);
  }, [enrichedAbsences]);

  return (
    <section className="admin-absence-panel">
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

      <div className="admin-absence-panel__content">
        <div className="admin-absence-panel__calendar">
          <div className="admin-absence-panel__calendar-header">
            <h3>Nap ellenőrzése</h3>
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
                  {selectedDayAbsences.map((absence) => (
                    <div key={absence.id} className="admin-absence-player">
                      <div className="admin-absence-player__avatar">
                        {absence.player?.avatarUrl ? (
                          <img src={absence.player.avatarUrl} alt="" />
                        ) : (
                          (
                            absence.player?.nickname ||
                            absence.player?.name ||
                            "?"
                          )
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="admin-absence-player__info">
                        <strong>
                          {absence.player?.nickname ||
                            absence.player?.name ||
                            "Ismeretlen játékos"}
                        </strong>

                        <span>
                          {formatDate(absence.startDate)} –{" "}
                          {formatDate(absence.endDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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

          {upcomingAbsences.length === 0 ? (
            <div className="admin-absence-panel__empty">
              <span>✓</span>
              <strong>Nincs bejelentett távollét</strong>
              <p>Jelenleg minden játékos elérhetőnek jelölte magát.</p>
            </div>
          ) : (
            <div className="admin-absence-list">
              {upcomingAbsences.map((absence) => {
                const player = absence.player;

                return (
                  <div key={absence.id} className="admin-absence-row">
                    <div className="admin-absence-row__player">
                      <div className="admin-absence-row__avatar">
                        {player?.avatarUrl ? (
                          <img src={player.avatarUrl} alt="" />
                        ) : (
                          (player?.nickname || player?.name || "?")
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div>
                        <strong>
                          {player?.nickname ||
                            player?.name ||
                            "Ismeretlen játékos"}
                        </strong>

                        <span>
                          {player?.name && player.nickname !== player.name
                            ? player.name
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div className="admin-absence-row__dates">
                      <strong>{formatDate(absence.startDate)}</strong>

                      <span>{formatDate(absence.endDate)}</span>
                    </div>

                    <div className="admin-absence-row__days">
                      <strong>
                        {getDays(absence.startDate, absence.endDate)}
                      </strong>
                      <span>nap</span>
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
