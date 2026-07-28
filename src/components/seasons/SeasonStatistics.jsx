function SeasonStatistics({ competitions }) {
  const competitionsWithStats = competitions.filter(
    (competition) => competition.stats,
  );

  const totals = competitionsWithStats.reduce(
    (summary, competition) => {
      const { stats } = competition;

      summary.played += stats.played ?? 0;
      summary.wins += stats.wins ?? 0;
      summary.draws += stats.draws ?? 0;
      summary.losses += stats.losses ?? 0;
      summary.goalsFor += stats.goalsFor ?? 0;
      summary.goalsAgainst += stats.goalsAgainst ?? 0;

      return summary;
    },
    {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    },
  );

  const goalDifference = totals.goalsFor - totals.goalsAgainst;

  const winRate =
    totals.played > 0
      ? ((totals.wins / totals.played) * 100).toFixed(1)
      : "0.0";

  const statistics = [
    {
      label: "Mérkőzés",
      value: totals.played,
    },
    {
      label: "Győzelem",
      value: totals.wins,
    },
    {
      label: "Döntetlen",
      value: totals.draws,
    },
    {
      label: "Vereség",
      value: totals.losses,
    },
    {
      label: "Rúgott gól",
      value: totals.goalsFor,
    },
    {
      label: "Kapott gól",
      value: totals.goalsAgainst,
    },
    {
      label: "Gólkülönbség",
      value: goalDifference > 0 ? `+${goalDifference}` : goalDifference,
    },
    {
      label: "Győzelmi arány",
      value: `${winRate}%`,
    },
  ];

  if (competitionsWithStats.length === 0) {
    return null;
  }

  return (
    <section className="panel season-statistics">
      <div className="season-details__section-heading">
        <div>
          <p className="eyebrow">Season overview</p>
          <h3>Szezonstatisztika</h3>
        </div>

        <span className="season-statistics__competition-count">
          {competitionsWithStats.length} versenysorozat
        </span>
      </div>

      <div className="season-statistics__grid">
        {statistics.map((statistic) => (
          <article
            className="season-statistics__item"
            key={statistic.label}
          >
            <span>{statistic.label}</span>
            <strong>{statistic.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SeasonStatistics;