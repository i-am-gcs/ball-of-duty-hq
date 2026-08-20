import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { getSeasonById } from "../services/seasonService";
import { getBodLeagueStats } from "../services/vpgLeagueService";
import { getSeasonStatistics } from "../services/vpgPlayerStatsService";
import { getStreamOverlayConfig } from "../services/streamOverlayService";
import "../styles/overlay.css";

const TWITCH_CHANNEL = "ballofdutycf";
const STANDINGS_PAGE_SIZE = 5;
const PLAYER_METRICS = [
  { key: "points", label: "Összpontszám", suffix: "P", decimals: 1 },
  { key: "assists", label: "Gólpassz", suffix: "A", decimals: 0 },
  { key: "goals", label: "Gól", suffix: "G", decimals: 0 },
  { key: "matchesPlayed", label: "Lejátszott meccs", suffix: "M", decimals: 0 },
];

function TwitchPlayer() {
  const parent = window.location.hostname || "localhost";
  const src = `https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${encodeURIComponent(parent)}&autoplay=false`;
  return <div className="stream-overlay__player"><iframe src={src} title="Ball of Duty CF Twitch közvetítés" allow="autoplay; fullscreen" allowFullScreen /></div>;
}

function titleOf(competition) {
  return competition?.shortName || competition?.name || "Aktív bajnokság";
}

