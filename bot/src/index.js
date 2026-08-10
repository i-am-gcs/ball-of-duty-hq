import {
  Client,
  Events,
  GatewayIntentBits,
} from "discord.js";
import { config } from "./config.js";
import { syncPollMessage, syncRecentChannelPolls } from "./pollSync.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessagePolls,
  ],
});

function getChannelCategory(channelId) {
  return config.pollChannels.get(channelId) || null;
}

async function resyncPollAnswer(pollAnswer) {
  const message = await pollAnswer.poll.message.fetch();
  const category = getChannelCategory(message.channelId);

  if (!category || message.guildId !== config.guildId) {
    return;
  }

  await syncPollMessage(message, category);
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Discord bot elindult: ${readyClient.user.tag}`);

  for (const [channelId, category] of config.pollChannels) {
    try {
      const channel = await readyClient.channels.fetch(channelId);

      if (!channel?.isTextBased() || !channel.messages) {
        console.error(`A beállított csatorna nem szöveges: ${channelId}`);
        continue;
      }

      await syncRecentChannelPolls(channel, category);
    } catch (error) {
      console.error(`Nem sikerült feldolgozni a csatornát (${channelId}):`, error);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  const category = getChannelCategory(message.channelId);

  if (!category || message.guildId !== config.guildId || !message.poll) {
    return;
  }

  try {
    await syncPollMessage(message, category);
  } catch (error) {
    console.error(`Új poll szinkronizálási hiba (${message.id}):`, error);
  }
});

client.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
  const category = getChannelCategory(newMessage.channelId);

  if (!category || newMessage.guildId !== config.guildId || !newMessage.poll) {
    return;
  }

  try {
    await syncPollMessage(newMessage, category);
  } catch (error) {
    console.error(`Poll frissítési hiba (${newMessage.id}):`, error);
  }
});

client.on(Events.MessagePollVoteAdd, async (pollAnswer) => {
  try {
    await resyncPollAnswer(pollAnswer);
  } catch (error) {
    console.error("Szavazat hozzáadási szinkronhiba:", error);
  }
});

client.on(Events.MessagePollVoteRemove, async (pollAnswer) => {
  try {
    await resyncPollAnswer(pollAnswer);
  } catch (error) {
    console.error("Szavazat visszavonási szinkronhiba:", error);
  }
});

client.login(config.discordToken);
