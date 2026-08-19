import { get, ref, set } from "firebase/database";
import { database } from "../firebase/firebase";

const STREAM_OVERLAY_PATH = "streamOverlay/current";

const DEFAULT_CONFIG = {
  activeSeasonId: "",
  activeCompetitionId: "",
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

  return { ...DEFAULT_CONFIG, ...snapshot.val() };
}

export async function saveStreamOverlayConfig(config) {
  const nextConfig = {
    activeSeasonId: config.activeSeasonId || "",
    activeCompetitionId: config.activeCompetitionId || "",
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
