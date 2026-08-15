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

  const closed =
    Boolean(poll.resultsFinalized) ||
    (closingTime !== null && closingTime <= now);

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

function getPlayerResults(results) {
  return Object.values(results?.playerResults || {});
}

function getUnregisteredVoters(results) {
  return Object.values(results?.votes || {}).filter((vote) => !vote.matched);
}

function PollPlayerResults({ poll, results, closed }) {
  const playerResults = getPlayerResults(results);

  const unregisteredVoters = getUnregisteredVoters(results);

  const votedPlayers = playerResults.filter(
    (player) => player.status === "VOTED",
  );

  const noVotePlayers = playerResults.filter(
    (player) => player.status === "NO_VOTE",
  );

  if (playerResults.length === 0 && unregisteredVoters.length === 0) {
    return (
      <div className="poll-player-results">
        <p className="poll-player-results__empty">
          A játékoseredmények még nem érhetők el.
        </p>
      </div>
    );
  }

  return (
    <div className="poll-player-results">
      <div className="poll-player-results__summary">
        <div>
          <strong>{votedPlayers.length}</strong>
          <span>Szavazott</span>
        </div>

        <div>
          <strong>{noVotePlayers.length}</strong>
          <span>{closed ? "Nem szavazott" : "Még nem szavazott"}</span>
        </div>

        {unregisteredVoters.length > 0 && (
          <div>
            <strong>{unregisteredVoters.length}</strong>
            <span>Nem regisztrált</span>
          </div>
        )}
      </div>

      <div className="poll-player-results__list">
        <div className="poll-player-results__heading">
          <h4>Játékosok</h4>
          <span>{playerResults.length}</span>
        </div>

        {playerResults.map((player) => (
          <div
            className={`poll-player-result ${
              player.status === "VOTED"
                ? "poll-player-result--voted"
                : "poll-player-result--no-vote"
            }`}
            key={player.playerId}
          >
            <div className="poll-player-result__identity">
              <strong>
                {player.nickname || player.name || "Ismeretlen játékos"}
              </strong>

              {player.name &&
                player.nickname &&
                player.name !== player.nickname && <small>{player.name}</small>}
            </div>

            <div className="poll-player-result__vote">
              {player.status === "VOTED" ? (
                <>
                  <span className="poll-player-result__status">
                    ✓ Szavazott
                  </span>

                  <div className="poll-player-result__answers">
                    {(player.answers || []).map((answer) => (
                      <span
                        className="poll-player-result__answer"
                        key={answer.id}
                      >
                        {answer.emoji && <span>{answer.emoji}</span>}

                        {answer.text}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="poll-player-result__status">
                  {closed ? "Nem szavazott" : "Még nem szavazott"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {unregisteredVoters.length > 0 && (
        <div className="poll-unregistered-voters">
          <div className="poll-player-results__heading">
            <h4>Nem regisztrált Discord szavazók</h4>

            <span>{unregisteredVoters.length}</span>
          </div>

          <div className="poll-unregistered-voters__list">
            {unregisteredVoters.map((voter) => (
              <div
                className="poll-unregistered-voter"
                key={voter.discordUserId}
              >
                <span>{voter.username}</span>

                <small>{voter.discordUserId}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PollCard({ poll, state, results, expanded, onToggle }) {
  const totalVotes =
    poll.answers?.reduce((sum, answer) => sum + (answer.voteCount || 0), 0) ||
    0;

  const highestVoteCount = Math.max(
    0,
    ...(poll.answers || []).map((answer) => answer.voteCount || 0),
  );

  const playerResults = getPlayerResults(results);

  const votedCount = playerResults.filter(
    (player) => player.status === "VOTED",
  ).length;

  const noVoteCount = playerResults.filter(
    (player) => player.status === "NO_VOTE",
  ).length;

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
                <span
                  style={{
                    width: `${percentage}%`,
                  }}
                />
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

      {results && (
        <div className="discord-poll__player-summary">
          <span>
            <strong>{votedCount}</strong> szavazott
          </span>

          <span>
            <strong>{noVoteCount}</strong>{" "}
            {state.closed ? "nem szavazott" : "még nem szavazott"}
          </span>
        </div>
      )}

      {results && (
        <button
          type="button"
          className="button button--secondary poll-results-toggle"
          onClick={onToggle}
        >
          {expanded
            ? "Játékoseredmények elrejtése"
            : "Játékoseredmények megjelenítése"}
        </button>
      )}

      {expanded && results && (
        <PollPlayerResults
          poll={poll}
          results={results}
          closed={state.closed}
        />
      )}

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
  const [pollResults, setPollResults] = useState({});

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [category, setCategory] = useState("training");

  const [now, setNow] = useState(Date.now());

  const [expandedPolls, setExpandedPolls] = useState({});

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const pollsRef = ref(database, "discordPolls");

    const resultsRef = ref(database, "discordPollResults");

    let pollsLoaded = false;
    let resultsLoaded = false;

    const handleLoading = () => {
      if (pollsLoaded && resultsLoaded) {
        setLoading(false);
      }
    };

    const unsubscribePolls = onValue(
      pollsRef,
      (snapshot) => {
        const pollData = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, poll]) => ({
              id,
              ...poll,
            }))
          : [];

        setPolls(pollData);
        pollsLoaded = true;
        handleLoading();
      },
      () => {
        setError("Nem sikerült betölteni a Discord-szavazásokat.");

        setLoading(false);
      },
    );

    const unsubscribeResults = onValue(
      resultsRef,
      (snapshot) => {
        const resultData = snapshot.exists() ? snapshot.val() : {};

        setPollResults(resultData);
        resultsLoaded = true;
        handleLoading();
      },
      () => {
        setError("Nem sikerült betölteni a szavazási eredményeket.");

        setLoading(false);
      },
    );

    return () => {
      unsubscribePolls();
      unsubscribeResults();
    };
  }, []);

  function togglePollResults(pollId) {
    setExpandedPolls((current) => ({
      ...current,
      [pollId]: !current[pollId],
    }));
  }

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
              <PollCard
                key={poll.id}
                poll={poll}
                state={state}
                results={pollResults[poll.id]}
                expanded={Boolean(expandedPolls[poll.id])}
                onToggle={() => togglePollResults(poll.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Voting;
