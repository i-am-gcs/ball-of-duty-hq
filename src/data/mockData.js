export const players = [
  { id: 1, name: "Molnár Viktor", nickname: "Magickacsa", position: "GK", status: "Aktív", rating: 91, appearances: 34, goals: 0, assists: 2 },
  { id: 2, name: "Tarsoly Tamás", nickname: "Tari", position: "CB", status: "Aktív", rating: 89, appearances: 37, goals: 4, assists: 7 },
  { id: 3, name: "Szász Ábel", nickname: "Ábel", position: "ST", status: "Aktív", rating: 90, appearances: 35, goals: 29, assists: 11 },
  { id: 4, name: "Kovács Márk", nickname: "Kovi", position: "RB", status: "Aktív", rating: 86, appearances: 31, goals: 2, assists: 10 },
  { id: 5, name: "Nagy Bence", nickname: "Benji", position: "LB", status: "Aktív", rating: 85, appearances: 28, goals: 1, assists: 8 },
  { id: 6, name: "Farkas Dávid", nickname: "Davo", position: "CM", status: "Aktív", rating: 88, appearances: 36, goals: 9, assists: 15 },
  { id: 7, name: "Horváth Gergő", nickname: "Gergo", position: "RW", status: "Inaktív", rating: 84, appearances: 21, goals: 8, assists: 9 },
  { id: 8, name: "Varga Máté", nickname: "Mate", position: "LW", status: "Aktív", rating: 87, appearances: 30, goals: 13, assists: 12 }
];

export const seasons = [
  {
    id: 1,
    name: "Ball of Duty II. szezon",
    period: "2026.04.01 – 2026.06.15",
    competitions: ["HPCL I. – 8. hely", "Balkan Championship B League – 3. hely"],
    playerOfSeason: ["1. Magickacsa", "2. Tari", "3. Ábel"],
    status: "Lezárt"
  },
  {
    id: 2,
    name: "Ball of Duty III. szezon",
    period: "2026.08.01 – folyamatban",
    competitions: ["HPCL I.", "Balkan Championship"],
    playerOfSeason: [],
    status: "Aktív"
  }
];

export const results = [
  { id: 1, competition: "HPCL I.", opponent: "Royal Eleven", score: "3–1", outcome: "Győzelem" },
  { id: 2, competition: "Balkan Championship", opponent: "Adriatic FC", score: "2–2", outcome: "Döntetlen" },
  { id: 3, competition: "HPCL I.", opponent: "Iron Wolves", score: "1–0", outcome: "Győzelem" }
];

export const initialBenefits = [
  { id: 1, player: "Magickacsa", attendance: 18, votes: 16, bonus: 4 },
  { id: 2, player: "Tari", attendance: 17, votes: 18, bonus: 3 },
  { id: 3, player: "Ábel", attendance: 16, votes: 15, bonus: 5 },
  { id: 4, player: "Kovi", attendance: 15, votes: 14, bonus: 2 }
];