export default function StreamOverlayCarousel() {
  const [overlay, setOverlay] = useState(null);
  const [panels, setPanels] = useState([]);
  const [standingsIndex, setStandingsIndex] = useState(0);
  const [standingsPage, setStandingsPage] = useState(0);
  const [playerLeagueIndex, setPlayerLeagueIndex] = useState(0);
  const [metricIndex, setMetricIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load(background = false) {
      try {
        if (!background) setLoading(true);
        setError("");
        const config = await getStreamOverlayConfig();
        if (!active) return;
        setOverlay(config);

        if (!config.activeSeasonId) {
          setPanels([]);
          return;
        }

        const season = await getSeasonById(config.activeSeasonId);
        const selectedIds = config.activeCompetitionIds?.length
          ? config.activeCompetitionIds.map(String)
          : config.activeCompetitionId ? [String(config.activeCompetitionId)] : [];
        const competitions = (season?.competitions || []).filter((competition) =>
          selectedIds.includes(String(competition.id)),
        );
        const statisticsCache = new Map();
        const nextPanels = await Promise.all(competitions.map(async (competition) => {
          const seasonKey = String(competition.vpg?.seasonId || competition.vpgSeasonId || competition.id);
          if (!statisticsCache.has(seasonKey)) {
            statisticsCache.set(seasonKey, getSeasonStatistics({ season, competitionId: competition.id }));
          }
          const [standings, statistics] = await Promise.all([
            getBodLeagueStats({
              ...competition,
              vpgLeagueSlug: competition.vpg?.leagueSlug || competition.vpgLeagueSlug,
              vpgSeasonId: competition.vpg?.seasonId || competition.vpgSeasonId,
              vpgIsHistory: false,
            }),
            statisticsCache.get(seasonKey),
          ]);
          return {
            id: String(competition.id),
            title: titleOf(competition),
            standings,
            players: statistics.playerStats || [],
          };
        }));
        if (active) setPanels(nextPanels);
      } catch (loadError) {
        console.error("Stream overlay betöltési hiba:", loadError);
        if (active) setError("A közvetítés betöltődött, de a liga adatait nem sikerült lekérni.");
      } finally {
        if (active && !background) setLoading(false);
      }
    }

    load();
    const refresh = window.setInterval(() => load(true), 120_000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    setStandingsIndex(0);
    setStandingsPage(0);
    setPlayerLeagueIndex(0);
  }, [panels.length]);

  useEffect(() => {
    if (panels.length === 0) return undefined;
    const timer = window.setInterval(() => {
      setStandingsPage((currentPage) => {
        const currentPanel = panels[standingsIndex];
        const pageCount = Math.max(1, Math.ceil((currentPanel?.standings.length || 0) / STANDINGS_PAGE_SIZE));

        if (currentPage + 1 < pageCount) return currentPage + 1;

        if (panels.length > 1) {
          setStandingsIndex((index) => (index + 1) % panels.length);
        }
        return 0;
      });
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [panels, standingsIndex]);

  useEffect(() => {
    if (panels.length === 0) return undefined;
    const timer = window.setInterval(() => {
      setMetricIndex((index) => {
        const next = (index + 1) % PLAYER_METRICS.length;
        if (next === 0 && panels.length > 1) {
          setPlayerLeagueIndex((leagueIndex) => (leagueIndex + 1) % panels.length);
        }
        return next;
      });
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [panels.length]);

  const standingsPanel = panels[standingsIndex] || null;
  const standingsPageCount = Math.max(1, Math.ceil((standingsPanel?.standings.length || 0) / STANDINGS_PAGE_SIZE));
  const visibleStandings = standingsPanel?.standings.slice(
    standingsPage * STANDINGS_PAGE_SIZE,
    (standingsPage + 1) * STANDINGS_PAGE_SIZE,
  ) || [];
  const playerPanel = panels[playerLeagueIndex] || null;
  const metric = PLAYER_METRICS[metricIndex];
  const topPlayers = useMemo(() => playerPanel
    ? [...playerPanel.players]
        .sort((a, b) => Number(b[metric.key] || 0) - Number(a[metric.key] || 0))
        .slice(0, 5)
    : [], [metric.key, playerPanel]);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Ball of Duty Live" title="Élő közvetítés" description="A csapat Twitch-közvetítése és az aktuális bajnokságok állása egy helyen." />
      <section className="stream-overlay">
        <div className={`stream-overlay__hero panel ${!overlay?.showTwitchPlayer ? "stream-overlay__hero--cards-only" : ""}`}>
          {overlay?.showTwitchPlayer && <div className="stream-overlay__video">
            <div className="stream-overlay__video-heading"><span className="stream-overlay__video-badge">Twitch live</span><strong>{standingsPanel?.title || "Nincs aktív stream liga beállítva"}</strong></div>
            <TwitchPlayer />
          </div>}

          <div className="stream-overlay__cards">
            {overlay?.showStandings && <article className="stream-overlay-card stream-overlay-card--standings">
              <span className="eyebrow">Bajnoki tabella</span>
              <div className="stream-overlay-cycle" key={`standings-${standingsPanel?.id || "empty"}-${standingsPage}`}>
                <h3>{standingsPanel?.title || "Nincs kiválasztott liga"}</h3>
                {loading && <p>Tabella betöltése...</p>}
                {!loading && error && <p className="error-message">{error}</p>}
                {!loading && !error && standingsPanel?.standings.length > 0 && <div className="stream-overlay-table">
                  {visibleStandings.map((team, index) => <div className={`stream-overlay-table__row stream-overlay-roll-row ${team.isBod ? "stream-overlay-table__row--bod" : ""}`} key={team.slug || team.teamName} style={{ "--row-index": index }}>
                    <span>{team.position}.</span>{team.logo ? <img src={team.logo} alt="" /> : <span />}<strong>{team.teamName}</strong><small>{team.played} M</small><b>{team.points} P</b>
                  </div>)}
                </div>}
                {!loading && !error && standingsPanel && standingsPanel.standings.length === 0 && <p>Ehhez a ligához még nincs betöltött tabella.</p>}
              </div>
              {(standingsPageCount > 1 || panels.length > 1) && <div className="stream-overlay-dots">
                {Array.from({ length: standingsPageCount }, (_, index) => <span className={index === standingsPage ? "active" : ""} key={`${standingsPanel?.id || "empty"}-${index}`} />)}
              </div>}
            </article>}

            {overlay?.showTopPlayers && <article className="stream-overlay-card">
              <span className="eyebrow">BoD Top 5 · {metric.label}</span>
              <div className="stream-overlay-cycle" key={`players-${playerPanel?.id || "empty"}-${metric.key}`}>
                <h3>{playerPanel?.title || "Nincs kiválasztott liga"}</h3>
                {loading && <p>Játékosok betöltése...</p>}
                {!loading && error && <p className="error-message">{error}</p>}
                {!loading && !error && topPlayers.length > 0 && <div className="stream-overlay-table stream-overlay-players">
                  {topPlayers.map((player, index) => <div className="stream-overlay-player stream-overlay-roll-row" key={player.username} style={{ "--row-index": index }}>
                    <span>{index + 1}.</span>
                    {player.avatar ? <img src={player.avatar} alt="" /> : <span className="stream-overlay-player__fallback">{String(player.username || "?").charAt(0).toUpperCase()}</span>}
                    <div><strong>{player.username}</strong><small>{player.matchesPlayed || 0} M · {player.goals || 0} G · {player.assists || 0} A</small></div>
                    <b>{Number(player[metric.key] || 0).toFixed(metric.decimals)} {metric.suffix}</b>
                  </div>)}
                </div>}
                {!loading && !error && playerPanel && topPlayers.length === 0 && <p>Ehhez a ligához még nincs játékosstatisztika.</p>}
              </div>
              <div className="stream-overlay-metrics">{PLAYER_METRICS.map((item, index) => <span className={index === metricIndex ? "active" : ""} key={item.key}>{item.label}</span>)}</div>
            </article>}

            {!overlay?.showTwitchPlayer && !overlay?.showStandings && !overlay?.showTopPlayers && <article className="stream-overlay-card"><strong>A közvetítési oldal jelenleg nincs összeállítva.</strong><p>Az admin később engedélyezheti a megjelenő blokkokat.</p></article>}
          </div>
        </div>
      </section>
    </div>
  );
}
