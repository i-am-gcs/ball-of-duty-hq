import { database } from "./firebase.js";

async function getVotesByUser(poll) {
  const votesByUser = {};

  for (const answer of poll.answers.values()) {
    const voters = await answer.voters.fetch({ limit: 100 });

    voters.forEach((user) => {
      if (!votesByUser[user.id]) {
        votesByUser[user.id] = {
          discordUserId: user.id,
          username: user.username,
          answerIds: [],
        };
      }

      votesByUser[user.id].answerIds.push(answer.id);
    });
  }

  return votesByUser;
}

function serializePoll(message, category) {
  const { poll } = message;

  return {
    discordMessageId: message.id,
    discordChannelId: message.channelId,
    discordGuildId: message.guildId,
    category,
    question: poll.question.text || "Névtelen szavazás",
    answers: [...poll.answers.values()].map((answer) => ({
      id: answer.id,
      text: answer.text || "Névtelen válasz",
      emoji: answer.emoji?.toString() || null,
      voteCount: answer.voteCount,
    })),
    allowMultiselect: poll.allowMultiselect,
    expiresAt: poll.expiresAt?.toISOString() || null,
    resultsFinalized: poll.resultsFinalized,
    author: {
      discordUserId: message.author.id,
      username: message.author.username,
    },
    messageUrl: message.url,
    createdAt: message.createdAt.toISOString(),
    syncedAt: new Date().toISOString(),
  };
}

export async function syncPollMessage(message, category) {
  if (!message.poll) {
    return false;
  }

  const pollData = serializePoll(message, category);
  const votesByUser = await getVotesByUser(message.poll);

  await Promise.all([
    database.ref(`discordPolls/${message.id}`).set(pollData),
    database.ref(`discordVotes/${message.id}`).set(votesByUser),
  ]);

  console.log(`Szavazás szinkronizálva: ${pollData.question}`);
  return true;
}

export async function syncRecentChannelPolls(channel, category) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const pollMessages = messages.filter((message) => message.poll);

  for (const message of pollMessages.values()) {
    try {
      await syncPollMessage(message, category);
    } catch (error) {
      console.error(`Nem sikerült szinkronizálni a pollt (${message.id}):`, error);
    }
  }

  console.log(`${channel.name}: ${pollMessages.size} poll feldolgozva.`);
}
