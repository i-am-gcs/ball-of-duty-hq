import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getSeasonById } from "../services/seasonService";
import { getBodLeagueStats } from "../services/vpgLeagueService";

import {
  getVpgCompetitionMatchesNormalized,
  getVpgCompetitionCompletedMatches,
} from "../services/vpgMatchService";

import SeasonStatistics from "../components/seasons/SeasonStatistics";

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

function formatMatchDate(date) {
  if (!date) {
    return "-";
  }

  return new Date(date).toLocaleDateString("hu-HU", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatMatchTime(date) {
  if (!date) {
    return "-";
  }

  return new Date(date).toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCompetitionStats(competition) {
  return {
    played: competition?.stats?.played ?? 0,
    wins: competition?.stats?.wins ?? 0,
    draws: competition?.stats?.draws ?? 0,
    losses: competition?.stats?.losses ?? 0,
    goalsFor: competition?.stats?.goalsFor ?? 0,
    goalsAgainst: competition?.stats?.goalsAgainst ?? 0,
  };
}

function getStandingRowClass(standing) {
  const teamName = standing?.teamName?.trim().toLowerCase();

  if (teamName === "ball of duty cf") {
    return "season-details__table-row--bod";
  }

  if (standing.position === 1) {
    return "season-details__table-row--first";
  }

  if (standing.position === 2) {
    return "season-details__table-row--second";
  }

  if (standing.position === 3) {
    return "season-details__table-row--third";
  }

  return "";
}

function formatGoalDifference(goalsFor, goalsAgainst) {
  const difference = goalsFor - goalsAgainst;

  if (difference > 0) {
    return `+${difference}`;
  }

  return difference;
}

function getMatchResultLabel(result) {
  if (result === "win") {
    return "GYŐZELEM";
  }

  if (result === "loss") {
    return "VERESÉG";
  }

  return "DÖNTETLEN";
}

function getMatchResultClass(result) {
  if (result === "win") {
    return "season-details__result--win";
  }

  if (result === "loss") {
    return "season-details__result--loss";
  }

  return "season-details__result--draw";
}

function getCompetitionTypeLabel(competition) {
  if (competition.type === "cup") {
    return "🏆 Kupa";
  }

  return "⚽ Liga";
}

function SeasonDetails() {
  const { seasonId } = useParams();

  const [season, setSeason] = useState(null);

  const [vpgStandings, setVpgStandings] = useState({});
  const [vpgMatches, setVpgMatches] = useState({});
  const [vpgResults, setVpgResults] = useState({});

  const [loading, setLoading] = useState(true);

  const [vpgLoading, setVpgLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [error, setError] = useState("");
  const [vpgError, setVpgError] = useState("");
  const [matchesError, setMatchesError] = useState("");
  const [resultsError, setResultsError] = useState("");

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
   * VPG VERSENYSOROZATOK
   * =========================================
   *
   * Minden olyan competition VPG competition,
   * amelyhez tartozik VPG seasonId.
   *
   * Így:
   *
   * BSL        -> league
   * Balkan Cup -> cup
   *
   * külön competitionként kezelhető.
   */

  const vpgCompetitions = useMemo(() => {
    return (
      season?.competitions?.filter((competition) =>
        Boolean(competition.vpg?.seasonId),
      ) || []
    );
  }, [season]);

  /*
   * Csak a ligákhoz kell VPG tabella.
   */

  const vpgLeagueCompetitions = useMemo(() => {
    return vpgCompetitions.filter(
      (competition) => competition.type === "league",
    );
  }, [vpgCompetitions]);

  /*
   * =========================================
   * VPG TABELLÁK
   * =========================================
   */

  useEffect(() => {
    if (vpgLeagueCompetitions.length === 0) {
      setVpgStandings({});
      setVpgError("");
      return;
    }

    async function loadVpgData() {
      try {
        setVpgLoading(true);
        setVpgError("");

        const results = await Promise.all(
          vpgLeagueCompetitions.map(async (competition) => {
            const vpgCompetition = {
              ...competition,

              vpgLeagueSlug: competition.vpg?.leagueSlug || "",
              vpgSeasonId: competition.vpg?.seasonId || null,

              vpgIsHistory: false,
            };

            const standings = await getBodLeagueStats(vpgCompetition);

            return {
              competitionId: competition.id,
              standings,
            };
          }),
        );

        const standingsByCompetition = results.reduce((accumulator, result) => {
          accumulator[result.competitionId] = result.standings;

          return accumulator;
        }, {});

        setVpgStandings(standingsByCompetition);
      } catch (loadError) {
        console.error("VPG tabella betöltési hiba:", loadError);

        setVpgError("A VPG tabella jelenleg nem érhető el.");
      } finally {
        setVpgLoading(false);
      }
    }

    loadVpgData();
  }, [vpgLeagueCompetitions]);

  /*
   * =========================================
   * VPG KÖVETKEZŐ MECCSEK
   * =========================================
   *
   * FONTOS:
   *
   * Nem seasonId alapján kérjük le egyszer
   * az összes meccset.
   *
   * Competition alapján kérjük le őket.
   *
   * Ez különíti el:
   *
   * BSL
   * Balkan Cup
   */

  useEffect(() => {
    if (vpgCompetitions.length === 0) {
      setVpgMatches({});
      setMatchesError("");
      return;
    }

    async function loadVpgMatches() {
      try {
        setMatchesLoading(true);
        setMatchesError("");

        const results = await Promise.all(
          vpgCompetitions.map(async (competition) => {
            const matches =
              await getVpgCompetitionMatchesNormalized(competition);

            return {
              competitionId: competition.id,
              matches,
            };
          }),
        );

        const matchesByCompetition = results.reduce((accumulator, result) => {
          accumulator[result.competitionId] = result.matches;

          return accumulator;
        }, {});

        setVpgMatches(matchesByCompetition);

        console.log(
          "VPG SEASON MATCHES:",
          Object.values(matchesByCompetition).flat().length,
        );
      } catch (loadError) {
        console.error("VPG meccsek betöltési hiba:", loadError);

        setMatchesError("A VPG mérkőzések jelenleg nem érhetők el.");
      } finally {
        setMatchesLoading(false);
      }
    }

    loadVpgMatches();
  }, [vpgCompetitions]);

  /*
   * =========================================
   * VPG LEJÁTSZOTT MECCSEK
   * =========================================
   */

  useEffect(() => {
    if (vpgCompetitions.length === 0) {
      setVpgResults({});
      setResultsError("");
      return;
    }

    async function loadVpgResults() {
      try {
        setResultsLoading(true);
        setResultsError("");

        const results = await Promise.all(
          vpgCompetitions.map(async (competition) => {
            const matches =
              await getVpgCompetitionCompletedMatches(competition);

            return {
              competitionId: competition.id,
              matches,
            };
          }),
        );

        const resultsByCompetition = results.reduce((accumulator, result) => {
          accumulator[result.competitionId] = result.matches;

          return accumulator;
        }, {});

        setVpgResults(resultsByCompetition);

        console.log(
          "VPG BOD COMPLETED RESULTS:",
          Object.values(resultsByCompetition).flat(),
        );
      } catch (loadError) {
        console.error("VPG eredmények betöltési hiba:", loadError);

        setResultsError("A VPG eredmények jelenleg nem érhetők el.");
      } finally {
        setResultsLoading(false);
      }
    }

    loadVpgResults();
  }, [vpgCompetitions]);

  /*
   * =========================================
   * KÖVETKEZŐ MECCSEK
   * =========================================
   */

  const upcomingMatches = useMemo(() => {
    const now = new Date();

    return vpgCompetitions
      .flatMap((competition) => {
        const matches = vpgMatches[competition.id] || [];

        return matches.map((match) => ({
          ...match,
          competitionId: competition.id,
          competitionName: competition.name,
          competitionShortName: competition.shortName,
        }));
      })
      .filter((match) => {
        if (!match.datetime) {
          return false;
        }

        return new Date(match.datetime) >= now;
      })
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .slice(0, 5);
  }, [vpgCompetitions, vpgMatches]);

  /*
   * =========================================
   * LEJÁTSZOTT EREDMÉNYEK
   * =========================================
   */

  const completedMatches = useMemo(() => {
    return vpgCompetitions
      .flatMap((competition) => {
        const matches = vpgResults[competition.id] || [];

        return matches.map((match) => ({
          ...match,
          competitionId: competition.id,
          competitionName: competition.name,
          competitionShortName: competition.shortName,
        }));
      })
      .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
      .slice(0, 5);
  }, [vpgCompetitions, vpgResults]);

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

  /*
   * =========================================
   * SEASON STATISTICS
   * =========================================
   */

  const competitionsWithStats =
    season.competitions?.filter((competition) => competition.stats) || [];

  /*
   * =========================================
   * RENDER
   * =========================================
   */

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

        <span
          className={`status-pill ${
            season.status === "active"
              ? "status-pill--success"
              : season.status === "upcoming"
                ? "status-pill--upcoming"
                : ""
          }`}
        >
          {season.status === "completed"
            ? "Lezárt"
            : season.status === "active"
              ? "Aktív"
              : "Közelgő"}
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
            const stats = getCompetitionStats(competition);

            const standings = vpgStandings[competition.id] || [];

            const hasVpg =
              competition.type === "league" &&
              Boolean(competition.vpg?.seasonId);

            const competitionMatches = vpgMatches[competition.id] || [];

            const competitionResults = vpgResults[competition.id] || [];

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
                      {getCompetitionTypeLabel(competition)}
                    </span>

                    <h3>{competition.name}</h3>

                    {competition.division && <p>{competition.division}</p>}
                  </div>

                  {competition.placement && (
                    <div className="season-details__placement">
                      <span>HELYEZÉS</span>

                      <strong>{competition.placement}.</strong>
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

                {hasVpg && (
                  <div className="season-details__standings">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">VPG</p>

                        <h4>
                          {isCompleted
                            ? "Szezon végi tabella"
                            : "Aktuális tabella"}
                        </h4>
                      </div>

                      {standings.length > 0 && (
                        <span className="season-statistics__competition-count">
                          {standings.length} csapat
                        </span>
                      )}
                    </div>

                    {vpgLoading && standings.length === 0 && (
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

                    {!vpgLoading && !vpgError && standings.length === 0 && (
                      <div className="season-details__standings-empty">
                        <span>📊</span>
                        <p>A VPG tabella jelenleg üres.</p>
                      </div>
                    )}

                    {standings.length > 0 && (
                      <div className="season-details__table-wrapper">
                        <table className="season-details__table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>CSAPAT</th>
                              <th>M</th>
                              <th>GY</th>
                              <th>D</th>
                              <th>V</th>
                              <th>LG</th>
                              <th>KG</th>
                              <th>GD</th>
                              <th>P</th>
                            </tr>
                          </thead>

                          <tbody>
                            {standings.map((standing) => {
                              const rowClass = getStandingRowClass(standing);

                              return (
                                <tr
                                  key={standing.slug || standing.teamName}
                                  className={`season-details__table-row ${rowClass}`}
                                >
                                  <td className="season-details__position">
                                    {standing.position === 1
                                      ? "🥇"
                                      : standing.position === 2
                                        ? "🥈"
                                        : standing.position === 3
                                          ? "🥉"
                                          : standing.position}
                                  </td>

                                  <td>
                                    <div className="season-details__team">
                                      {standing.logo && (
                                        <img
                                          className="season-details__team-logo"
                                          src={standing.logo}
                                          alt=""
                                        />
                                      )}

                                      <div className="season-details__team-name">
                                        <span>{standing.teamName}</span>
                                      </div>
                                    </div>
                                  </td>

                                  <td>{standing.played}</td>
                                  <td>{standing.wins}</td>
                                  <td>{standing.draws}</td>
                                  <td>{standing.losses}</td>
                                  <td>{standing.goalsFor}</td>
                                  <td>{standing.goalsAgainst}</td>

                                  <td>
                                    {formatGoalDifference(
                                      standing.goalsFor,
                                      standing.goalsAgainst,
                                    )}
                                  </td>

                                  <td>{standing.points}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* =================================
                    UPCOMING MATCHES FOR THIS
                    COMPETITION
                    ================================= */}

                {competition.vpg?.seasonId && (
                  <div className="season-details__matches">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">
                          {competition.shortName || "VPG"} fixtures
                        </p>

                        <h4>Következő mérkőzések</h4>
                      </div>

                      {competitionMatches.length > 0 && (
                        <span className="season-statistics__competition-count">
                          {competitionMatches.length} mérkőzés
                        </span>
                      )}
                    </div>

                    {matchesLoading && competitionMatches.length === 0 && (
                      <div className="season-details__standings-empty">
                        <span>⚽</span>
                        <p>Mérkőzések betöltése...</p>
                      </div>
                    )}

                    {!matchesLoading &&
                      matchesError &&
                      competitionMatches.length === 0 && (
                        <div className="season-details__standings-empty">
                          <span>⚠️</span>
                          <p>{matchesError}</p>
                        </div>
                      )}

                    {!matchesLoading &&
                      !matchesError &&
                      competitionMatches.length === 0 && (
                        <div className="season-details__standings-empty">
                          <span>⚽</span>
                          <p>
                            Nincs közelgő mérkőzés ebben a versenysorozatban.
                          </p>
                        </div>
                      )}

                    {competitionMatches.length > 0 && (
                      <div className="season-details__matches-list">
                        {competitionMatches
                          .filter(
                            (match) =>
                              match.datetime &&
                              new Date(match.datetime) >= new Date(),
                          )
                          .slice(0, 5)
                          .map((match) => (
                            <article
                              className="season-details__match"
                              key={match.id}
                            >
                              <div className="season-details__match-round">
                                <span>{match.matchDay}.</span>
                                <small>FORDULÓ</small>
                              </div>

                              <div className="season-details__match-date">
                                <strong>
                                  {formatMatchDate(match.datetime)}
                                </strong>

                                <span>{formatMatchTime(match.datetime)}</span>
                              </div>

                              <div className="season-details__match-teams">
                                <div
                                  className={
                                    match.isHome
                                      ? "season-details__match-team season-details__match-team--bod"
                                      : "season-details__match-team"
                                  }
                                >
                                  {match.isHome ? (
                                    <>
                                      <span>Ball of Duty CF</span>

                                      {match.homeLogo && (
                                        <img src={match.homeLogo} alt="" />
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {match.awayLogo && (
                                        <img src={match.awayLogo} alt="" />
                                      )}

                                      <span>Ball of Duty CF</span>
                                    </>
                                  )}
                                </div>

                                <strong className="season-details__match-vs">
                                  VS
                                </strong>

                                <div className="season-details__match-team">
                                  {match.isHome ? (
                                    <>
                                      {match.awayLogo && (
                                        <img src={match.awayLogo} alt="" />
                                      )}

                                      <span>{match.opponentName}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>{match.opponentName}</span>

                                      {match.homeLogo && (
                                        <img src={match.homeLogo} alt="" />
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="season-details__match-location">
                                {match.isHome ? "HAZAI" : "IDEGENBEN"}
                              </div>
                            </article>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* =================================
                    COMPLETED RESULTS FOR THIS
                    COMPETITION
                    ================================= */}

                {competition.vpg?.seasonId && (
                  <div className="season-details__results">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">
                          {competition.shortName || "VPG"} results
                        </p>

                        <h4>Legutóbbi eredmények</h4>
                      </div>

                      {competitionResults.length > 0 && (
                        <span className="season-statistics__competition-count">
                          {competitionResults.length} mérkőzés
                        </span>
                      )}
                    </div>

                    {resultsLoading && competitionResults.length === 0 && (
                      <div className="season-details__standings-empty">
                        <span>⚽</span>
                        <p>Eredmények betöltése...</p>
                      </div>
                    )}

                    {!resultsLoading &&
                      resultsError &&
                      competitionResults.length === 0 && (
                        <div className="season-details__standings-empty">
                          <span>⚠️</span>
                          <p>{resultsError}</p>
                        </div>
                      )}

                    {!resultsLoading &&
                      !resultsError &&
                      competitionResults.length === 0 && (
                        <div className="season-details__standings-empty">
                          <span>⚽</span>
                          <p>
                            Még nincs lejátszott mérkőzés ebben a
                            versenysorozatban.
                          </p>
                        </div>
                      )}

                    {competitionResults.length > 0 && (
                      <div className="season-details__results-list">
                        {competitionResults.slice(0, 5).map((match) => (
                          <article
                            className="season-details__result"
                            key={match.id}
                          >
                            <div className="season-details__result-round">
                              <span>{match.matchDay}.</span>
                              <small>FORDULÓ</small>
                            </div>

                            <div className="season-details__result-date">
                              <strong>{formatMatchDate(match.datetime)}</strong>

                              <span>{formatMatchTime(match.datetime)}</span>
                            </div>

                            <div className="season-details__result-teams">
                              <div
                                className={
                                  match.isHome
                                    ? "season-details__result-team season-details__result-team--bod"
                                    : "season-details__result-team"
                                }
                              >
                                {match.isHome ? (
                                  <>
                                    <span>Ball of Duty CF</span>

                                    {match.homeLogo && (
                                      <img src={match.homeLogo} alt="" />
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {match.awayLogo && (
                                      <img src={match.awayLogo} alt="" />
                                    )}

                                    <span>Ball of Duty CF</span>
                                  </>
                                )}
                              </div>

                              <div className="season-details__result-score">
                                <strong>{match.homeScore}</strong>

                                <span>:</span>

                                <strong>{match.awayScore}</strong>
                              </div>

                              <div className="season-details__result-team">
                                {match.isHome ? (
                                  <>
                                    {match.awayLogo && (
                                      <img src={match.awayLogo} alt="" />
                                    )}

                                    <span>{match.opponentName}</span>
                                  </>
                                ) : (
                                  <>
                                    <span>{match.opponentName}</span>

                                    {match.homeLogo && (
                                      <img src={match.homeLogo} alt="" />
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            <div
                              className={`season-details__result-badge ${getMatchResultClass(
                                match.result,
                              )}`}
                            >
                              {getMatchResultLabel(match.result)}
                            </div>

                            <div className="season-details__result-location">
                              {match.isHome ? "HAZAI" : "IDEGENBEN"}
                            </div>
                          </article>
                        ))}
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
          SEASON STATISTICS
          ========================================= */}

      {competitionsWithStats.length > 0 && (
        <SeasonStatistics competitions={season.competitions || []} />
      )}

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
          INDIVIDUAL AWARDS
          ========================================= */}

      {isCompleted && season.awards?.individualAwards?.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Individual awards</p>
              <h3>Egyéni díjak</h3>
            </div>
          </div>

          <div className="season-details__milestones">
            {season.awards.individualAwards.map((award, index) => (
              <div
                className="season-details__milestone"
                key={`${award.playerName}-${award.award}-${index}`}
              >
                <span>★</span>

                <p>
                  <strong>{award.nickname || award.playerName}</strong>

                  {" – "}

                  {award.award}

                  {award.position && ` (${award.position})`}
                </p>
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
