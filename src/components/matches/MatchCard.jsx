import { Link } from "react-router-dom";

function MatchCard({ match, onEdit, onDelete, deleting }) {
  const isBallOfDutyHome = match.homeTeam === "Ball of Duty";

  const ballOfDutyScore = isBallOfDutyHome
    ? match.homeScore
    : match.awayScore;

  const opponentScore = isBallOfDutyHome
    ? match.awayScore
    : match.homeScore;

  const result =
    ballOfDutyScore > opponentScore
      ? "win"
      : ballOfDutyScore < opponentScore
        ? "loss"
        : "draw";

  const resultLabel = {
    win: "Győzelem",
    draw: "Döntetlen",
    loss: "Vereség",
  };

  return (
    <article className="panel match-card">
      <div className="match-card__header">
        <div>
          <span>{match.competition}</span>
          <strong>{match.stage}</strong>
        </div>

        <span
          className={`match-card__result match-card__result--${result}`}
        >
          {resultLabel[result]}
        </span>
      </div>

      <div className="match-card__scoreboard">
        <div className="match-card__team">
          <span>Hazai</span>
          <strong>{match.homeTeam}</strong>
        </div>

        <div className="match-card__score">
          <strong>{match.homeScore}</strong>
          <span>–</span>
          <strong>{match.awayScore}</strong>
        </div>

        <div className="match-card__team match-card__team--away">
          <span>Vendég</span>
          <strong>{match.awayTeam}</strong>
        </div>
      </div>

      <footer className="match-card__footer">
        <span>{match.date ?? "Dátum még nincs rögzítve"}</span>

        <Link
          to={`/matches/${match.id}`}
          className="match-card__details"
        >
          Részletek →
        </Link>
      </footer>
      {onEdit && onDelete && <div className="match-card__actions">
        <button className="button button--secondary" type="button" onClick={() => onEdit(match)}>Szerkesztés</button>
        <button className="button match-card__delete" type="button" disabled={deleting} onClick={() => onDelete(match)}>{deleting ? "Törlés..." : "Törlés"}</button>
      </div>}
    </article>
  );
}

export default MatchCard;
