import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import { getSeasons, getSeasonVpgCompetitions } from "../services/seasonService";
import {
  getStreamOverlayConfig,
  saveStreamOverlayConfig,
} from "../services/streamOverlayService";
import "../styles/settings.css";

function Settings() {
  const [seasons, setSeasons] = useState([]);
  const [overlay, setOverlay] = useState({
    activeSeasonId: "",
    activeCompetitionId: "",
    mode: "leagueTop5",
    rankingView: "standings",
    showTwitchPlayer: true,
    showStandings: true,
    showTopPlayers: true,
    showChannelCard: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [seasonData, overlayData] = await Promise.all([
          getSeasons(),
          getStreamOverlayConfig(),
        ]);

        setSeasons(seasonData);
        setOverlay({
          activeSeasonId: String(overlayData?.activeSeasonId || ""),
          activeCompetitionId: String(overlayData?.activeCompetitionId || ""),
          mode: overlayData?.mode || "leagueTop5",
          rankingView: overlayData?.rankingView || "standings",
          showTwitchPlayer: overlayData?.showTwitchPlayer !== false,
          showStandings: overlayData?.showStandings !== false,
          showTopPlayers: overlayData?.showTopPlayers !== false,
          showChannelCard: overlayData?.showChannelCard !== false,
        });
      } catch (loadError) {
        console.error("Stream overlay betöltési hiba:", loadError);
        setError("Nem sikerült betölteni az overlay beállításait.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const selectedSeason = useMemo(
    () =>
      seasons.find((season) => String(season.id) === String(overlay.activeSeasonId)) ||
      null,
    [seasons, overlay.activeSeasonId],
  );

  const competitions = useMemo(
    () => getSeasonVpgCompetitions(selectedSeason),
    [selectedSeason],
  );

  useEffect(() => {
    if (!selectedSeason) {
      return;
    }

    if (competitions.length === 0) {
      return;
    }

    const currentCompetitionExists = competitions.some(
      (competition) =>
        String(competition.id) === String(overlay.activeCompetitionId),
    );

    if (!currentCompetitionExists) {
      setOverlay((current) => ({
        ...current,
        activeCompetitionId: String(competitions[0].id),
      }));
    }
  }, [selectedSeason, competitions, overlay.activeCompetitionId]);

  async function submit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const nextOverlay = await saveStreamOverlayConfig({
        ...overlay,
        activeSeasonId: overlay.activeSeasonId,
        activeCompetitionId: overlay.activeCompetitionId,
        mode: overlay.mode,
      });

      setOverlay({
        activeSeasonId: String(nextOverlay.activeSeasonId || ""),
        activeCompetitionId: String(nextOverlay.activeCompetitionId || ""),
        mode: nextOverlay.mode || "leagueTop5",
        rankingView: nextOverlay.rankingView || "standings",
        showTwitchPlayer: nextOverlay.showTwitchPlayer !== false,
        showStandings: nextOverlay.showStandings !== false,
        showTopPlayers: nextOverlay.showTopPlayers !== false,
        showChannelCard: nextOverlay.showChannelCard !== false,
      });

      setMessage("A stream overlay beállításai elmentve.");
    } catch (submitError) {
      console.error("Stream overlay mentési hiba:", submitError);
      setError("Nem sikerült elmenteni az overlay beállításait.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="panel crud-state">Beállítások betöltése...</section>;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Club settings"
        title="Beállítások"
        description="Itt állíthatod be, mit lássanak a tagok az Élő közvetítés oldalon."
      />

      <form className="panel settings-form" onSubmit={submit}>
        <label>
          <span>Aktív szezon</span>
          <select
            value={overlay.activeSeasonId}
            onChange={(event) =>
              setOverlay((current) => ({
                ...current,
                activeSeasonId: event.target.value,
                activeCompetitionId: "",
              }))
            }
          >
            <option value="">Válassz szezont</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="settings-visibility">
          <legend>Megjelenő blokkok</legend>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={overlay.showTwitchPlayer}
              onChange={(event) =>
                setOverlay((current) => ({
                  ...current,
                  showTwitchPlayer: event.target.checked,
                }))
              }
            />
            <span>
              <strong>Twitch lejátszó</strong>
              <small>Az élő adás beágyazott videója.</small>
            </span>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={overlay.showStandings}
              onChange={(event) =>
                setOverlay((current) => ({
                  ...current,
                  showStandings: event.target.checked,
                }))
              }
            />
            <span>
              <strong>Top 5 bajnoki tabella</strong>
              <small>A kiválasztott liga első öt csapata.</small>
            </span>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={overlay.showTopPlayers}
              onChange={(event) =>
                setOverlay((current) => ({
                  ...current,
                  showTopPlayers: event.target.checked,
                }))
              }
            />
            <span>
              <strong>BoD Top 5 játékos</strong>
              <small>Az adott liga öt legjobb BoD-játékosa.</small>
            </span>
          </label>
        </fieldset>

        <label>
          <span>Aktív liga / competition</span>
          <select
            value={overlay.activeCompetitionId}
            onChange={(event) =>
              setOverlay((current) => ({
                ...current,
                activeCompetitionId: event.target.value,
              }))
            }
            disabled={!selectedSeason || competitions.length === 0}
          >
            <option value="">Válassz ligát</option>
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.shortName || competition.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Overlay mód</span>
          <select
            value={overlay.mode}
            onChange={(event) =>
              setOverlay((current) => ({
                ...current,
                mode: event.target.value,
              }))
            }
          >
            <option value="leagueTop5">Liga top5</option>
          </select>
        </label>

        <div className="form-actions">
          <button className="button" disabled={saving}>
            {saving ? "Mentés..." : "Overlay mentése"}
          </button>

          <Link className="button button--secondary" to="/stream-overlay" target="_blank" rel="noreferrer">
            Overlay megnyitása
          </Link>

          {message && <span className="success-message">{message}</span>}
          {error && <span className="error-message">{error}</span>}
        </div>
      </form>
    </div>
  );
}

export default Settings;
