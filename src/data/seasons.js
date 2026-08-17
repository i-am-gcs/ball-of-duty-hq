export const seasons = [
  {
    id: 1,
    name: "Ball of Duty I. szezon",
    status: "completed",

    period: {
      start: "2026-01-11",
      end: "2026-03-15",
    },

    competitions: [
      {
        id: "hpcl-season-1",
        name: "Hungarian Pro Clubs League",
        shortName: "HPCL",
        type: "league",
        division: "II. osztály",
        placement: 2,

        vpg: {
          seasonId: 12,
          leagueSlug: "HPCL2",
        },

        stats: {
          played: 25,
          wins: 17,
          draws: 5,
          losses: 3,
          goalsFor: 38,
          goalsAgainst: 12,
        },

        outcome: "promotion",
      },

      {
        id: "balkan-season-1",
        name: "Balkan Championship",
        shortName: "Balkan",
        type: "league",
        division: "Championship 2/A",
        placement: 3,

        vpg: {
          seasonId: 16,
          leagueSlug: "Balkan-Championship",
        },

        stats: {
          played: 22,
          wins: 14,
          draws: 3,
          losses: 5,
          goalsFor: 38,
          goalsAgainst: 16,
        },

        outcome: "podium",
      },

      {
        id: "hpcl-cup-season-1",
        name: "HPCL Cup",
        shortName: "HPCL Cup",
        type: "cup",
        stage: "Round of 32",
        eliminatedBy: "MTK Budapest eSport",
        result: "1-4",
      },
    ],

    awards: {
      seasonPlayerPodium: [
        {
          placement: 1,
          playerName: "Kovács Ádám",
          nickname: "Kowi",
        },
        {
          placement: 2,
          playerName: "Molnár Viktor",
          nickname: "Magickacsa",
        },
        {
          placement: 3,
          playerName: "Tarsoly Tamás",
          nickname: "Tari",
        },
      ],

      individualAwards: [
        {
          playerName: "Kovács Ádám",
          nickname: "Kowi",
          award: "Balkan Team of the Season",
          position: "CB",
        },
      ],
    },

    milestones: [
      "Első hivatalos szezon",
      "Feljutás a HPCL I. osztályába",
      "Első nemzetközi dobogó",
    ],
  },

  {
    id: 2,
    name: "Ball of Duty II. szezon",
    status: "completed",

    period: {
      start: "2026-04-01",
      end: "2026-06-15",
    },

    competitions: [
      {
        id: "hpcl-season-2",
        name: "Hungarian Pro Clubs League",
        shortName: "HPCL",
        type: "league",
        division: "I. osztály",
        placement: 7,

        vpg: {
          seasonId: 13,
          leagueSlug: "HPCL1",
        },

        stats: {
          played: 22,
          wins: 9,
          draws: 3,
          losses: 10,
          goalsFor: 26,
          goalsAgainst: 37,
          points: 30,
        },

        outcome: "stayed-up",
      },

      {
        id: "balkan-season-2",
        name: "Balkan Championship",
        shortName: "Balkan",
        type: "league",
        division: "League 2B",
        placement: 5,

        vpg: {
          seasonId: 17,
          leagueSlug: "Balkan-Championship B",
        },

        stats: {
          played: 30,
          wins: 15,
          draws: 9,
          losses: 6,
          goalsFor: 44,
          goalsAgainst: 24,
          points: 54,
        },
      },

      {
        id: "hungarian-cup-season-2",
        name: "Magyar Kupa",
        shortName: "Magyar Kupa",
        type: "cup",
        stage: "Semifinal",
        eliminatedBy: "DVTK e-Sport",
        result: "1-3",
      },
    ],

    awards: {
      seasonPlayerPodium: [
        {
          placement: 1,
          playerName: "Molnár Viktor",
          nickname: "Magickacsa",
        },
        {
          placement: 2,
          playerName: "Tarsoly Tamás",
          nickname: "Tari",
        },
        {
          placement: 3,
          playerName: "Szász Ábel",
          nickname: "Ábel",
        },
      ],

      individualAwards: [
        {
          playerName: "Szász Ábel",
          nickname: "Ábel",
          award: "HPCL Team of the Season",
          position: "LB",
        },
        {
          playerName: "Vas Richárd",
          nickname: "",
          award: "HPCL Team of the Season",
          position: "RB",
        },
      ],
    },

    milestones: [
      "Első szezon a HPCL I. osztályában",
      "Bennmaradás az élvonalban",
      "Magyar Kupa-elődöntő",
      "Két játékos a HPCL Team of the Season válogatottban",
    ],
  },

  {
    id: 3,
    name: "Ball of Duty III. szezon",
    status: "upcoming",

    period: {
      start: "2026-08-17",
      end: "2026-09-17",
    },

    competitions: [
      {
        id: "balkan-summer-league-season-3",
        name: "Balkan Summer League",
        shortName: "BSL",
        type: "league",
        division: "League 2",

        vpg: {
          seasonId: 18,
          leagueSlug: "Balkan-Championship B",
        },

        placement: null,

        stats: null,
      },

      {
        id: "balkan-cup-season-3",
        name: "VPG Balkan Cup",
        shortName: "Balkan Cup",
        type: "cup",

        vpg: {
          seasonId: 18,
          tournamentId: 2011,
          tournamentSlug: "Balkan-eLeague-Cup",
        },

        placement: null,

        stats: null,
      },
    ],

    awards: {
      seasonPlayerPodium: [],
      individualAwards: [],
    },

    milestones: [],
  },
];
