import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { getUpcomingVpgMatches } from "../services/vpgMatchService";

import {
  buildCandidateMap,
  FORMATIONS,
  getAvailablePlayersForDate,
  getFormationList,
  getLineup,
  getMatchDate,
  saveLineup,
} from "../services/lineupService";

import {
  getActiveSeason,
  getSeasonVpgCompetitions,
} from "../services/seasonService";

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("hu-HU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function getPlayerName(player) {
  return player?.nickname || player?.name || "Ismeretlen";
}

function getPlayerInitials(player) {
  const name = getPlayerName(player);

  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/* =========================================================
   FORMATION CONNECTIONS
   ========================================================= */

const FORMATION_CONNECTIONS = {
  "4-3-3": [
    ["lb", "lcb"],
    ["lcb", "rcb"],
    ["rcb", "rb"],

    ["lcb", "cdm"],
    ["rcb", "cdm"],

    ["cdm", "lcm"],
    ["cdm", "rcm"],

    ["lcm", "lw"],
    ["rcm", "rw"],

    ["lw", "cf"],
    ["rw", "cf"],
  ],

  "4-2-3-1": [
    ["lb", "lcb"],
    ["lcb", "rcb"],
    ["rcb", "rb"],

    ["lcb", "ldm"],
    ["rcb", "rdm"],

    ["ldm", "rdm"],

    ["ldm", "cam"],
    ["rdm", "cam"],

    ["cam", "lam"],
    ["cam", "ram"],

    ["lam", "st"],
    ["ram", "st"],
  ],

  "4-4-2": [
    ["lb", "lcb"],
    ["lcb", "rcb"],
    ["rcb", "rb"],

    ["lcb", "lcm"],
    ["rcb", "rcm"],

    ["lm", "lcm"],
    ["lcm", "rcm"],
    ["rcm", "rm"],

    ["lcm", "ls"],
    ["rcm", "rs"],

    ["ls", "rs"],
  ],

  "4-1-2-1-2": [
    ["lb", "lcb"],
    ["lcb", "rcb"],
    ["rcb", "rb"],

    ["lcb", "cdm"],
    ["rcb", "cdm"],

    ["cdm", "lcm"],
    ["cdm", "rcm"],

    ["lcm", "cam"],
    ["rcm", "cam"],

    ["cam", "ls"],
    ["cam", "rs"],

    ["ls", "rs"],
  ],

  "3-5-2": [
    ["lcb", "cb"],
    ["cb", "rcb"],

    ["lcb", "lm"],
    ["rcb", "rm"],

    ["cb", "ldm"],
    ["cb", "rdm"],

    ["ldm", "rdm"],

    ["ldm", "cam"],
    ["rdm", "cam"],

    ["lm", "ls"],
    ["rm", "rs"],

    ["cam", "ls"],
    ["cam", "rs"],

    ["ls", "rs"],
  ],

  "3-1-4-2": [
    ["lcb", "cb"],
    ["cb", "rcb"],

    ["cb", "cdm"],

    ["lcb", "lm"],
    ["rcb", "rm"],

    ["lm", "lcm"],
    ["lcm", "rcm"],
    ["rcm", "rm"],

    ["cdm", "lcm"],
    ["cdm", "rcm"],

    ["lcm", "ls"],
    ["rcm", "rs"],

    ["ls", "rs"],
  ],
};

/* =========================================================
   PLAYER CHIP
   ========================================================= */

function PlayerChip({ player, onDragStart, selected, readOnly }) {
  const name = getPlayerName(player);

  return (
    <button
      type="button"
      className={`lineup-player-chip ${
        selected ? "lineup-player-chip--selected" : ""
      }`}
      draggable={!readOnly}
      onDragStart={
        readOnly ? undefined : (event) => onDragStart(event, player.id)
      }
      title={readOnly ? name : "Húzd a pályára"}
    >
      <span className="lineup-player-chip__avatar">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt="" />
        ) : (
          getPlayerInitials(player)
        )}
      </span>

      <span className="lineup-player-chip__info">
        <strong className="lineup-player-chip__name">{name}</strong>

        <span className="lineup-player-chip__role">
          {player.position || "Játékos"}
        </span>
      </span>

      {selected && <span className="lineup-player-chip__status">✓</span>}
    </button>
  );
}

