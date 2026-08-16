import { useEffect, useMemo, useState } from "react";

import PageHeader from "../components/ui/PageHeader";

import {
  getSeasons,
  getSeasonVpgCompetitions,
} from "../services/seasonService";

import { getSeasonStatistics } from "../services/vpgPlayerStatsService";
import "../styles/statistics.css";

function Statistics() {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("ALL");

  const [statistics, setStatistics] = useState(null);
  const [currentSeasonStatistics, setCurrentSeasonStatistics] = useState(null);
  const [clubRecords, setClubRecords] = useState(null);

  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingStatistics, setLoadingStatistics] = useState(false);
  const [loadingClubRecords, setLoadingClubRecords] = useState(false);

  const [error, setError] = useState("");

  const [sortConfig, setSortConfig] = useState({
    key: "points",
    direction: "desc",
  });

  /*
   * =========================================================
   * SEASONS
   * =========================================================
   */

  useEffect(() => {
    async function loadSeasons() {
      try {
        setLoadingSeasons(true);
        setError("");

        const data = await getSeasons();

        setSeasons(data);

        const currentSeason =
          data.find(
            (season) => season.status === "active" || season.status === "Aktív",
          ) ||
          data.find(
            (season) =>
              season.status === "upcoming" || season.status === "current",
          ) ||
          data[data.length - 1];

        if (currentSeason) {
          setSelectedSeasonId(String(currentSeason.id));
        }
      } catch (err) {
        console.error("Nem sikerült betölteni a szezonokat:", err);
        setError("Nem sikerült betölteni a szezonokat.");
      } finally {
        setLoadingSeasons(false);
      }
    }

    loadSeasons();
  }, []);

  /*
   * =========================================================
   * SELECTED SEASON
   * =========================================================
   */

  const selectedSeason = useMemo(() => {
    return seasons.find(
      (season) => String(season.id) === String(selectedSeasonId),
    );
  }, [seasons, selectedSeasonId]);

  /*
   * =========================================================
   * CURRENT SEASON
   * =========================================================
   */

  const currentSeason = useMemo(() => {
    if (seasons.length === 0) {
      return null;
    }

    return (
      seasons.find(
        (season) => season.status === "active" || season.status === "Aktív",
      ) ||
      seasons.find(
        (season) => season.status === "upcoming" || season.status === "current",
      ) ||
      seasons[seasons.length - 1]
    );
  }, [seasons]);

  /*
   * =========================================================
   * VPG COMPETITIONS
   * =========================================================
   */

  const competitions = useMemo(() => {
    if (!selectedSeason) {
      return [];
    }

    return getSeasonVpgCompetitions(selectedSeason);
  }, [selectedSeason]);

  /*
   * =========================================================
   * COMPETITION SELECTOR
   * =========================================================
   */

  useEffect(() => {
    setSelectedCompetitionId("ALL");
  }, [selectedSeasonId]);

  /*
   * =========================================================
   * SELECTED COMPETITION
   * =========================================================
   */

  const selectedCompetition = useMemo(() => {
    if (!selectedCompetitionId || selectedCompetitionId === "ALL") {
      return null;
    }

    return competitions.find(
      (competition) => String(competition.id) === String(selectedCompetitionId),
    );
  }, [competitions, selectedCompetitionId]);

  const selectedCompetitionLabel = useMemo(() => {
    if (selectedCompetitionId === "ALL") {
      return "Összes";
    }

    return (
      selectedCompetition?.shortName ||
      selectedCompetition?.name ||
      "Versenysorozat"
    );
  }, [selectedCompetitionId, selectedCompetition]);

  /*
   * =========================================================
   * LOAD MAIN STATISTICS
   * =========================================================
   */

  useEffect(() => {
    if (!selectedSeason) {
      setStatistics(null);
      return;
    }

    async function loadStatistics() {
      try {
        setLoadingStatistics(true);
        setError("");

        const data = await getSeasonStatistics({
          season: selectedSeason,
          competitionId: selectedCompetitionId,
          weekly: false,
        });

        setStatistics(data);
      } catch (err) {
        console.error("Nem sikerült betölteni a VPG statisztikákat:", err);

        setStatistics(null);

        setError(
          err?.message || "Nem sikerült betölteni a VPG statisztikákat.",
        );
      } finally {
        setLoadingStatistics(false);
      }
    }

    loadStatistics();
  }, [selectedSeason, selectedCompetitionId]);

  /*
   * =========================================================
   * CURRENT SEASON SCORERS / ASSISTS
   * =========================================================
   */

  useEffect(() => {
    if (!currentSeason) {
      setCurrentSeasonStatistics(null);
      return;
    }

    const isCurrentSeason =
      String(currentSeason.id) === String(selectedSeasonId);

    const isAll = selectedCompetitionId === "ALL";

    if (isCurrentSeason && isAll && statistics) {
      setCurrentSeasonStatistics(statistics);
      return;
    }

    async function loadCurrentSeasonStatistics() {
      try {
        const data = await getSeasonStatistics({
          season: currentSeason,
          competitionId: "ALL",
          weekly: false,
        });

        setCurrentSeasonStatistics(data);
      } catch (err) {
        console.error(
          "Nem sikerült betölteni az aktuális szezon góllövő/assist statisztikáit:",
          err,
        );

        setCurrentSeasonStatistics(null);
      }
    }

    loadCurrentSeasonStatistics();
  }, [currentSeason, selectedSeasonId, selectedCompetitionId, statistics]);

  /*
   * =========================================================
   * CLUB RECORDS / ALL TIME
   * =========================================================
   */

  useEffect(() => {
    if (seasons.length === 0) {
      setClubRecords(null);
      return;
    }

    async function loadClubRecords() {
      try {
        setLoadingClubRecords(true);

        const recordSeasons = seasons.filter(
          (season) =>
            season.status === "completed" ||
            season.status === "active" ||
            season.status === "Aktív" ||
            season.status === "current",
        );

        const seasonResults = await Promise.all(
          recordSeasons.map(async (season) => {
            try {
              const data = await getSeasonStatistics({
                season,
                competitionId: "ALL",
                weekly: false,
              });

              return data?.playerStats || [];
            } catch (err) {
              console.error(
                `Club Records: ${season.name} betöltési hiba:`,
                err,
              );
              return [];
            }
          }),
        );

        const playersByUsername = new Map();

        for (const seasonPlayers of seasonResults) {
          for (const player of seasonPlayers) {
            const key = String(player.username || "").toLowerCase();

            if (!key) continue;

            if (!playersByUsername.has(key)) {
              playersByUsername.set(key, {
                ...player,
                matchesPlayed: Number(player.matchesPlayed ?? 0),
                points: Number(player.points ?? 0),
                matchRating: Number(player.matchRating ?? 0),
                goals: Number(player.goals ?? 0),
                assists: Number(player.assists ?? 0),
                passesMade: Number(player.passesMade ?? 0),
                tacklesMade: Number(player.tacklesMade ?? 0),
                shots: Number(player.shots ?? 0),
                interceptions: Number(player.interceptions ?? 0),
                saves: Number(player.saves ?? 0),
                cleanSheet: Number(player.cleanSheet ?? 0),
              });
              continue;
            }

            const existing = playersByUsername.get(key);

            existing.matchesPlayed += Number(player.matchesPlayed ?? 0);
            existing.points += Number(player.points ?? 0);
            existing.matchRating += Number(player.matchRating ?? 0);
            existing.goals += Number(player.goals ?? 0);
            existing.assists += Number(player.assists ?? 0);
            existing.passesMade += Number(player.passesMade ?? 0);
            existing.tacklesMade += Number(player.tacklesMade ?? 0);
            existing.shots += Number(player.shots ?? 0);
            existing.interceptions += Number(player.interceptions ?? 0);
            existing.saves += Number(player.saves ?? 0);
            existing.cleanSheet += Number(player.cleanSheet ?? 0);
          }
        }

        setClubRecords([...playersByUsername.values()]);
      } catch (err) {
        console.error("Club Records betöltési hiba:", err);
        setClubRecords([]);
      } finally {
        setLoadingClubRecords(false);
      }
    }

    loadClubRecords();
  }, [seasons]);

  const allTimeRecords = useMemo(() => {
    if (!clubRecords?.length) return [];

    const definitions = [
      ["matchesPlayed", "Legtöbb mérkőzés", "🏟️", 0, " meccs"],
      ["points", "Legtöbb pont", "🏆", 1, ""],
      ["matchRating", "Legtöbb összes rating", "⭐", 1, ""],
      ["goals", "Legtöbb gól", "⚽", 0, " gól"],
      ["assists", "Legtöbb assist", "🎯", 0, " assist"],
      ["passesMade", "Legtöbb passz", "↗️", 0, " passz"],
      ["tacklesMade", "Legtöbb szerelés", "🛡️", 0, " szerelés"],
      ["interceptions", "Legtöbb interception", "🧱", 0, ""],
      ["shots", "Legtöbb lövés", "🎯", 0, " lövés"],
      ["saves", "Legtöbb védés", "🧤", 0, " save"],
      ["cleanSheet", "Legtöbb clean sheet", "🧤", 0, ""],
    ];

    return definitions
      .map(([key, label, icon, decimals, suffix]) => {
        const player = clubRecords.reduce((best, current) => {
          if (!best) return current;

          return Number(current[key] ?? 0) > Number(best[key] ?? 0)
            ? current
            : best;
        }, null);

        if (!player) return null;

        const value = Number(player[key] ?? 0);
        if (value <= 0) return null;

        return { key, label, icon, decimals, suffix, player, value };
      })
      .filter(Boolean);
  }, [clubRecords]);

  /*
   * =========================================================
   * MAIN PLAYER STATS
   * =========================================================
   */

  const playerStats = statistics?.playerStats || [];

  /*
   * =========================================================
   * SORTING
   * =========================================================
   */

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "desc",
      };
    });
  };

  const sortedPlayerStats = useMemo(() => {
    const sorted = [...playerStats];

    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      /*
       * Szöveges mező
       */
      if (sortConfig.key === "username") {
        return (
          String(aValue || "").localeCompare(String(bValue || ""), "hu") *
          (sortConfig.direction === "asc" ? 1 : -1)
        );
      }

      /*
       * Null értékek mindig a lista végére kerülnek.
       */
      if (aValue == null && bValue == null) {
        return 0;
      }

      if (aValue == null) {
        return 1;
      }

      if (bValue == null) {
        return -1;
      }

      const numericA = Number(aValue);
      const numericB = Number(bValue);

      if (Number.isFinite(numericA) && Number.isFinite(numericB)) {
        return (
          (numericA - numericB) * (sortConfig.direction === "asc" ? 1 : -1)
        );
      }

      return (
        String(aValue).localeCompare(String(bValue), "hu") *
        (sortConfig.direction === "asc" ? 1 : -1)
      );
    });

    return sorted;
  }, [playerStats, sortConfig]);

  /*
   * =========================================================
   * SORT INDICATOR
   * =========================================================
   */

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return "↕";
    }

    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  /*
   * =========================================================
   * CURRENT SEASON SCORERS / ASSISTS
   * =========================================================
   */

  const currentSeasonTopScorers = currentSeasonStatistics?.topScorers || [];

  const currentSeasonTopAssists = currentSeasonStatistics?.topAssists || [];

  /*
   * =========================================================
   * TOP VALUES
   * =========================================================
   */

  const maxGoals = Math.max(
    1,
    ...currentSeasonTopScorers.map((player) => player.goals ?? 0),
  );

  const maxAssists = Math.max(
    1,
    ...currentSeasonTopAssists.map((player) => player.assists ?? 0),
  );

  /*
   * =========================================================
   * TOTALS
   * =========================================================
   */

  const totalGoals = currentSeasonTopScorers.reduce(
    (sum, player) => sum + (player.goals ?? 0),
    0,
  );

  const totalAssists = currentSeasonTopAssists.reduce(
    (sum, player) => sum + (player.assists ?? 0),
    0,
  );

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Performance center"
        title="Statisztikák"
        description="Csapat- és játékosmutatók."
      />

      {/* =====================================================
          SEASON / COMPETITION
          ===================================================== */}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">VPG statistics</p>
            <h3>Szezon és versenysorozat</h3>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "1rem",
          }}
        >
          <label>
            <span
              className="muted"
              style={{
                display: "block",
                marginBottom: "0.4rem",
              }}
            >
              Szezon
            </span>

            <select
              value={selectedSeasonId}
              onChange={(event) => setSelectedSeasonId(event.target.value)}
              disabled={loadingSeasons}
              style={{
                width: "100%",
              }}
            >
              {loadingSeasons ? (
                <option>Szezonok betöltése...</option>
              ) : (
                seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                    {String(season.id) === String(currentSeason?.id)
                      ? " • Aktuális"
                      : ""}
                  </option>
                ))
              )}
            </select>
          </label>

          <label>
            <span
              className="muted"
              style={{
                display: "block",
                marginBottom: "0.4rem",
              }}
            >
              Versenysorozat
            </span>

            <select
              value={selectedCompetitionId}
              onChange={(event) => setSelectedCompetitionId(event.target.value)}
              disabled={competitions.length === 0 || loadingStatistics}
              style={{
                width: "100%",
              }}
            >
              {competitions.length === 0 ? (
                <option>Nincs VPG versenysorozat</option>
              ) : (
                <>
                  <option value="ALL">Összes</option>

                  {competitions.map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {competition.shortName || competition.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
        </div>

        {selectedSeason && (
          <div
            className="muted"
            style={{
              marginTop: "1rem",
            }}
          >
            {selectedCompetition
              ? `${selectedCompetition.name} • ${
                  selectedCompetition.division || ""
                }`
              : `${selectedSeason.name} • ${selectedCompetitionLabel}`}
          </div>
        )}

        {selectedCompetition && (
          <div
            className="muted"
            style={{
              marginTop: "0.35rem",
            }}
          >
            VPG season {selectedCompetition.vpg?.seasonId}
          </div>
        )}
      </section>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <section className="panel">
          <p className="muted">{error}</p>
        </section>
      )}

      {/* =====================================================
          LOADING
          ===================================================== */}

      {loadingStatistics && (
        <section className="panel">
          <p className="muted">VPG statisztikák betöltése...</p>
        </section>
      )}

      {/* =====================================================
          CONTENT
          ===================================================== */}

      {!loadingStatistics && !error && statistics && (
        <>
          {/* =================================================
              MAIN PLAYER STATISTICS
              ================================================= */}

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Player performance</p>

                <h3>Fő statisztikák</h3>
              </div>

              <span className="muted">{playerStats.length} játékos</span>
            </div>

            {playerStats.length === 0 ? (
              <p className="muted">Nincs elérhető játékosstatisztika.</p>
            ) : (
              <div className="statistics-table-wrapper">
                <table className="statistics-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("username")}>
                        Játékos{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("username")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("matchesPlayed")}>
                        Meccs{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("matchesPlayed")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("points")}>
                        Pont{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("points")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("matchRating")}>
                        Rating{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("matchRating")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("goals")}>
                        Gól{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("goals")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("assists")}>
                        Assist{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("assists")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("passesMade")}>
                        Passz{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("passesMade")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("tacklesMade")}>
                        Szerelés{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("tacklesMade")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("shots")}>
                        Lövés{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("shots")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("interceptions")}>
                        Interception{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("interceptions")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("saves")}>
                        Save{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("saves")}
                        </span>
                      </th>

                      <th onClick={() => handleSort("cleanSheet")}>
                        Clean sheet{" "}
                        <span className="sort-indicator">
                          {getSortIndicator("cleanSheet")}
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedPlayerStats.map((player, index) => (
                      <tr key={`${player.username}-${index}`}>
                        <td>
                          <strong>{player.username}</strong>
                        </td>

                        <td>{player.matchesPlayed}</td>

                        <td>
                          <strong>
                            {Number(player.points ?? 0).toFixed(1)}
                          </strong>
                        </td>

                        <td>
                          {player.matchRating != null
                            ? Number(player.matchRating).toFixed(1)
                            : "–"}
                        </td>

                        <td>{player.goals ?? "–"}</td>

                        <td>{player.assists ?? "–"}</td>

                        <td>{player.passesMade ?? "–"}</td>

                        <td>{player.tacklesMade ?? "–"}</td>

                        <td>{player.shots ?? "–"}</td>

                        <td>{player.interceptions ?? "–"}</td>

                        <td>{player.saves ?? "–"}</td>

                        <td>{player.cleanSheet ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* =================================================
              CURRENT SEASON GOAL + ASSIST
              ================================================= */}

          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Aktuális szezon</p>

                  <h3>Házi góllövőlista</h3>
                </div>
              </div>

              <p
                className="muted"
                style={{
                  marginBottom: "1rem",
                }}
              >
                {currentSeason?.name || "Aktuális szezon"}
              </p>

              {currentSeasonTopScorers.length === 0 ? (
                <p className="muted">Nincs góllövőadat.</p>
              ) : (
                <div className="chart-list">
                  {currentSeasonTopScorers.slice(0, 10).map((player, index) => (
                    <div
                      className="chart-row"
                      key={`${player.username}-${index}`}
                    >
                      <span>
                        {index + 1}. {player.username}
                      </span>

                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${((player.goals ?? 0) / maxGoals) * 100}%`,
                          }}
                        />
                      </div>

                      <strong>{player.goals ?? 0}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Aktuális szezon</p>

                  <h3>Házi assistlista</h3>
                </div>
              </div>

              <p
                className="muted"
                style={{
                  marginBottom: "1rem",
                }}
              >
                {currentSeason?.name || "Aktuális szezon"}
              </p>

              {currentSeasonTopAssists.length === 0 ? (
                <p className="muted">Nincs assistadat.</p>
              ) : (
                <div className="chart-list">
                  {currentSeasonTopAssists.slice(0, 10).map((player, index) => (
                    <div
                      className="chart-row"
                      key={`${player.username}-${index}`}
                    >
                      <span>
                        {index + 1}. {player.username}
                      </span>

                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${
                              ((player.assists ?? 0) / maxAssists) * 100
                            }%`,
                          }}
                        />
                      </div>

                      <strong>{player.assists ?? 0}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          {/* =================================================
              SUMMARY
              ================================================= */}

          <section className="dashboard-grid">
            <article className="panel">
              <p className="eyebrow">Szezon összesítés</p>

              <h3>Teljesítménymutatók</h3>

              <div className="metric-list">
                <div>
                  <span>Statisztikázott játékosok</span>

                  <strong>{playerStats.length}</strong>
                </div>

                <div>
                  <span>Aktuális szezon góljai</span>

                  <strong>{totalGoals}</strong>
                </div>

                <div>
                  <span>Aktuális szezon assistjai</span>

                  <strong>{totalAssists}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <p className="eyebrow">Kiválasztott adatok</p>

              <h3>{selectedSeason?.name}</h3>

              <div className="metric-list">
                <div>
                  <span>Versenysorozat</span>

                  <strong>{selectedCompetitionLabel}</strong>
                </div>

                <div>
                  <span>VPG competitionek</span>

                  <strong>{statistics.competitions?.length ?? 0}</strong>
                </div>

                <div>
                  <span>VPG szezon</span>

                  <strong>
                    {selectedCompetition?.vpg?.seasonId ??
                      (statistics.competitions?.length === 1
                        ? statistics.competitions[0].vpgSeasonId
                        : "ALL")}
                  </strong>
                </div>
              </div>
            </article>
          </section>

          {/* =================================================
              CLUB RECORDS / ALL TIME
              ================================================= */}

          <section className="panel club-records-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">All Time</p>
                <h3>🏆 Club Records</h3>
              </div>

              <span className="muted">Ball of Duty klubtörténet</span>
            </div>

            <div className="club-records-intro">
              A klub teljes történetének legjobb egyéni teljesítményei.
            </div>

            {loadingClubRecords ? (
              <p className="muted club-records-empty">
                Klubrekordok betöltése...
              </p>
            ) : allTimeRecords.length === 0 ? (
              <p className="muted club-records-empty">
                Még nincs elérhető all time statisztika.
              </p>
            ) : (
              <div className="club-records-grid">
                {allTimeRecords.map((record) => (
                  <article className="club-record" key={record.key}>
                    <div className="club-record__icon">{record.icon}</div>

                    <div className="club-record__content">
                      <span className="club-record__label">{record.label}</span>

                      <strong className="club-record__player">
                        {record.player.username}
                      </strong>

                      <span className="club-record__value">
                        {record.value.toFixed(record.decimals)}
                        {record.suffix}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Statistics;
