import { FORMATIONS } from "../../services/lineupService";
import "./MatchdayXI.css";

function getPlayerName(player) {
  return (
    player?.nickname || player?.name || player?.discordName || "Ismeretlen"
  );
}

function getPlayerInitials(player) {
  const name = getPlayerName(player);

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatMatchDate(datetime) {
  if (!datetime) {
    return "-";
  }

  const date = new Date(datetime);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("hu-HU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatKickoff(datetime) {
  if (!datetime) {
    return "--:--";
  }

  const date = new Date(datetime);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* =========================================================
   PLAYER CARD
   ========================================================= */

function MatchdayPlayerCard({ player, position }) {
  if (!player) {
    return null;
  }

  const name = getPlayerName(player);

  return (
    <div className="matchday-player">
      <div className="matchday-player__card">
        <div className="matchday-player__glow" />

        <div className="matchday-player__avatar">
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" />
          ) : (
            <span>{getPlayerInitials(player)}</span>
          )}
        </div>

        <strong className="matchday-player__name">{name}</strong>

        <span className="matchday-player__position">{position}</span>
      </div>
    </div>
  );
}

/* =========================================================
   CONNECTIONS
   ========================================================= */

function MatchdayConnections({ formationId, starters }) {
  const formation = FORMATIONS[formationId];

  if (!formation) {
    return null;
  }

  const slotMap = new Map(
    formation.slots.map(([slotId, position, x, y]) => [
      slotId,
      {
        position,
        x,
        y,
      },
    ]),
  );

  const connectionsByFormation = {
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

  const connections = connectionsByFormation[formationId] || [];

  return (
    <svg
      className="matchday-pitch__connections"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="matchdayConnectionGradient"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0%" stopColor="#45e89a" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#ffd84a" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#45e89a" stopOpacity="0.15" />
        </linearGradient>

        <filter
          id="matchdayConnectionGlow"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="0.8" result="blur" />

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

        if (!starters[fromId] || !starters[toId]) {
          return null;
        }

        return (
          <g key={`${fromId}-${toId}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#ffd84a"
              strokeWidth="1.6"
              strokeOpacity="0.2"
              filter="url(#matchdayConnectionGlow)"
              vectorEffect="non-scaling-stroke"
            />

            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="url(#matchdayConnectionGradient)"
              strokeWidth="0.45"
              strokeOpacity="0.85"
              strokeDasharray="1.4 0.7"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function MatchdayXI({ match, lineup, players }) {
  if (!match || !lineup) {
    return null;
  }

  const formationId = lineup.formationId || "4-3-3";
  const formation = FORMATIONS[formationId];

  if (!formation) {
    return null;
  }

  const playerMap = new Map(
    players.map((player) => [String(player.id), player]),
  );

  const starters = lineup.starters || {};

  return (
    <section className="matchday-xi">
      <header className="matchday-header">
        <div className="matchday-header__brand">
          <span className="matchday-header__eyebrow">BALL OF DUTY CF</span>

          <h1>MATCHDAY XI</h1>

          <div className="matchday-header__accent" />
        </div>

        <div className="matchday-header__match">
          <div className="matchday-team">
            {match.isHome && match.homeLogo && (
              <img src={match.homeLogo} alt="" />
            )}

            <strong>BALL OF DUTY CF</strong>
          </div>

          <div className="matchday-vs">
            <span>VS</span>
          </div>

          <div className="matchday-team matchday-team--opponent">
            {match.isHome && match.awayLogo && (
              <img src={match.awayLogo} alt="" />
            )}

            {match.isAway && match.homeLogo && (
              <img src={match.homeLogo} alt="" />
            )}

            <strong>{match.opponentName || "-"}</strong>
          </div>
        </div>

        <div className="matchday-meta">
          <div>
            <span>DÁTUM</span>
            <strong>{formatMatchDate(match.datetime)}</strong>
          </div>

          <div>
            <span>KEZDÉS</span>
            <strong>{formatKickoff(match.datetime)}</strong>
          </div>

          <div>
            <span>FORMÁCIÓ</span>
            <strong>{formationId}</strong>
          </div>
        </div>
      </header>

      <div className="matchday-stage">
        <div className="matchday-stage__top">
          <div>
            <span>STARTING XI</span>
            <strong>{formation.label}</strong>
          </div>

          <div className="matchday-stage__league">
            {match.leagueName || match.tournamentName || "VPG"}
          </div>
        </div>

        <div className="matchday-pitch">
          <div className="matchday-pitch__glow matchday-pitch__glow--gold" />

          <div className="matchday-pitch__glow matchday-pitch__glow--green" />

          <div className="matchday-pitch__half-line" />

          <div className="matchday-pitch__circle" />

          <div className="matchday-pitch__box matchday-pitch__box--top" />

          <div className="matchday-pitch__box matchday-pitch__box--bottom" />

          <div className="matchday-pitch__goal matchday-pitch__goal--top" />

          <div className="matchday-pitch__goal matchday-pitch__goal--bottom" />

          <MatchdayConnections formationId={formationId} starters={starters} />

          {formation.slots.map(([slotId, position, x, y]) => {
            const playerId = starters[slotId];
            const player = playerMap.get(String(playerId));

            if (!player) {
              return null;
            }

            return (
              <div
                key={slotId}
                className="matchday-pitch__slot"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              >
                <MatchdayPlayerCard player={player} position={position} />
              </div>
            );
          })}
        </div>
      </div>

      <footer className="matchday-footer">
        <span>BALL OF DUTY CF</span>
        <span>MATCHDAY XI</span>
        <span>{formationId}</span>
      </footer>
    </section>
  );
}
