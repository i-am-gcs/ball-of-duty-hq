import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

import MatchdayXI from "../components/lineup/MatchdayXI";

import { getLineup, getLineupSourceData } from "../services/lineupService";

import {
  getActiveSeason,
  getSeasonVpgCompetitions,
} from "../services/seasonService";

import { getUpcomingVpgMatches } from "../services/vpgMatchService";

import "./MatchdayXIPage.css";

function formatMatchOption(datetime) {
  if (!datetime) {
    return "-";
  }

  const date = new Date(datetime);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("hu-HU", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function MatchdayXIPage() {
  const exportRef = useRef(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [lineup, setLineup] = useState(null);
  const [players, setPlayers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingLineup, setLoadingLineup] = useState(false);

  const [error, setError] = useState("");
  const [sourceLoaded, setSourceLoaded] = useState(false);

  /* =========================================================
     LOAD UPCOMING MATCHES + PLAYERS
     ========================================================= */

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const season = await getActiveSeason();

        if (!season) {
          throw new Error("Nincs aktív szezon.");
        }

        const competitions = getSeasonVpgCompetitions(season);

        const vpgSeasonIds = competitions
          .map(
            (competition) =>
              competition?.vpg?.seasonId || competition?.vpgSeasonId,
          )
          .filter(Boolean);

        if (vpgSeasonIds.length === 0) {
          throw new Error("Az aktív szezonhoz nincs VPG szezon azonosító.");
        }

        const [matchLists, sourceData] = await Promise.all([
          Promise.all(
            vpgSeasonIds.map((vpgSeasonId) =>
              getUpcomingVpgMatches(vpgSeasonId, 20),
            ),
          ),

          getLineupSourceData(),
        ]);

        const upcomingMatches = [
          ...new Map(
            matchLists.flat().map((match) => [String(match.id), match]),
          ).values(),
        ].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        setMatches(upcomingMatches);
        setPlayers(sourceData.players);
        setSourceLoaded(true);

        if (upcomingMatches.length > 0) {
          setSelectedMatchId(String(upcomingMatches[0].id));
        }
      } catch (loadError) {
        console.error(loadError);

        setError(
          loadError.message || "Nem sikerült betölteni a Matchday XI adatokat.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);

  /* =========================================================
     SELECTED MATCH
     ========================================================= */

  useEffect(() => {
    const match =
      matches.find((item) => String(item.id) === String(selectedMatchId)) ||
      null;

    setSelectedMatch(match);
  }, [matches, selectedMatchId]);

  /* =========================================================
     LOAD LINEUP
     ========================================================= */

  useEffect(() => {
    async function loadSavedLineup() {
      if (!selectedMatchId) {
        setLineup(null);
        return;
      }

      try {
        setLoadingLineup(true);
        setError("");

        const savedLineup = await getLineup(selectedMatchId);

        setLineup(savedLineup);
      } catch (loadError) {
        console.error(loadError);

        setLineup(null);

        setError("Nem sikerült betölteni a mentett kezdő 11-et.");
      } finally {
        setLoadingLineup(false);
      }
    }

    loadSavedLineup();
  }, [selectedMatchId]);

  /* =========================================================
     CHECK LINEUP
     ========================================================= */

  const hasLineup = useMemo(() => {
    if (!lineup) {
      return false;
    }

    return Object.values(lineup.starters || {}).filter(Boolean).length === 11;
  }, [lineup]);

  async function handleExport() {
    if (!exportRef.current || !selectedMatch) {
      return;
    }

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#06100b",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");

      const opponent = String(selectedMatch.opponentName || "opponent")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      link.download = `BOD-Matchday-XI-${opponent}.png`;

      link.href = canvas.toDataURL("image/png");

      link.click();
    } catch (exportError) {
      console.error("Matchday XI export hiba:", exportError);

      setError("Nem sikerült elkészíteni a Matchday XI képet.");
    }
  }

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <div className="page-shell">
        <p className="muted">Matchday XI betöltése...</p>
      </div>
    );
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="page-shell">
      <div className="matchday-page">
        <div className="matchday-page__toolbar">
          <div>
            <span className="eyebrow">BALL OF DUTY</span>

            <h1>Matchday XI</h1>

            <p>A mentett kezdő 11 prezentációs nézete.</p>
          </div>

          <div className="matchday-page__selector">
            <label>
              <span>MÉRKŐZÉS</span>

              <select
                value={selectedMatchId}
                onChange={(event) => setSelectedMatchId(event.target.value)}
              >
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {formatMatchOption(match.datetime)} — vs{" "}
                    {match.opponentName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && <div className="matchday-page__alert">{error}</div>}

        {!sourceLoaded && !loadingLineup && (
          <div className="matchday-page__empty">Nincs betölthető adat.</div>
        )}

        {matches.length === 0 && (
          <div className="matchday-page__empty">
            Jelenleg nincs közelgő VPG mérkőzés.
          </div>
        )}

        {selectedMatch && loadingLineup && (
          <div className="matchday-page__loading">
            Mentett kezdő 11 betöltése...
          </div>
        )}

        {selectedMatch && !loadingLineup && !hasLineup && (
          <div className="matchday-page__empty">
            <strong>Ehhez a mérkőzéshez még nincs mentett kezdő 11.</strong>

            <span>
              Állítsd össze a kezdőt a Lineup Builderben, majd mentsd el.
            </span>
          </div>
        )}

        {selectedMatch && !loadingLineup && hasLineup && (
          <>
            <div className="matchday-page__export-actions">
              <button
                type="button"
                className="matchday-page__export-button"
                onClick={handleExport}
              >
                ↓ Matchday XI export
              </button>
            </div>

            <div ref={exportRef} className="matchday-page__export-card">
              <MatchdayXI
                match={selectedMatch}
                lineup={lineup}
                players={players}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
