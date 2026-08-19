import { config } from "./config.js";
import { database } from "./firebase.js";

const POLL_INTERVAL_MS = 60_000;
let accessToken = "";
let accessTokenExpiresAt = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < accessTokenExpiresAt - 60_000) {
    return accessToken;
  }

  const tokenUrl = new URL("https://id.twitch.tv/oauth2/token");
  tokenUrl.searchParams.set("client_id", config.twitchClientId);
  tokenUrl.searchParams.set("client_secret", config.twitchClientSecret);
  tokenUrl.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Twitch token hiba: ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  accessTokenExpiresAt = Date.now() + Number(data.expires_in || 0) * 1000;
  return accessToken;
}

async function syncTwitchStatus() {
  const token = await getAccessToken();
  const streamsUrl = new URL("https://api.twitch.tv/helix/streams");
  streamsUrl.searchParams.set("user_login", config.twitchChannel);

  const response = await fetch(streamsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": config.twitchClientId,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      accessToken = "";
      accessTokenExpiresAt = 0;
    }
    throw new Error(`Twitch stream státusz hiba: ${response.status}`);
  }

  const data = await response.json();
  const stream = data.data?.[0] || null;
  const status = {
    channel: config.twitchChannel,
    isLive: Boolean(stream),
    title: stream?.title || "",
    gameName: stream?.game_name || "",
    viewerCount: Number(stream?.viewer_count || 0),
    startedAt: stream?.started_at || null,
    thumbnailUrl: stream?.thumbnail_url || "",
    checkedAt: new Date().toISOString(),
  };

  await database.ref("twitchStatus/current").set(status);
  console.log(`Twitch állapot: ${status.isLive ? "LIVE" : "offline"}`);
}

export function startTwitchStatusSync() {
  if (!config.twitchClientId || !config.twitchClientSecret) {
    console.warn("Twitch státuszfigyelés kikapcsolva: hiányzó TWITCH_CLIENT_ID vagy TWITCH_CLIENT_SECRET.");
    return;
  }

  const run = () => syncTwitchStatus().catch((error) => {
    console.error("Twitch státusz szinkronizálási hiba:", error);
  });

  run();
  setInterval(run, POLL_INTERVAL_MS);
}
