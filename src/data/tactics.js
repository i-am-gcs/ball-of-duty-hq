export const tactics = [
  {
    slug: "3-5-2",
    name: "3-5-2",
    label: "Kétcsatáros rendszer",
    summary: "Létszámfölény a pálya közepén, aktív szárnyjáték és két folyamatos támadó célpont.",
    accent: "Középpályás kontroll",
  },
  {
    slug: "4-2-3-1",
    name: "4-2-3-1",
    label: "Kiegyensúlyozott rendszer",
    summary: "Stabil kettős szűrő, szabad tízes és kontrollált átmenetek védekezésből támadásba.",
    accent: "Stabilitás és átmenetek",
  },
  {
    slug: "4-3-3-false-9",
    name: "4-3-3",
    label: "False 9",
    summary: "Mozgékony támadósor visszalépő hamis kilencessel, befutó szélsőkkel és gyors kombinációkkal.",
    accent: "Területnyitás és rotáció",
  },
  {
    slug: "corner-variations",
    name: "Szögletvariációk",
    label: "Rögzített játékhelyzetek",
    summary: "Rövid videókon és animációkon bemutatott támadó szögletkombinációk, egységes mozgásokkal.",
    accent: "Begyakorolt figurák",
    type: "set-piece",
  },
];

export function getTactic(slug) {
  return tactics.find((tactic) => tactic.slug === slug) || null;
}
