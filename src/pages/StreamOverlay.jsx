import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { getSeasonById } from "../services/seasonService";
import { getBodLeagueStats } from "../services/vpgLeagueService";
import { getSeasonStatistics } from "../services/vpgPlayerStatsService";
import { getStreamOverlayConfig } from "../services/streamOverlayService";
import "../styles/overlay.css";

const TWITCH_CHANNEL = "ballofdutycf";

function TwitchPlayer() {
  const parent = window.location.hostname || "localhost";
  const src = `https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${encodeURIComponent(parent)}&autoplay=false`;

  return (
    <div className="stream-overlay__player">
      <iframe
        src={src}
        title="Ball of Duty CF Twitch közvetítés"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

function StreamOverlay() {
  const [overlay, setOverlay] = useState(null);
  const [season, setSeason] = useState(null);
  const [standings, setStandings] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const config = await getStreamOverlayConfig();
        setOverlay(config);

        if (!config?.activeSeasonId || !config?.activeCompetitionId) {
          setSeason(null);
          setStandings([]);
          setTopPlayers([]);
          return;
        }

        const selectedSeason = await getSeasonById(config.activeSeasonId);
        setSeason(selectedSeason);
        const competition = (selectedSeason?.competitions || []).find(
          (item) => String(item.id) === String(config.activeCompetitionId),
        );

        if (!competition) {
          setStandings([]);
          setTopPlayers([]);
          return;
        }

        const [leagueStats, statistics] = await Promise.all([
          getBodLeagueStats({
            ...competition,
            vpgLeagueSlug: competition.vpg?.leagueSlug || competition.vpgLeagueSlug,
            vpgSeasonId: competition.vpg?.seasonId || competition.vpgSeasonId,
            vpgIsHistory: false,
          }),
          getSeasonStatistics({
            season: selectedSeason,
            competitionId: competition.id,
          }),
        ]);

        setStandings(leagueStats.slice(0, 5));
        setTopPlayers(
          [...(statistics.playerStats || [])]
            .sort((first, second) => Number(second.points || 0) - Number(first.points || 0))
            .slice(0, 5),
        );
      } catch (loadError) {
        console.error("Stream overlay betöltési hiba:", loadError);
        setError("A közvetítés betöltődött, de a liga adatait nem sikerült lekérni.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const competitionTitle = useMemo(() => {
    if (!season || !overlay?.activeCompetitionId) {
      return "Nincs aktív stream liga beállítva";
    }
    const competition = (season.competitions || []).find(
      (item) => String(item.id) === String(overlay.activeCompetitionId),
    );
    return competition?.shortName || competition?.name || "Aktív bajnokság";
  }, [overlay?.activeCompetitionId, season]);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Ball of Duty Live"
        title="Élő közvetítés"
        description="A csapat Twitch-közvetítése és az aktuális bajnokság állása egy helyen."
      />

      <section className="stream-overlay">
        <div className={`stream-overlay__hero panel ${!overlay?.showTwitchPlayer ? "stream-overlay__hero--cards-only" : ""}`}>
          {overlay?.showTwitchPlayer && <div className="stream-overlay__video">
            <div className="stream-overlay__video-heading">
              <span className="stream-overlay__video-badge">Twitch live</span>
              <strong>{competitionTitle}</strong>
            </div>
            <TwitchPlayer />
          </div>}

          <div className="stream-overlay__cards">
            {overlay?.showStandings && <article className="stream-overlay-card stream-overlay-card--standings">
              <span className="eyebrow">Bajnoki tabella</span>
              <h3>{competitionTitle}</h3>
              {loading && <p>Tabella betöltése...</p>}
              {!loading && error && <p className="error-message">{error}</p>}
              {!loading && !error && standings.length > 0 && (
                <div className="stream-overlay-table">
                  {standings.map((team) => (
                    <div
                      className={`stream-overlay-table__row ${team.isBod ? "stream-overlay-table__row--bod" : ""}`}
                      key={team.slug || team.teamName}
                    >
                      <span>{team.position}.</span>
                      {team.logo ? <img src={team.logo} alt="" /> : <span />}
                      <strong>{team.teamName}</strong>
                      <small>{team.played} M</small>
                      <b>{team.points} P</b>
                    </div>
                  ))}
                </div>
              )}
              {!loading && !error && standings.length === 0 && (
                <p>Ehhez a ligához még nincs betöltött tabella.</p>
              )}
            </article>}

            {overlay?.showTopPlayers && <article className="stream-overlay-card">
              <span className="eyebrow">BoD Top 5 játékos</span>
              <h3>{competitionTitle}</h3>
              {loading && <p>Játékosok betöltése...</p>}
              {!loading && error && <p className="error-message">{error}</p>}
              {!loading && !error && topPlayers.length > 0 && (
                <div className="stream-overlay-table stream-overlay-players">
                  {topPlayers.map((player, index) => (
                    <div className="stream-overlay-player" key={player.username}>
                      <span>{index + 1}.</span>
                      {player.avatar ? (
                        <img src={player.avatar} alt="" />
                      ) : (
                        <span className="stream-overlay-player__fallback">
                          {String(player.username || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <strong>{player.username}</strong>
                        <small>{player.matchesPlayed || 0} M · {player.goals || 0} G · {player.assists || 0} A</small>
                      </div>
                      <b>{Number(player.points || 0).toFixed(1)} P</b>
                    </div>
                  ))}
                </div>
              )}
              {!loading && !error && topPlayers.length === 0 && (
                <p>Ehhez a ligához még nincs játékosstatisztika.</p>
              )}
            </article>}

            {!overlay?.showTwitchPlayer && !overlay?.showStandings && !overlay?.showTopPlayers && (
              <article className="stream-overlay-card">
                <strong>A közvetítési oldal jelenleg nincs összeállítva.</strong>
                <p>Az admin később engedélyezheti a megjelenő blokkokat.</p>
              </article>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default StreamOverlay;
