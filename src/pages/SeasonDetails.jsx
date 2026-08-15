import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getSeasonById } from "../services/seasonService";
import { getBodLeagueStats } from "../services/vpgLeagueService";

function formatDate(date) {
  if (!date) {
    return "Folyamatban";
  }

  return new Date(date).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getCompetitionStats(competition) {
  return {
    played: competition?.stats?.played || 0,
    wins: competition?.stats?.wins || 0,
    draws: competition?.stats?.draws || 0,
    losses: competition?.stats?.losses || 0,
    goalsFor: competition?.stats?.goalsFor || 0,
    goalsAgainst: competition?.stats?.goalsAgainst || 0,
  };
}

function getStatusLabel(status) {
  if (status === "completed") {
    return "Lezárt";
  }

  if (status === "active") {
    return "Aktív";
  }

  return "Közelgő";
}

function getStatusClass(status) {
  if (status === "active") {
    return "status-pill status-pill--success";
  }

  if (status === "upcoming") {
    return "status-pill status-pill--upcoming";
  }

  return "status-pill";
}

function SeasonDetails() {
  const { seasonId } = useParams();

  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [vpgStandings, setVpgStandings] = useState({});
  const [vpgLoading, setVpgLoading] = useState(false);
  const [vpgError, setVpgError] = useState("");

  /*
   * =========================================
   * SEASON BETÖLTÉSE
   * =========================================
   */

  useEffect(() => {
    async function loadSeason() {
      try {
        setLoading(true);
        setError("");

        const data = await getSeasonById(seasonId);

        console.log("SEASON DETAILS:", data);

        if (!data) {
          setError("A szezon nem található.");
          return;
        }

        setSeason(data);
      } catch (loadError) {
        console.error("Szezon részletek betöltési hiba:", loadError);

        setError("Nem sikerült betölteni a szezon adatait.");
      } finally {
        setLoading(false);
      }
    }

    loadSeason();
  }, [seasonId]);

  /*
   * =========================================
   * VPG TABELLÁK BETÖLTÉSE
   * =========================================
   */

  useEffect(() => {
    if (!season || season.status === "completed") {
      return;
    }

    console.log("SEASON STATUS:", season.status);

    console.log("SEASON COMPETITIONS:", season.competitions);

    const vpgCompetitions =
      season.competitions?.filter(
        (competition) =>
          competition.type === "league" &&
          competition.vpgLeagueSlug &&
          competition.vpgSeasonId,
      ) || [];

    console.log("VPG COMPETITIONS:", vpgCompetitions);

    if (vpgCompetitions.length === 0) {
      console.log("Nincs VPG league competition.");

      setVpgStandings({});
      return;
    }

    async function loadVpgData() {
      try {
        setVpgLoading(true);
        setVpgError("");

        const results = await Promise.all(
          vpgCompetitions.map(async (competition) => {
            console.log(
              "VPG REQUEST:",
              competition.name,
              competition.vpgLeagueSlug,
              competition.vpgSeasonId,
            );

            /*
             * A service már tudja:
             *
             * - melyik VPG league-et kell lekérni
             * - melyik VPG seasonhöz tartozik
             * - hogyan kell normalizálni a választ
             */
            const standings = await getBodLeagueStats(competition);

            console.log("VPG STANDINGS:", competition.name, standings);

            return {
              competitionId: competition.id,
              standings,
            };
          }),
        );

        const standingsMap = {};

        results.forEach((result) => {
          standingsMap[result.competitionId] = result.standings;
        });

        console.log("VPG STANDINGS MAP:", standingsMap);

        setVpgStandings(standingsMap);
      } catch (loadError) {
        console.error("VPG tabella betöltési hiba:", loadError);

        setVpgError("A VPG tabella jelenleg nem érhető el.");

        setVpgStandings({});
      } finally {
        setVpgLoading(false);
      }
    }

    loadVpgData();
  }, [season]);

  /*
   * =========================================
   * LOADING
   * =========================================
   */

  if (loading) {
    return (
      <div className="page-stack">
        <section className="panel crud-state">Szezon betöltése...</section>
      </div>
    );
  }

  /*
   * =========================================
   * ERROR
   * =========================================
   */

  if (error || !season) {
    return (
      <div className="page-stack">
        <section className="panel">
          <p className="error-message">{error || "A szezon nem található."}</p>

          <Link className="button" to="/seasons">
            ← Vissza a szezonokhoz
          </Link>
        </section>
      </div>
    );
  }

  const isCompleted = season.status === "completed";

  return (
    <div className="page-stack">
      {/* =========================================
          HEADER
          ========================================= */}

      <section className="panel season-details__hero">
        <div>
          <Link className="season-details__back" to="/seasons">
            ← Szezonok
          </Link>

          <p className="eyebrow">
            {isCompleted ? "Season archive" : "Current season"}
          </p>

          <h2>{season.name}</h2>

          <p className="season-details__period">
            {formatDate(season.period?.start)}
            {" – "}
            {formatDate(season.period?.end)}
          </p>
        </div>

        <span className={getStatusClass(season.status)}>
          {getStatusLabel(season.status)}
        </span>
      </section>

      {/* =========================================
          COMPETITIONS
          ========================================= */}

      <section>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Competitions</p>

            <h3>Versenysorozatok</h3>
          </div>
        </div>

        <div className="season-details__competitions">
          {season.competitions?.map((competition) => {
            const localStats = getCompetitionStats(competition);

            /*
             * A VPG service által visszaadott
             * normalizált tabella.
             */
            const standings = vpgStandings[competition.id] || [];

            /*
             * Ball of Duty keresése
             * a VPG tabellában.
             *
             * A VPG adatban:
             * teamName = "Ball of Duty CF"
             * abbreviation = "PFC"
             * slug = "pannonia-fc"
             */
            const bodStanding =
              !isCompleted && standings.length > 0
                ? standings.find(
                    (team) =>
                      team.teamName === "Ball of Duty CF" ||
                      team.abbreviation === "PFC" ||
                      team.slug === "pannonia-fc",
                  )
                : null;

            /*
             * Ha van VPG adat,
             * abból használjuk a statisztikát.
             *
             * Ha nincs,
             * marad a Firebase static stats.
             */
            const stats =
              !isCompleted && bodStanding
                ? {
                    played: bodStanding.played,
                    wins: bodStanding.wins,
                    draws: bodStanding.draws,
                    losses: bodStanding.losses,
                    goalsFor: bodStanding.goalsFor,
                    goalsAgainst: bodStanding.goalsAgainst,
                  }
                : localStats;

            return (
              <article
                className="panel season-details__competition"
                key={competition.id}
              >
                {/* =================================
                      COMPETITION HEADER
                      ================================= */}

                <div className="season-details__competition-header">
                  <div>
                    <span className="eyebrow">
                      {competition.type === "cup" ? "🏆 Kupa" : "⚽ Liga"}
                    </span>

                    <h3>{competition.name}</h3>

                    {competition.division && <p>{competition.division}</p>}
                  </div>

                  {isCompleted && competition.placement && (
                    <div className="season-details__placement">
                      <span>HELYEZÉS</span>

                      <strong>{competition.placement}.</strong>
                    </div>
                  )}

                  {!isCompleted && bodStanding?.position && (
                    <div className="season-details__placement">
                      <span>AKTUÁLIS HELYEZÉS</span>

                      <strong>{bodStanding.position}.</strong>
                    </div>
                  )}
                </div>

                {/* =================================
                      CUP RESULT
                      ================================= */}

                {isCompleted && competition.type === "cup" && (
                  <div className="season-details__cup-result">
                    <span>{competition.stage}</span>

                    {competition.result && (
                      <strong>{competition.result}</strong>
                    )}

                    {competition.eliminatedBy && (
                      <small>Kiesés: {competition.eliminatedBy}</small>
                    )}
                  </div>
                )}

                {/* =================================
                      LEAGUE STATS
                      ================================= */}

                {competition.type === "league" && (
                  <div className="season-details__stats">
                    <div>
                      <strong>{stats.played}</strong>

                      <span>MECCS</span>
                    </div>

                    <div>
                      <strong className="season-stat--win">{stats.wins}</strong>

                      <span>GYŐZELEM</span>
                    </div>

                    <div>
                      <strong>{stats.draws}</strong>

                      <span>DÖNTETLEN</span>
                    </div>

                    <div>
                      <strong className="season-stat--loss">
                        {stats.losses}
                      </strong>

                      <span>VERESÉG</span>
                    </div>

                    <div>
                      <strong>{stats.goalsFor}</strong>

                      <span>LŐTT</span>
                    </div>

                    <div>
                      <strong>{stats.goalsAgainst}</strong>

                      <span>KAPOTT</span>
                    </div>
                  </div>
                )}

                {/* =================================
                      VPG STANDINGS
                      ================================= */}

                {!isCompleted &&
                  competition.type === "league" &&
                  competition.vpgLeagueSlug && (
                    <div className="season-details__standings">
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">VPG</p>

                          <h4>Aktuális tabella</h4>
                        </div>
                      </div>

                      {vpgLoading && (
                        <div className="season-details__standings-empty">
                          <span>📊</span>

                          <p>VPG tabella betöltése...</p>
                        </div>
                      )}

                      {!vpgLoading && vpgError && (
                        <div className="season-details__standings-empty">
                          <span>⚠️</span>

                          <p>{vpgError}</p>
                        </div>
                      )}

                      {!vpgLoading && !vpgError && standings.length > 0 && (
                        <div className="season-details__table-wrapper">
                          <table className="season-details__table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Csapat</th>
                                <th>M</th>
                                <th>GY</th>
                                <th>D</th>
                                <th>V</th>
                                <th>LG</th>
                                <th>KG</th>
                                <th>P</th>
                              </tr>
                            </thead>

                            <tbody>
                              {standings.map((team) => {
                                const isBod =
                                  team.teamName === "Ball of Duty CF" ||
                                  team.abbreviation === "PFC" ||
                                  team.slug === "pannonia-fc";

                                return (
                                  <tr
                                    key={team.slug || team.teamName}
                                    className={
                                      isBod
                                        ? "season-details__table-row--bod"
                                        : ""
                                    }
                                  >
                                    <td>
                                      <strong>{team.position}</strong>
                                    </td>

                                    <td>
                                      <div className="season-details__team">
                                        {team.logo ? (
                                          <img src={team.logo} alt="" />
                                        ) : (
                                          <span>⚽</span>
                                        )}

                                        <span>{team.teamName}</span>
                                      </div>
                                    </td>

                                    <td>{team.played}</td>

                                    <td>{team.wins}</td>

                                    <td>{team.draws}</td>

                                    <td>{team.losses}</td>

                                    <td>{team.goalsFor}</td>

                                    <td>{team.goalsAgainst}</td>

                                    <td>
                                      <strong>{team.points}</strong>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {!vpgLoading && !vpgError && standings.length === 0 && (
                        <div className="season-details__standings-empty">
                          <span>📊</span>

                          <p>Még nincs elérhető tabella.</p>
                        </div>
                      )}
                    </div>
                  )}
              </article>
            );
          })}
        </div>
      </section>

      {/* =========================================
          AWARDS
          ========================================= */}

      {isCompleted && season.awards?.seasonPlayerPodium?.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Season awards</p>

              <h3>Szezon játékosai</h3>
            </div>
          </div>

          <div className="season-details__podium">
            {season.awards.seasonPlayerPodium.map((player) => (
              <div
                className="season-details__podium-player"
                key={player.placement}
              >
                <span>
                  {player.placement === 1
                    ? "🥇"
                    : player.placement === 2
                      ? "🥈"
                      : "🥉"}
                </span>

                <strong>{player.nickname}</strong>

                <small>{player.playerName}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================================
          MILESTONES
          ========================================= */}

      {isCompleted && season.milestones?.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Season milestones</p>

              <h3>Mérföldkövek</h3>
            </div>
          </div>

          <div className="season-details__milestones">
            {season.milestones.map((milestone, index) => (
              <div key={index} className="season-details__milestone">
                <span>✓</span>

                <p>{milestone}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default SeasonDetails;