/* =========================================================
   CONNECTION LAYER
   ========================================================= */

function PitchConnections({ formationId, starters }) {
  const formation = FORMATIONS[formationId];

  if (!formation) {
    return null;
  }

  const slotMap = new Map(
    formation.slots.map(([slotId, _position, x, y]) => [slotId, { x, y }]),
  );

  const connections = FORMATION_CONNECTIONS[formationId] || [];

  return (
    <svg
      className="lineup-pitch__connections"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bodConnectionGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5fffc1" stopOpacity="0.35" />

          <stop offset="50%" stopColor="#ffd21f" stopOpacity="0.95" />

          <stop offset="100%" stopColor="#5fffc1" stopOpacity="0.35" />
        </linearGradient>

        <filter
          id="bodConnectionGlow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="0.9" result="blur" />

          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {connections.map(([fromId, toId]) => {
        const from = slotMap.get(fromId);

        const to = slotMap.get(toId);

        if (!from || !to) {
          return null;
        }

        const fromPlayer = starters[fromId];

        const toPlayer = starters[toId];

        if (!fromPlayer || !toPlayer) {
          return null;
        }

        return (
          <g key={`${fromId}-${toId}`} className="lineup-connection">
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#ffd21f"
              strokeWidth="1.5"
              strokeOpacity="0.22"
              filter="url(#bodConnectionGlow)"
              vectorEffect="non-scaling-stroke"
            />

            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="url(#bodConnectionGradient)"
              strokeWidth="0.45"
              strokeOpacity="0.85"
              strokeDasharray="1.2 0.7"
              vectorEffect="non-scaling-stroke"
            />

            <circle
              cx={(from.x + to.x) / 2}
              cy={(from.y + to.y) / 2}
              r="0.65"
              fill="#ffd21f"
              fillOpacity="0.9"
              filter="url(#bodConnectionGlow)"
            />
          </g>
        );
      })}
    </svg>
  );
}

/* =========================================================
   PITCH SLOT
   ========================================================= */

