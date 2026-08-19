import "dotenv/config";

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Hiányzó környezeti változó: ${name}`);
  }

  return value;
}

function getOptionalEnvironmentVariable(name) {
  return process.env[name]?.trim() || "";
}

function parsePollChannels(value) {
  return new Map(
    value.split(",").map((channelSetting) => {
      const [channelId, category] = channelSetting.split(":");

      if (!channelId?.trim() || !category?.trim()) {
        throw new Error(`Hibás csatornabeállítás: ${channelSetting}`);
      }

      return [channelId.trim(), category.trim()];
    }),
  );
}

export const config = {
  discordToken: getRequiredEnvironmentVariable("DISCORD_BOT_TOKEN"),
  guildId: getRequiredEnvironmentVariable("DISCORD_GUILD_ID"),
  pollChannels: parsePollChannels(
    getRequiredEnvironmentVariable("DISCORD_POLL_CHANNELS"),
  ),
  firebaseDatabaseUrl: getRequiredEnvironmentVariable("FIREBASE_DATABASE_URL"),
  firebaseServiceAccountBase64: getRequiredEnvironmentVariable(
    "FIREBASE_SERVICE_ACCOUNT_BASE64",
  ),
  twitchClientId: getOptionalEnvironmentVariable("TWITCH_CLIENT_ID"),
  twitchClientSecret: getOptionalEnvironmentVariable("TWITCH_CLIENT_SECRET"),
  twitchChannel: getOptionalEnvironmentVariable("TWITCH_CHANNEL") || "ballofdutycf",
};
