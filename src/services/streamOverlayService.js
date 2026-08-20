import { get, ref, set } from "firebase/database";
import { database } from "../firebase/firebase";

const STREAM_OVERLAY_PATH = "streamOverlay/current";

const DEFAULT_CONFIG = {
  activeSeasonId: "",
  activeCompetitionId: "",
  activeCompetitionIds: [],
  mode: "leagueTop5",
  rankingView: "standings",
  showTwitchPlayer: true,
  showStandings: true,
  showTopPlayers: true,
  showChannelCard: true,
  updatedAt: null,
};

export async function getStreamOverlayConfig() {
  const snapshot = await get(ref(database, STREAM_OVERLAY_PATH));

  if (!snapshot.exists()) {
    return DEFAULT_CONFIG;
  }

  const stored = snapshot.val();
  const legacyCompetitionId = stored.activeCompetitionId || "";
  const activeCompetitionIds = Array.isArray(stored.activeCompetitionIds)
    ? stored.activeCompetitionIds.map(String).filter(Boolean)
    : legacyCompetitionId
      ? [String(legacyCompetitionId)]
      : [];

  return { ...DEFAULT_CONFIG, ...stored, activeCompetitionIds };
}

export async function saveStreamOverlayConfig(config) {
  const activeCompetitionIds = Array.isArray(config.activeCompetitionIds)
    ? [...new Set(config.activeCompetitionIds.map(String).filter(Boolean))]
    : config.activeCompetitionId
      ? [String(config.activeCompetitionId)]
      : [];

  const nextConfig = {
    activeSeasonId: config.activeSeasonId || "",
    activeCompetitionId: activeCompetitionIds[0] || "",
    activeCompetitionIds,
    mode: config.mode || "leagueTop5",
    rankingView: config.rankingView === "topPlayers" ? "topPlayers" : "standings",
    showTwitchPlayer: config.showTwitchPlayer !== false,
    showStandings: config.showStandings !== false,
    showTopPlayers: config.showTopPlayers !== false,
    showChannelCard: config.showChannelCard !== false,
    updatedAt: new Date().toISOString(),
  };

  await set(ref(database, STREAM_OVERLAY_PATH), nextConfig);

  return nextConfig;
}