function PitchSlot({ slot, player, onDrop, onDragStart, onRemove, readOnly }) {
  const [slotId, position, x, y] = slot;

  const name = getPlayerName(player);

  return (
    <div
      className={`lineup-slot ${
        player ? "lineup-slot--filled" : "lineup-slot--empty"
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        zIndex: 3,
      }}
      onDragOver={(event) => {
        if (!readOnly) {
          event.preventDefault();
        }
      }}
      onDrop={readOnly ? undefined : (event) => onDrop(event, slotId)}
      onDoubleClick={readOnly || !player ? undefined : () => onRemove(slotId)}
    >
      {player ? (
        <button
          type="button"
          className="lineup-player-card"
          draggable={!readOnly}
          onDragStart={
            readOnly ? undefined : (event) => onDragStart(event, player.id)
          }
          title={
            readOnly
              ? "Kezdő játékos"
              : "Húzd másik pozícióra vagy dupla kattintás: kivétel"
          }
        >
          <div className="lineup-player-card__glow" />

          <div className="lineup-player-card__avatar">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt="" />
            ) : (
              getPlayerInitials(player)
            )}
          </div>

          <span className="lineup-player-card__number">
            {player.shirtNumber || "•"}
          </span>

          <span className="lineup-player-card__name">{name}</span>

          <span className="lineup-player-card__position">{position}</span>
        </button>
      ) : (
        <span className="lineup-slot__empty">
          <span className="lineup-slot__plus">+</span>

          <small>{position}</small>
        </span>
      )}
    </div>
  );
}

/* =========================================================
   MAIN
   ========================================================= */

export default function LineupBuilder() {
  const { isAdmin } = useAuth();

  const [matches, setMatches] = useState([]);

  const [matchId, setMatchId] = useState("");

  const [formationId, setFormationId] = useState("4-3-3");

  const [players, setPlayers] = useState([]);

  const [allPlayers, setAllPlayers] = useState([]);

  const [poll, setPoll] = useState(null);

  const [matchingPolls, setMatchingPolls] = useState([]);

  const [starters, setStarters] = useState({});

  const [draggedPlayerId, setDraggedPlayerId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const formations = useMemo(() => getFormationList(), []);

  const formation = FORMATIONS[formationId];

  const playerMap = useMemo(() => buildCandidateMap(allPlayers), [allPlayers]);

  const starterIds = useMemo(
    () => new Set(Object.values(starters).filter(Boolean).map(String)),
    [starters],
  );

  const availablePlayers = useMemo(
    () => players.filter((player) => !starterIds.has(String(player.id))),
    [players, starterIds],
  );

  const selectedMatch = useMemo(
    () => matches.find((match) => String(match.id) === String(matchId)) || null,
    [matches, matchId],
  );

  const starterCount = starterIds.size;

  const formationComplete = starterCount === 11;

  /* =========================================================
     LOAD MATCHES
     ========================================================= */

  useEffect(() => {
    async function loadMatches() {
      try {
        setLoading(true);
        setError("");

        const season = await getActiveSeason();

        if (!season) {
          setError("Nincs aktív szezon.");
          return;
        }

        const competitions = getSeasonVpgCompetitions(season);

        const vpgSeasonIds = competitions
          .map(
            (competition) =>
              competition?.vpg?.seasonId || competition?.vpgSeasonId,
          )
          .filter(Boolean);

        if (vpgSeasonIds.length === 0) {
          setError("Az aktív szezonhoz nincs VPG szezon azonosító.");
          return;
        }

        const matchLists = await Promise.all(
          vpgSeasonIds.map((vpgSeasonId) =>
            getUpcomingVpgMatches(vpgSeasonId, 20),
          ),
        );

        const upcoming = [
          ...new Map(
            matchLists.flat().map((match) => [String(match.id), match]),
          ).values(),
        ].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        setMatches(upcoming);

        setMatchId(upcoming[0] ? String(upcoming[0].id) : "");
      } catch (loadError) {
        console.error(loadError);

        setError("Nem sikerült betölteni a következő mérkőzéseket.");
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, []);

  /* =========================================================
     LOAD PLAYERS / POLL / SAVED LINEUP
     ========================================================= */

  useEffect(() => {
    async function loadCandidates() {
      if (!selectedMatch) {
        return;
      }

      const dateKey = getMatchDate(selectedMatch);

      if (!dateKey) {
        setPlayers([]);
        setAllPlayers([]);
        setPoll(null);
        setMatchingPolls([]);
        return;
      }

      try {
        setLoadingCandidates(true);

        setError("");
        setMessage("");

        const [candidateData, saved] = await Promise.all([
          getAvailablePlayersForDate(dateKey),
          getLineup(selectedMatch.id),
        ]);

        setPlayers(candidateData.players);

        setAllPlayers(candidateData.allPlayers);

        setPoll(candidateData.poll);

        setMatchingPolls(candidateData.polls);

        if (saved) {
          setFormationId(saved.formationId || "4-3-3");

          setStarters(saved.starters || {});
        } else {
          setFormationId("4-3-3");

          setStarters({});
        }
      } catch (loadError) {
        console.error(loadError);

        setError(
          "Nem sikerült betölteni a jelenléti szavazást vagy a mentett kezdőt.",
        );
      } finally {
        setLoadingCandidates(false);
      }
    }

    loadCandidates();
  }, [selectedMatch]);

  /* =========================================================
     PLAYER ASSIGNMENT
     ========================================================= */

  function assignPlayer(slotId, playerId) {
    if (!isAdmin) {
      return;
    }

    const normalizedId = String(playerId);

    setStarters((current) => {
      const next = {
        ...current,
      };

      Object.keys(next).forEach((currentSlotId) => {
        if (
          currentSlotId !== slotId &&
          String(next[currentSlotId]) === normalizedId
        ) {
          delete next[currentSlotId];
        }
      });

      next[slotId] = normalizedId;

      return next;
    });
  }

  function handleDragStart(event, playerId) {
    if (!isAdmin) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";

    event.dataTransfer.setData("text/plain", String(playerId));

    setDraggedPlayerId(String(playerId));
  }

  function handleDrop(event, slotId) {
    if (!isAdmin) {
      return;
    }

    event.preventDefault();

    const playerId =
      draggedPlayerId || event.dataTransfer.getData("text/plain");

    if (!playerId || !playerMap.has(String(playerId))) {
      return;
    }

    assignPlayer(slotId, playerId);

    setDraggedPlayerId(null);
  }

  function removeSlot(slotId) {
    if (!isAdmin) {
      return;
    }

    setStarters((current) => {
      const next = {
        ...current,
      };

      delete next[slotId];

      return next;
    });
  }

  function changeFormation(nextFormationId) {
    if (!isAdmin || nextFormationId === formationId) {
      return;
    }

    setFormationId(nextFormationId);

    setStarters({});
  }

  /* =========================================================
     SAVE
     ========================================================= */

  async function handleSave() {
    if (!isAdmin || !selectedMatch) {
      return;
    }

    const count = Object.values(starters).filter(Boolean).length;

    if (count !== 11) {
      setError("A mentéshez töltsd fel mind a 11 pozíciót.");

      return;
    }

    try {
      setSaving(true);

      setError("");
      setMessage("");

      await saveLineup({
        match: selectedMatch,
        formationId,
        starters,

        // A cserepadot az új UI már nem használja.
        // Az adatstruktúra kompatibilitása miatt
        // üres tömböt mentünk.
        substitutes: [],

        pollId: poll?.id || null,
      });

      setMessage("Kezdő 11 sikeresen elmentve.");
    } catch (saveError) {
      console.error(saveError);

      setError(saveError.message || "Nem sikerült elmenteni a kezdőt.");
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <div className="page-shell">
        <p className="muted">Kezdő 11 betöltése...</p>
      </div>
    );
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="page-shell lineup-page">
      <PageHeader
        eyebrow="MATCHDAY"
        title="Kezdő 11"
        description={
          isAdmin
            ? "A lezárt Discord jelenléti szavazás IGEN válaszai alapján állíthatod össze a kezdőt."
            : "A csapat aktuális kezdő 11-ének megtekintése."
        }
      />

      {error && <div className="lineup-alert lineup-alert--error">{error}</div>}

      {message && (
        <div className="lineup-alert lineup-alert--success">{message}</div>
      )}

      {/* =====================================================
          TOOLBAR
          ===================================================== */}

      <section className="lineup-toolbar panel">
        <div className="lineup-toolbar__match">
          <label>
            <span>MÉRKŐZÉS</span>

            <select
              value={matchId}
              onChange={(event) => setMatchId(event.target.value)}
            >
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {formatDate(getMatchDate(match))} — Ball of Duty CF vs{" "}
                  {match.opponentName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="lineup-toolbar__formation">
          <label>
            <span>FORMÁCIÓ</span>

            <select
              value={formationId}
              disabled={!isAdmin}
              onChange={(event) => changeFormation(event.target.value)}
            >
              {formations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="lineup-source-status">
          <span className="lineup-source-status__dot" />

          <div>
            <strong>
              {poll
                ? "Lezárt jelenléti poll megtalálva"
                : "Nincs megfelelő lezárt poll"}
            </strong>

            <small>
              {poll
                ? `${players.length} IGEN játékos · ${poll.closedAt}`
                : `${getMatchDate(selectedMatch) || "-"} napjára`}

              {!isAdmin && " · Megtekintési mód"}
            </small>
          </div>
        </div>
      </section>

      {/* =====================================================
          MULTIPLE POLLS
          ===================================================== */}

      {matchingPolls.length > 1 && (
        <section className="lineup-poll-list panel">
          <strong>Több lezárt poll van erre a napra</strong>

          <span>A legutóbbi lezárt poll kerül automatikusan használatra.</span>

          <div>
            {matchingPolls.map(
              ({ poll: item, availablePlayers: pollPlayers }) => (
                <span
                  key={item.id}
                  className={item.id === poll?.id ? "active" : ""}
                >
                  {item.question} · {pollPlayers.length} IGEN
                </span>
              ),
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          WORKSPACE
          ===================================================== */}

      <section className="lineup-workspace">
        {/* ===================================================
            LEFT — AVAILABLE PLAYERS
            =================================================== */}

        <aside className="lineup-roster panel">
          <div className="lineup-panel-heading">
            <div>
              <span className="eyebrow">AVAILABLE</span>

              <h2>Bevethető játékosok</h2>
            </div>

            <strong>{players.length}</strong>
          </div>

          <p className="lineup-help">
            Csak az adott meccsnap lezárt Discord jelenléti pollján IGEN-t
            válaszoló aktív játékosok jelennek meg.
          </p>

          <div className="lineup-roster-list">
            {players.length === 0 && (
              <p className="muted">Nincs bevethető játékos erre a napra.</p>
            )}

            {availablePlayers.map((player) => (
              <PlayerChip
                key={player.id}
                player={player}
                selected={starterIds.has(String(player.id))}
                readOnly={!isAdmin}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </aside>

        {/* ===================================================
            CENTER — MATCHDAY XI
            =================================================== */}

        <main className="lineup-pitch-panel">
          <div className="lineup-match-heading">
            <div>
              <span className="eyebrow">BALL OF DUTY CF</span>

              <h2>Matchday XI</h2>

              <p>{selectedMatch ? `vs ${selectedMatch.opponentName}` : "-"}</p>
            </div>

            <div className="lineup-match-heading__right">
              <div className="lineup-match-heading__status">
                <span className={formationComplete ? "complete" : ""}>
                  {starterCount}
                </span>

                <small>/ 11</small>
              </div>

              <span className="lineup-formation-badge">{formationId}</span>
            </div>
          </div>

          <div className="lineup-pitch">
            <div className="pitch-glow pitch-glow--gold" />

            <div className="pitch-glow pitch-glow--green" />

            <div className="pitch-line pitch-line--half" />

            <div className="pitch-circle" />

            <div className="pitch-box pitch-box--top" />

            <div className="pitch-box pitch-box--bottom" />

            <div className="pitch-goal pitch-goal--top" />

            <div className="pitch-goal pitch-goal--bottom" />

            <PitchConnections formationId={formationId} starters={starters} />

            {formation?.slots.map((slot) => {
              const player = playerMap.get(String(starters[slot[0]]));

              return (
                <PitchSlot
                  key={slot[0]}
                  slot={slot}
                  player={player}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                  onRemove={removeSlot}
                  readOnly={!isAdmin}
                />
              );
            })}
          </div>

          {/* SAVE / VIEWER AREA */}

          {isAdmin ? (
            <button
              type="button"
              className="button lineup-save"
              disabled={saving || loadingCandidates}
              onClick={handleSave}
            >
              {saving ? "Mentés..." : "Kezdő 11 mentése"}
            </button>
          ) : (
            <div className="lineup-viewer-note">
              A kezdő 11-et csak az Admin szerkesztheti.
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
