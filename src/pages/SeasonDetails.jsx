import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SeasonStatistics from "../components/seasons/SeasonStatistics";
import { getSeasonById } from "../services/seasonService";

const statusLabels = { active: "Aktív szezon", upcoming: "Közelgő szezon", completed: "Lezárt szezon" };

function SeasonDetails() {
  const { seasonId } = useParams();
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSeasonById(seasonId)
      .then(setSeason)
      .catch((error) => console.error("Hiba a szezon betöltésekor:", error))
      .finally(() => setLoading(false));
  }, [seasonId]);

  if (loading) return <div className="page-stack"><section className="panel crud-state">Szezon betöltése...</section></div>;
  if (!season) return <div className="page-stack"><section className="panel season-details__not-found"><h2>A szezon nem található</h2><Link to="/seasons" className="button button--secondary">Vissza</Link></section></div>;

  const podium = season.awards?.seasonPlayerPodium || [];
  const individualAwards = season.awards?.individualAwards || [];

  return (
    <div className="page-stack">
      <Link to="/seasons" className="season-details__back">← Vissza a szezonokhoz</Link>
      <header className="panel season-details__hero">
        <div className="season-details__hero-top"><span className={`status-pill ${season.status === "active" ? "status-pill--success" : ""}`}>{statusLabels[season.status] || season.status}</span><span className="season-details__number">Season {season.id}</span></div>
        <p className="eyebrow">Ball of Duty</p><h2>{season.name}</h2>
        <p className="season-details__period">{season.period?.start || "–"} – {season.period?.end || "folyamatban"}</p>
      </header>

      <SeasonStatistics competitions={season.competitions || []} />
      <section><div className="season-details__section-heading"><div><p className="eyebrow">Competitions</p><h3>Versenyek</h3></div></div>
        <div className="season-details__competition-grid">{(season.competitions || []).map((competition) => <article className="panel season-details__competition-card" key={competition.id || competition.name}><div className="season-details__competition-header"><div><span>{competition.type}</span><h4>{competition.name}</h4></div><strong>{competition.placement ? `${competition.placement}. hely` : competition.stage || "–"}</strong></div>{competition.division && <p className="muted">{competition.division}</p>}</article>)}</div>
      </section>

      {podium.length > 0 && <section className="panel season-details__section"><div className="season-details__section-heading"><div><p className="eyebrow">Player voting</p><h3>A szezon játékosai</h3></div></div><div className="season-details__podium">{podium.map((player) => <article className="season-details__podium-player" key={`${player.placement}-${player.nickname}`}><span className="season-details__podium-position">{player.placement}.</span><div><strong>{player.playerName}</strong><span>{player.nickname}</span></div></article>)}</div></section>}
      {individualAwards.length > 0 && <section className="panel season-details__section"><div className="season-details__section-heading"><div><p className="eyebrow">Awards</p><h3>Egyéni elismerések</h3></div></div><div className="season-details__awards">{individualAwards.map((award, index) => <article className="season-details__award" key={`${award.playerName}-${index}`}><div><strong>{award.playerName}</strong><span>{award.position}</span></div><p>{award.award || award.title}</p></article>)}</div></section>}
      {season.milestones?.length > 0 && <section className="panel season-details__section"><div className="season-details__section-heading"><div><p className="eyebrow">Club history</p><h3>Mérföldkövek</h3></div></div><div className="season-details__milestones">{season.milestones.map((milestone) => <div className="season-details__milestone" key={milestone}><span>✓</span><p>{milestone}</p></div>)}</div></section>}
    </div>
  );
}

export default SeasonDetails;
