import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import StatCard from "../components/ui/StatCard";
import { getPlayers } from "../services/playerService";
import { getActiveSeason } from "../services/seasonService";
import { getUpcomingVpgMatchesNormalized } from "../services/vpgService";
import { getBodLeagueStats } from "../services/vpgLeagueService";

function formatVpgDate(datetime) {
  if (!datetime) {
    return "-";
  }

  const date = new Date(datetime);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("hu-HU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatVpgTime(datetime) {
  if (!datetime) {
    return "-";
  }

  const date = new Date(datetime);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCountdown(datetime) {
  if (!datetime) {
    return null;
  }

  const target = new Date(datetime).getTime();
  const now = Date.now();

  const difference = target - now;

  if (difference <= 0) {
    return {
      matchday: true,
      days: 0,
      hours: 0,
      minutes: 0,
    };
  }

  const totalMinutes = Math.floor(difference / 1000 / 60);

  const days = Math.floor(totalMinutes / (60 * 24));

  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);

  const minutes = totalMinutes % 60;

  return {
    matchday: false,
    days,
    hours,
    minutes,
  };
}

function getSeasonDisplayName(season) {
  if (!season?.name) {
    return "—";
  }

  return season.name.replace(/^Ball of Duty\s*/i, "");
}

/**
 * Az aktív szezon első VPG league competitionje.
 *
 * A VPG kapcsolat az új struktúrában:
 *
 * competition.vpg.seasonId
 * competition.vpg.leagueSlug
 */
function getActiveVpgLeague(season) {
  return (
    season?.competitions?.find(
      (competition) =>
        competition.type === "league" && competition.vpg?.seasonId,
    ) || null
  );
}

/**
 * Dashboard helyezés.
 *
 * A lezárt szezonoknál használható a mentett placement,
 * aktív szezonnál viszont mindig az aktuális VPG tabellát
 * kérjük le.
 */
function getSavedSeasonPlacement(season) {
  return (
    season?.competitions?.find(
      (competition) =>
        competition.type === "league" && competition.placement != null,
    )?.placement ?? null
  );
}

function Dashboard() {
  const [activePlayers, setActivePlayers] = useState([]);
  const [activeSeason, setActiveSeason] = useState(null);

  const [clubDataLoading, setClubDataLoading] = useState(true);
  const [clubDataError, setClubDataError] = useState("");

  const [currentPlacement, setCurrentPlacement] = useState(null);
  const [placementLoading, setPlacementLoading] = useState(true);
  const [placementError, setPlacementError] = useState("");

  const [nextMatch, setNextMatch] = useState(null);

  const [vpgLoading, setVpgLoading] = useState(true);

  const [vpgError, setVpgError] = useState("");

  const [countdown, setCountdown] = useState(null);

  /*
   * =========================================
   * KLUBADATOK
   * =========================================
   */

  useEffect(() => {
    async function loadClubData() {
      try {
        setClubDataLoading(true);
        setClubDataError("");

        const [players, season] = await Promise.all([
          getPlayers(),
          getActiveSeason(),
        ]);

        const activeSquad = players.filter(
          (player) =>
            player.status === "Aktív" &&
            player.nickname !== "BoD Admin" &&
            player.name !== "BoD Admin",
        );

        setActivePlayers(activeSquad);
        setActiveSeason(season);
      } catch (error) {
        console.error("Dashboard klubadat betöltési hiba:", error);

        setClubDataError("Nem sikerült betölteni a klub aktuális adatait.");
      } finally {
        setClubDataLoading(false);
      }
    }

    loadClubData();
  }, []);

  /*
   * =========================================
   * AKTUÁLIS VPG HELYEZÉS
   * =========================================
   *
   * Aktív szezon:
   * - VPG API-ból kérjük le
   * - nem a Firebase-ben tárolt placementet használjuk
   *
   * Lezárt szezon:
   * - a mentett placement használható
   *
   * Így az aktív szezon helyezése automatikusan
   * követi a VPG aktuális tabelláját.
   */

  useEffect(() => {
    if (!activeSeason) {
      setCurrentPlacement(null);
      setPlacementLoading(false);
      setPlacementError("");
      return;
    }

    async function loadCurrentPlacement() {
      try {
        setPlacementLoading(true);
        setPlacementError("");
        setCurrentPlacement(null);

        /*
         * Lezárt szezon esetén nem kell élő VPG lekérés.
         * Ott a szezon végleges helyezése a Firebase-ben
         * már el van mentve.
         */
        if (activeSeason.status === "completed") {
          setCurrentPlacement(getSavedSeasonPlacement(activeSeason));

          return;
        }

        const competition = getActiveVpgLeague(activeSeason);

        if (!competition) {
          setCurrentPlacement(null);
          return;
        }

        /*
         * Ugyanazt a struktúrát használjuk,
         * mint a SeasonDetails.
         */
        const vpgCompetition = {
          ...competition,

          vpgLeagueSlug: competition.vpg?.leagueSlug || "",
          vpgSeasonId: competition.vpg?.seasonId || null,

          vpgIsHistory: false,
        };

        const standings = await getBodLeagueStats(vpgCompetition);

        /*
         * A standings service már isBod mezővel jelöli
         * a Ball of Duty sort.
         *
         * Biztonsági fallbackként a csapatnevet is ellenőrizzük.
         */
        const bodStanding =
          standings.find((team) => team.isBod) ||
          standings.find(
            (team) =>
              String(team.teamName || "")
                .trim()
                .toLowerCase() === "ball of duty cf",
          );

        setCurrentPlacement(bodStanding?.position ?? null);
      } catch (error) {
        console.error("Dashboard VPG helyezés betöltési hiba:", error);

        setPlacementError("Nem sikerült betölteni az aktuális helyezést.");

        setCurrentPlacement(null);
      } finally {
        setPlacementLoading(false);
      }
    }

    loadCurrentPlacement();
  }, [activeSeason]);

  /*
   * =========================================
   * KÖVETKEZŐ MÉRKŐZÉS
   * =========================================
   */

  useEffect(() => {
    async function loadNextMatch() {
      try {
        setVpgLoading(true);
        setVpgError("");

        const matches = await getUpcomingVpgMatchesNormalized();

        setNextMatch(matches.length > 0 ? matches[0] : null);
      } catch (error) {
        console.error("VPG Next Match betöltési hiba:", error);

        setVpgError("Nem sikerült betölteni a következő mérkőzést.");
      } finally {
        setVpgLoading(false);
      }
    }

    loadNextMatch();
  }, []);

  /*
   * =========================================
   * COUNTDOWN
   * =========================================
   */

  useEffect(() => {
    if (!nextMatch?.datetime) {
      setCountdown(null);
      return;
    }

    function updateCountdown() {
      setCountdown(getCountdown(nextMatch.datetime));
    }

    updateCountdown();

    const interval = setInterval(updateCountdown, 60 * 1000);

    return () => clearInterval(interval);
  }, [nextMatch]);

  /*
   * =========================================
   * RENDER
   * =========================================
   */

  return (
    <div className="page-stack">
      {/* =========================================
          BRAND HERO
          ========================================= */}

      <section className="dashboard-brand-hero">
        <div className="dashboard-brand-hero__content">
          <p className="eyebrow">Club overview</p>

          <h2>Üdv a Ball of Duty főhadiszállásán</h2>

          <p>
            A klub legfontosabb adatai, eredményei és következő feladatai
            egyetlen helyen.
          </p>
        </div>
      </section>

      {/* =========================================
          STAT CARDS
          ========================================= */}

      {clubDataError && <p className="error-message">{clubDataError}</p>}

      <section className="stat-grid">
        {/* KERETLÉTSZÁM */}

        <StatCard
          label="Keretlétszám"
          value={clubDataLoading ? "…" : activePlayers.length}
          detail={clubDataLoading ? "Betöltés..." : "Aktív játékos"}
          icon="♟"
        />

        {/* AKTÍV SZEZON */}

        <StatCard
          label="Aktív szezon"
          value={
            activeSeason
              ? getSeasonDisplayName(activeSeason)
              : clubDataLoading
                ? "…"
                : "—"
          }
          detail={
            activeSeason
              ? `${activeSeason.period?.start || ""} / ${
                  activeSeason.status === "active" ||
                  activeSeason.active === true
                    ? "folyamatban"
                    : activeSeason.period?.end || ""
                }`
              : clubDataLoading
                ? "Betöltés..."
                : "Nincs aktív szezon"
          }
          icon="◫"
        />

        {/* KÖVETKEZŐ MÉRKŐZÉS */}

        <StatCard
          label="Következő mérkőzés"
          value={nextMatch ? formatVpgDate(nextMatch.datetime) : "—"}
          detail={
            nextMatch
              ? `${formatVpgTime(nextMatch.datetime)} · ${
                  nextMatch.competition
                }`
              : vpgLoading
                ? "Betöltés..."
                : "Nincs következő mérkőzés"
          }
          icon="⚽"
        />

        {/* AKTUÁLIS HELYEZÉS */}

        <StatCard
          label="Aktuális helyezés"
          value={
            placementLoading
              ? "…"
              : currentPlacement != null
                ? `${currentPlacement}.`
                : "—"
          }
          detail={
            getActiveVpgLeague(activeSeason)?.name ||
            (placementError
              ? placementError
              : clubDataLoading || placementLoading
                ? "Betöltés..."
                : "Nincs helyezés")
          }
          icon="★"
        />
      </section>

      {/* =========================================
          DASHBOARD GRID
          ========================================= */}

      <section className="dashboard-grid">
        {/* =======================================
            NEXT MATCH
            ======================================= */}

        <article className="panel hero-panel">
          {vpgLoading ? (
            <div>
              <p className="eyebrow">Következő mérkőzés</p>

              <h3>VPG mérkőzés betöltése...</h3>
            </div>
          ) : vpgError ? (
            <div>
              <p className="eyebrow">Következő mérkőzés</p>

              <h3>Nem sikerült betölteni</h3>

              <p>{vpgError}</p>
            </div>
          ) : !nextMatch ? (
            <div>
              <p className="eyebrow">Következő mérkőzés</p>

              <h3>Nincs következő VPG mérkőzés</h3>

              <p>Jelenleg nincs ütemezett mérkőzés.</p>
            </div>
          ) : (
            <div className="next-match">
              {/* ---------------------------------
                  HEADER
                  --------------------------------- */}

              <div className="next-match__header">
                <div>
                  <p className="eyebrow">Következő mérkőzés</p>

                  <span className="next-match__competition">
                    {nextMatch.competition}
                  </span>
                </div>

                {nextMatch.competition === "Balkan League 2" && (
                  <img
                    src="/images/balkan-vpg-logo.png"
                    alt="Balkan VPG"
                    className="next-match__competition-logo"
                  />
                )}
              </div>

              {/* ---------------------------------
                  TEAMS
                  --------------------------------- */}

              <div className="next-match__teams">
                <div className="next-match__team">
                  {nextMatch.homeLogo && (
                    <img
                      src={nextMatch.homeLogo}
                      alt=""
                      className="next-match__team-logo"
                    />
                  )}

                  <strong>{nextMatch.homeTeam}</strong>
                </div>

                <div className="next-match__versus">VS</div>

                <div className="next-match__team">
                  {nextMatch.awayLogo && (
                    <img
                      src={nextMatch.awayLogo}
                      alt=""
                      className="next-match__team-logo"
                    />
                  )}

                  <strong>{nextMatch.awayTeam}</strong>
                </div>
              </div>

              {/* ---------------------------------
                  DATE / TIME
                  --------------------------------- */}

              <div className="next-match__datetime">
                <strong>{formatVpgDate(nextMatch.datetime)}</strong>

                <span>{formatVpgTime(nextMatch.datetime)}</span>
              </div>
            </div>
          )}

          {/* =====================================
              COUNTDOWN
              ===================================== */}

          {!vpgLoading && !vpgError && nextMatch && countdown && (
            <div
              className={`next-match__countdown ${
                countdown.matchday ? "next-match__countdown--matchday" : ""
              }`}
            >
              {countdown.matchday ? (
                <>
                  <span>MATCHDAY</span>
                </>
              ) : (
                <>
                  <small>KICKOFF IN</small>

                  <strong>
                    {countdown.days > 0
                      ? `${countdown.days} nap`
                      : countdown.hours > 0
                        ? `${countdown.hours} óra`
                        : `${countdown.minutes} perc`}
                  </strong>

                  {countdown.days > 0 && <span>{countdown.hours} óra</span>}
                </>
              )}
            </div>
          )}
        </article>

        {/* =======================================
            QUICK ACTIONS
            ======================================= */}

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Gyors műveletek</p>

              <h3>Klubmenedzsment</h3>
            </div>
          </div>

          <div className="quick-actions">
            <Link to="/squad">Játékoskeret megnyitása</Link>

            <Link to="/voting">Szavazások</Link>

            <Link to="/benefits">Benefit Tracker</Link>

            <Link to="/statistics">Statisztikák</Link>
          </div>
        </article>
      </section>
    </div>
  );
}

export default Dashboard;
