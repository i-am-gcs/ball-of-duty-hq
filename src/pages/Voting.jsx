import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import PageHeader from "../components/ui/PageHeader";
import { database } from "../firebase/firebase";

const VISIBLE_AFTER_CLOSE_MS = 24 * 60 * 60 * 1000;

const categoryConfig = {
  training: {
    label: "Edzések",
    icon: "⚽",
    description: "Edzésidőpontok és létszámfelmérések",
  },
  competitive: {
    label: "Tétmeccsek",
    icon: "🏆",
    description: "Fontos mérkőzések és rendelkezésre állás",
  },
};

function getClosingTime(poll) {
  const timestamp = Date.parse(
    poll.expiresAt || poll.syncedAt || poll.createdAt || "",
  );

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getPollState(poll, now) {
  const closingTime = getClosingTime(poll);

  // A Discord tényleges lezárása az elsődleges.
  const closed = Boolean(poll.resultsFinalized);

  const visible =
    !closed ||
    closingTime === null ||
    now - closingTime <= VISIBLE_AFTER_CLOSE_MS;

  return {
    closed,
    visible,
    closingTime,
  };
}

function formatDate(value) {
  if (!value) return "Nincs megadva";

  return new Intl.DateTimeFormat("hu-HU", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function timeLeft(closingTime, closed) {
  if (!closingTime) {
    return closed ? "Lezárva" : "Aktív";
  }

  const difference = closingTime - Date.now();

  if (difference <= 0) {
    return "Lezárva";
  }

  const hours = Math.floor(difference / 3_600_000);
  const minutes = Math.max(1, Math.ceil((difference % 3_600_000) / 60_000));

  return hours > 0
    ? `${hours} óra ${minutes} perc van hátra`
    : `${minutes} perc van hátra`;
}

function PollCard({ poll, state }) {
  const totalVotes =
    poll.answers?.reduce((sum, answer) => sum + (answer.voteCount || 0), 0) ||
    0;

  const highestVoteCount = Math.max(
    0,
    ...(poll.answers || []).map((answer) => answer.voteCount || 0),
  );

  return (
    <article
      className={`panel discord-poll ${
        state.closed ? "discord-poll--closed" : ""
      }`}
    >
      <div className="discord-poll__top">
        <span
          className={`poll-state ${state.closed ? "poll-state--closed" : ""}`}
        >
          {state.closed ? "Lezárult" : "Aktív"}
        </span>

        <span className="discord-poll__time">
          {timeLeft(state.closingTime, state.closed)}
        </span>
      </div>

      <h3>{poll.question}</h3>

      <div className="poll-answers">
        {(poll.answers || []).map((answer) => {
          const votes = answer.voteCount || 0;

          const percentage = totalVotes
            ? Math.round((votes / totalVotes) * 100)
            : 0;

          return (
            <div
              className={`poll-answer ${
                votes === highestVoteCount && votes > 0
                  ? "poll-answer--leading"
                  : ""
              }`}
              key={answer.id}
            >
              <div>
                <span>
                  {answer.emoji && (
                    <span className="poll-answer__emoji">{answer.emoji}</span>
                  )}

                  {answer.text}
                </span>

                <strong>{votes}</strong>
              </div>

              <div className="poll-answer__bar">
                <span style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="discord-poll__footer">
        <span>
          {totalVotes} szavazat ·{" "}
          {poll.allowMultiselect
            ? "Több válasz is jelölhető"
            : "Egy válasz jelölhető"}
        </span>

        <a href={poll.messageUrl} target="_blank" rel="noreferrer">
          Megnyitás Discordon ↗
        </a>
      </div>

      {state.closed && (
        <p className="discord-poll__expiry">
          A lezárástól számítva 24 óráig látható.
        </p>
      )}
    </article>
  );
}

function Voting() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("training");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () =>
      onValue(
        ref(database, "discordPolls"),
        (snapshot) => {
          const pollData = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, poll]) => ({
                id,
                ...poll,
              }))
            : [];

          setPolls(pollData);
          setLoading(false);
        },
        () => {
          setError("Nem sikerült betölteni a Discord-szavazásokat.");
          setLoading(false);
        },
      ),
    [],
  );

  const pollGroups = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(categoryConfig).map((key) => [
          key,
          polls
            .filter((poll) => poll.category === key)
            .map((poll) => ({
              poll,
              state: getPollState(poll, now),
            }))
            .filter(({ state }) => state.visible)
            .sort((a, b) => {
              if (a.state.closed !== b.state.closed) {
                return a.state.closed ? 1 : -1;
              }

              return (b.state.closingTime || 0) - (a.state.closingTime || 0);
            }),
        ]),
      ),
    [polls, now],
  );

  const selectedPolls = pollGroups[category] || [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Discord polls"
        title="Szavazások"
        description="Az edzés- és tétmeccs-szavazások közvetlenül a Discordról érkeznek. A lezárt szavazások 24 óráig maradnak láthatók."
      />

      <div
        className="poll-category-tabs"
        role="tablist"
        aria-label="Szavazási kategóriák"
      >
        {Object.entries(categoryConfig).map(([key, config]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={category === key}
            className={category === key ? "active" : ""}
            onClick={() => setCategory(key)}
          >
            <span>{config.icon}</span>

            <span>
              <strong>{config.label}</strong>
              <small>{pollGroups[key].length} látható</small>
            </span>
          </button>
        ))}
      </div>

      <section className="poll-section">
        <div className="poll-section__heading">
          <div>
            <p className="eyebrow">{categoryConfig[category].label}</p>

            <h2>{categoryConfig[category].description}</h2>
          </div>

          <span>Lezárt szavazások: 24 óra</span>
        </div>

        {loading && (
          <div className="panel crud-state">
            Discord-szavazások betöltése...
          </div>
        )}

        {error && <div className="panel crud-state error-message">{error}</div>}

        {!loading && !error && selectedPolls.length === 0 && (
          <div className="panel poll-empty">
            <span>{categoryConfig[category].icon}</span>

            <h3>Még nincs látható szavazás</h3>

            <p>
              Az aktív vagy az utóbbi 24 órában lezárt Discord-szavazások itt
              jelennek meg.
            </p>
          </div>
        )}

        {!loading && !error && selectedPolls.length > 0 && (
          <div className="discord-poll-grid">
            {selectedPolls.map(({ poll, state }) => (
              <PollCard key={poll.id} poll={poll} state={state} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Voting;
