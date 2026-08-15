import { Client, GatewayIntentBits } from "discord.js";
import { database } from "../src/firebase.js";
import { config } from "../src/config.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function migrateDiscordIds() {
  console.log("Discord ID migráció indítása...");

  const guild = await client.guilds.fetch(config.guildId);

  if (!guild) {
    throw new Error("Nem található a beállított Discord szerver.");
  }

  console.log(`Discord szerver: ${guild.name}`);

  const members = await guild.members.fetch();

  console.log(`Discord tagok száma: ${members.size}`);

  const snapshot = await database.ref("players").once("value");

  if (!snapshot.exists()) {
    console.log("A players adatbáziság üres.");
    return;
  }

  const playersData = snapshot.val();

  const updates = {};
  let matched = 0;
  let unmatched = 0;

  for (const [playerId, player] of Object.entries(playersData)) {
    const discordUsername = normalizeUsername(player.discordName);

    if (!discordUsername) {
      console.warn(`Nincs discordName: ${player.name || playerId}`);

      unmatched++;
      continue;
    }

    const member = members.find(
      (guildMember) =>
        normalizeUsername(guildMember.user.username) === discordUsername,
    );

    if (!member) {
      console.warn(
        `Nem található Discord tag: ${player.name} (${player.discordName})`,
      );

      unmatched++;
      continue;
    }

    updates[`players/${playerId}/discordName`] = member.user.username;

    updates[`players/${playerId}/discordId`] = member.user.id;

    console.log(
      `✓ ${player.name} → ${member.user.username} (${member.user.id})`,
    );

    matched++;
  }

  if (Object.keys(updates).length === 0) {
    console.log("Nem volt módosítható játékos.");
    return;
  }

  await database.ref().update(updates);

  console.log("");
  console.log("Discord ID migráció kész.");
  console.log(`Sikeresen párosítva: ${matched}`);
  console.log(`Nem párosítható: ${unmatched}`);
}

client.once("ready", async () => {
  try {
    await migrateDiscordIds();
  } catch (error) {
    console.error("Discord ID migrációs hiba:", error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(config.discordToken);
