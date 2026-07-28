import PageHeader from "../components/ui/PageHeader";
import SeasonCard from "../components/seasons/SeasonCard";
import { seasons } from "../data/seasons";

const statusPriority = {
  active: 1,
  upcoming: 2,
  completed: 3,
};

function Seasons() {
  const sortedSeasons = [...seasons].sort((firstSeason, secondSeason) => {
    const statusDifference =
      statusPriority[firstSeason.status] -
      statusPriority[secondSeason.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return secondSeason.id - firstSeason.id;
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Season archive"
        title="Szezonok"
        description="Eredmények, helyezések és szezonvégi díjazottak."
      />

      <section className="season-grid">
        {sortedSeasons.map((season) => (
          <SeasonCard key={season.id} season={season} />
        ))}
      </section>
    </div>
  );
}

export default Seasons;