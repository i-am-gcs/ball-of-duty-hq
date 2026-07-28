import { useState } from "react";
import MatchCard from "../components/matches/MatchCard";
import PageHeader from "../components/ui/PageHeader";
import { matches } from "../data/matches";
import { seasons } from "../data/seasons";
import { Link } from "react-router-dom";

function Matches() {
  const sortedSeasons = [...seasons].sort(
    (firstSeason, secondSeason) => secondSeason.id - firstSeason.id,
  );

  const [selectedSeasonId, setSelectedSeasonId] = useState(
    sortedSeasons[0]?.id ?? null,
  );

  const [selectedCompetition, setSelectedCompetition] = useState("all");

  const seasonMatches = matches.filter(
    (match) => match.seasonId === selectedSeasonId,
  );

  const competitionNames = [
    ...new Set(
      seasonMatches.map((match) => match.competitionName),
    ),
  ];

  const filteredMatches =
    selectedCompetition === "all"
      ? seasonMatches
      : seasonMatches.filter(
          (match) => match.competitionName === selectedCompetition,
        );

  function handleSeasonChange(event) {
    setSelectedSeasonId(Number(event.target.value));
    setSelectedCompetition("all");
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Match archive"
        title="Mérkőzések"
        description="A klub hivatalos mérkőzéseinek és eredményeinek archívuma."
      />

      <section className="panel match-toolbar">
        <label className="match-toolbar__field">
          <span>Szezon</span>

          <select
            value={selectedSeasonId ?? ""}
            onChange={handleSeasonChange}
          >
            {sortedSeasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name ??
                  season.title ??
                  `Ball of Duty ${season.id}. szezon`}
              </option>
            ))}
          </select>
        </label>

        <div className="match-toolbar__filters">
          <button
            type="button"
            className={selectedCompetition === "all" ? "active" : ""}
            onClick={() => setSelectedCompetition("all")}
          >
            Összes
          </button>

          {competitionNames.map((competitionName) => (
            <button
              type="button"
              key={competitionName}
              className={
                selectedCompetition === competitionName ? "active" : ""
              }
              onClick={() =>
                setSelectedCompetition(competitionName)
              }
            >
              {competitionName}
            </button>
          ))}
        </div>
      </section>

      {filteredMatches.length > 0 ? (
        <section className="match-list">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </section>
      ) : (
        <section className="panel match-empty-state">
          <p className="eyebrow">No matches</p>
          <h3>Nincs rögzített mérkőzés</h3>

          <p>
            Ehhez a szezonhoz és versenysorozathoz még nem adtunk
            mérkőzést.
          </p>
        </section>
      )}
    </div>
  );
}

export default Matches;