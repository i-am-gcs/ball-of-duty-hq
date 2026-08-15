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

/* ==================================================
   POLL HELPERS
   ================================================== */

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

/* ==================================================
   RESULTS
   ================================================== */

function getPlayerResults(results) {
  return Object.values(results?.playerResults || {});
}

function getUnregisteredVoters(results) {
  return Object.values(results?.votes || {}).filter((vote) => !vote.matched);
}

/* ==================================================
   POLL DATE
   ==================================================

   Elsőként a poll objektum dátummezőit nézzük.

   Ha ezek nem léteznek, megpróbáljuk a kérdésből
   kinyerni az MM.DD formátumot.

   Példa:
   "08.23 - Vasárnap - Edzés - 19:50"
   */

function getPollDate(poll) {
  const directDate =
    poll.date ||
    poll.eventDate ||
    poll.matchDate ||
    poll.trainingDate ||
    poll.kickoffDate;

  if (directDate) {
    const parsed = new Date(directDate);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }

    /*
     * Ha már YYYY-MM-DD formátumú
     */
    if (/^\d{4}-\d{2}-\d{2}$/.test(directDate)) {
      return directDate;
    }
  }

  /*
   * Példa:
   * 08.23
   * 08. 23.
   */
  const text = poll.question || poll.title || "";

  const match = text.match(/(\d{1,2})\.\s*(\d{1,2})\.?/);

  if (!match) {
    return null;
  }

  const month = Number(match[1]);

  const day = Number(match[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  /*
   * Normál esetben az aktuális év.
   *
   * Ez a mostani BoD rendszerben megfelelő,
   * mert a pollok aktuális szezonhoz tartoznak.
   */
  const year = new Date().getFullYear();

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

/* ==================================================
   ABSENCE HELPERS
   ================================================== */

function isPlayerAbsent(playerId, pollDate, absences) {
  if (!playerId || !pollDate) {
    return null;
  }

  const absence = absences.find(
    (item) =>
      item.playerId === playerId &&
      pollDate >= item.startDate &&
      pollDate <= item.endDate,
  );

  return absence || null;
}

/* ==================================================
   SORT
   ================================================== */

function sortPlayersByVoteStatus(players) {
  return [...players].sort((a, b) => {
    const getPriority = (player) => {
      if (player.status === "VOTED") {
        return 0;
      }

      if (player.status === "ABSENT") {
        return 1;
      }

      return 2;
    };

    const aPriority = getPriority(a);

    const bPriority = getPriority(b);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aName = a.nickname || a.name || "";

    const bName = b.nickname || b.name || "";

    return aName.localeCompare(bName, "hu");
  });
}

/* ==================================================
   PLAYER RESULTS
   ================================================== */

function PollPlayerResults({ poll, results, closed, absences }) {
  const playerResults = getPlayerResults(results);

  const unregisteredVoters = getUnregisteredVoters(results);

  const pollDate = getPollDate(poll);

  /*
   * Távollét státusz hozzáadása
   */
  const enrichedPlayers = playerResults.map((player) => {
    const absence = isPlayerAbsent(player.playerId, pollDate, absences);

    /*
     * Csak a NO_VOTE játékost
     * változtatjuk ABSENT státuszra.
     *
     * Ha valaki szavazott,
     * akkor továbbra is
     * "Szavazott" marad.
     */
    if (player.status === "NO_VOTE" && absence) {
      return {
        ...player,
        status: "ABSENT",
        absenceReason: absence.reason || "",
        absenceStartDate: absence.startDate,
        absenceEndDate: absence.endDate,
      };
    }

    return player;
  });

  const votedPlayers = enrichedPlayers.filter(
    (player) => player.status === "VOTED",
  );

  const absentPlayers = enrichedPlayers.filter(
    (player) => player.status === "ABSENT",
  );

  const noVotePlayers = enrichedPlayers.filter(
    (player) => player.status === "NO_VOTE",
  );

  const sortedPlayerResults = sortPlayersByVoteStatus(enrichedPlayers);

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
      {/* =========================================
          SUMMARY
          ========================================= */}

      <div className="poll-player-results__summary">
        <div>
          <strong>{votedPlayers.length}</strong>

          <span>Szavazott</span>
        </div>

        <div>
          <strong>{absentPlayers.length}</strong>

          <span>Távolléten</span>
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

      {/* =========================================
          PLAYERS
          ========================================= */}

      <div className="poll-player-results__list">
        <div className="poll-player-results__heading">
          <h4>Játékosok</h4>

          <span>{enrichedPlayers.length}</span>
        </div>

        {sortedPlayerResults.map((player) => (
          <div
            className={`poll-player-result ${
              player.status === "VOTED"
                ? "poll-player-result--voted"
                : player.status === "ABSENT"
                  ? "poll-player-result--absent"
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
              ) : player.status === "ABSENT" ? (
                <div className="poll-player-result__absence">
                  <span className="poll-player-result__status">
                    ⚠ Távolléten
                  </span>

                  {player.absenceReason && (
                    <small>{player.absenceReason}</small>
                  )}
                </div>
              ) : (
                <span className="poll-player-result__status">
                  {closed ? "Nem szavazott" : "Még nem szavazott"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* =========================================
          UNREGISTERED
          ========================================= */}

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

/* ==================================================
   POLL CARD
   ================================================== */

function PollCard({ poll, state, results, expanded, onToggle, absences }) {
  const totalVotes =
    poll.answers?.reduce((sum, answer) => sum + (answer.voteCount || 0), 0) ||
    0;

  const highestVoteCount = Math.max(
    0,
    ...(poll.answers || []).map((answer) => answer.voteCount || 0),
  );

  const playerResults = getPlayerResults(results);

  const pollDate = getPollDate(poll);

  /*
   * Távollétes játékosok
   */
  const enrichedPlayers = playerResults.map((player) => {
    const absence = isPlayerAbsent(player.playerId, pollDate, absences);

    if (player.status === "NO_VOTE" && absence) {
      return {
        ...player,
        status: "ABSENT",
      };
    }

    return player;
  });

  const votedCount = enrichedPlayers.filter(
    (player) => player.status === "VOTED",
  ).length;

  const absentCount = enrichedPlayers.filter(
    (player) => player.status === "ABSENT",
  ).length;

  const noVoteCount = enrichedPlayers.filter(
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
            <strong>{absentCount}</strong> távolléten
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
          absences={absences}
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

/* ==================================================
   VOTING
   ================================================== */

function Voting() {
  const [polls, setPolls] = useState([]);

  const [pollResults, setPollResults] = useState({});

  const [absences, setAbsences] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [category, setCategory] = useState("training");

  const [now, setNow] = useState(Date.now());

  const [expandedPolls, setExpandedPolls] = useState({});

  /* ---------------------------------------------
     CLOCK
     --------------------------------------------- */

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => window.clearInterval(timer);
  }, []);

  /* ---------------------------------------------
     FIREBASE
     --------------------------------------------- */

  useEffect(() => {
    const pollsRef = ref(database, "discordPolls");

    const resultsRef = ref(database, "discordPollResults");

    const absencesRef = ref(database, "absences");

    let pollsLoaded = false;
    let resultsLoaded = false;
    let absencesLoaded = false;

    const handleLoading = () => {
      if (pollsLoaded && resultsLoaded && absencesLoaded) {
        setLoading(false);
      }
    };

    /* -------------------------------------------
       POLLS
       ------------------------------------------- */

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

    /* -------------------------------------------
       RESULTS
       ------------------------------------------- */

    const unsubscribeResults = onValue(
      resultsRef,
      (snapshot) => {
        const resultData = snapshot.exists() ? snapshot.val() : {};

        setPollResults(resultData);

        resultsLoaded = true;

        handleLoading();
      },
      (firebaseError) => {
        console.error("discordPollResults betöltési hiba:", firebaseError);

        setError("Nem sikerült betölteni a szavazási eredményeket.");

        setLoading(false);
      },
    );

    /* -------------------------------------------
       ABSENCES
       ------------------------------------------- */

    const unsubscribeAbsences = onValue(
      absencesRef,
      (snapshot) => {
        const absenceData = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, absence]) => ({
              id,
              ...absence,
            }))
          : [];

        setAbsences(absenceData);

        absencesLoaded = true;

        handleLoading();
      },
      (firebaseError) => {
        console.error("absences betöltési hiba:", firebaseError);

        /*
         * Ha az absences nem töltődik,
         * ne törjük el a teljes Voting oldalt.
         *
         * Ilyenkor egyszerűen üres
         * távolléti listával működik tovább.
         */
        setAbsences([]);

        absencesLoaded = true;

        handleLoading();
      },
    );

    return () => {
      unsubscribePolls();
      unsubscribeResults();
      unsubscribeAbsences();
    };
  }, []);

  /* ---------------------------------------------
     EXPAND
     --------------------------------------------- */

  function togglePollResults(pollId) {
    setExpandedPolls((current) => ({
      ...current,
      [pollId]: !current[pollId],
    }));
  }

  /* ---------------------------------------------
     GROUPS
     --------------------------------------------- */

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

  /* ---------------------------------------------
     RENDER
     --------------------------------------------- */

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
                absences={absences}
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
