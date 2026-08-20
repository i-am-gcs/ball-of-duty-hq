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
    activeCompetitionIds: [],
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
          activeCompetitionIds: (overlayData?.activeCompetitionIds || []).map(String),
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

    const validIds = new Set(
      competitions.map((competition) => String(competition.id)),
    );
    const selectedIds = overlay.activeCompetitionIds.filter((id) =>
      validIds.has(String(id)),
    );

    if (selectedIds.length !== overlay.activeCompetitionIds.length) {
      setOverlay((current) => ({
        ...current,
        activeCompetitionIds: selectedIds,
        activeCompetitionId: selectedIds[0] || "",
      }));
    }
  }, [selectedSeason, competitions, overlay.activeCompetitionIds]);

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
        activeCompetitionIds: overlay.activeCompetitionIds,
        mode: overlay.mode,
      });

      setOverlay({
        activeSeasonId: String(nextOverlay.activeSeasonId || ""),
        activeCompetitionId: String(nextOverlay.activeCompetitionId || ""),
        activeCompetitionIds: (nextOverlay.activeCompetitionIds || []).map(String),
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
                activeCompetitionIds: [],
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

        <fieldset className="settings-visibility settings-competitions">
          <legend>Streamben váltakozó ligák</legend>

          {competitions.length === 0 && (
            <p className="muted">A kiválasztott szezonhoz nincs beállított liga.</p>
          )}

          {competitions.map((competition) => {
            const competitionId = String(competition.id);

            return (
              <label className="settings-toggle" key={competition.id}>
                <input
                  type="checkbox"
                  checked={overlay.activeCompetitionIds.includes(competitionId)}
                  onChange={(event) =>
                    setOverlay((current) => {
                      const ids = event.target.checked
                        ? [...current.activeCompetitionIds, competitionId]
                        : current.activeCompetitionIds.filter(
                            (id) => id !== competitionId,
                          );

                      return {
                        ...current,
                        activeCompetitionIds: ids,
                        activeCompetitionId: ids[0] || "",
                      };
                    })
                  }
                />
                <span>
                  <strong>{competition.shortName || competition.name}</strong>
                  <small>Megjelenik a tabella- és játékos-körforgásban.</small>
                </span>
              </label>
            );
          })}
        </fieldset>

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
