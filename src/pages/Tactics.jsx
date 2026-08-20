import { Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import { tactics } from "../data/tactics";
import "../styles/tactics.css";

function FormationPreview({ formation }) {
  const rows = formation === "3-5-2" ? [2, 5, 3, 1] : formation === "4-2-3-1" ? [1, 3, 2, 4, 1] : [3, 3, 4, 1];

  return (
    <div className="tactic-formation" aria-hidden="true">
      {rows.map((count, rowIndex) => (
        <div className="tactic-formation__row" key={`${formation}-${rowIndex}`}>
          {Array.from({ length: count }, (_, playerIndex) => <span key={`${rowIndex}-${playerIndex}`} />)}
        </div>
      ))}
    </div>
  );
}

function CornerPreview() {
  return (
    <div className="corner-preview" aria-hidden="true">
      <span className="corner-preview__arc" />
      <span className="corner-preview__ball" />
      <span className="corner-preview__route corner-preview__route--one" />
      <span className="corner-preview__route corner-preview__route--two" />
      <span className="corner-preview__route corner-preview__route--three" />
      <span className="corner-preview__player corner-preview__player--one" />
      <span className="corner-preview__player corner-preview__player--two" />
      <span className="corner-preview__player corner-preview__player--three" />
    </div>
  );
}

function Tactics() {
  return (
    <div className="page-stack tactics-page">
      <PageHeader
        eyebrow="Team Playbook"
        title="Taktikák"
        description="A Ball of Duty három alapfelállása, szerepkörei és mérkőzés közbeni játékelvei."
      />

      <section className="tactics-grid" aria-label="Választható taktikák">
        {tactics.map((tactic, index) => (
          <Link className="tactic-card" key={tactic.slug} to={`/tactics/${tactic.slug}`}>
            <div className="tactic-card__topline">
              <span className="eyebrow">Taktika 0{index + 1}</span>
              <span className="tactic-card__arrow">→</span>
            </div>
            {tactic.type === "set-piece" ? (
              <CornerPreview />
            ) : (
              <FormationPreview formation={tactic.name} />
            )}
            <div className="tactic-card__copy">
              <span>{tactic.label}</span>
              <h2>{tactic.name}{tactic.label === "False 9" ? " (False 9)" : ""}</h2>
              <p>{tactic.summary}</p>
              <strong>{tactic.accent}</strong>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

export default Tactics;
