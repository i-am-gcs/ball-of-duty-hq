import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import "../styles/benefit-tracker.css";
import {
  getCurrentBenefitBoard,
  getBenefitStatus,
} from "../services/benefitTrackerService.js";
import { ref, update } from "firebase/database";
import { database } from "../firebase/firebase";

const loyaltyLevels = [
  {
    level: "Recruit",
    icon: "🟢",
    requirement: "1 sikeresen teljesített BOD szezon",
    benefits: [
      "Részvétel a Benefit Systemben",
      "Team of the Week bónusz",
      "Statisztikai nyilvántartás",
      "Klubeseményeken való részvétel",
    ],
  },
  {
    level: "Operator",
    icon: "🔵",
    requirement: "2 egymást követő sikeresen teljesített BOD szezon",
    benefits: [
      "Minden Recruit előny",
      "Jogosultság a Szezon Játékosa elismerésre",
      "Jogosultság egyéb szezonvégi klubjutalmakra",
    ],
  },
  {
    level: "Veteran",
    icon: "🟣",
    requirement: "3 egymást követő sikeresen teljesített BOD szezon",
    benefits: [
      "Minden Operator előny",
      "EA SPORTS FC Standard Edition jutalom az adott játék utolsó, hivatalosan támogatott versenyszezonjára",
      "Elsőbbség nagyobb értékű klubtámogatások és jutalmak elbírálásánál",
    ],
  },
  {
    level: "Legend",
    icon: "🟡",
    requirement: "Legalább 5 egymást követő sikeresen teljesített BOD szezon",
    benefits: [
      "Minden Veteran előny",
      "Külön Discord rang",
      "Kiemelt klubstátusz",
      "Jövőbeni exkluzív klubjutalmakra való jogosultság",
    ],
  },
];

const documents = {
  rules: {
    title: "Hivatalos Házirend és Csapatszabályzat",
    icon: "📜",
    validity: "Hatályos: 2026. április 1-től visszavonásig",
    sections: [
      {
        title: "Bevezetés",
        content: `
A Ball of Duty célja egy olyan stabil, fegyelmezett és hosszú távon sikeres közösség felépítése, ahol a sportszerűség, a csapatmunka és az egymás iránti tisztelet minden eredménynél fontosabb.

Jelen szabályzat minden aktív kerettagra vonatkozik. A klubhoz való csatlakozással minden játékos elfogadja és köteles betartani az itt meghatározott szabályokat.
        `,
      },
      {
        title: "1. 🧠 Hozzáállás",
        content: `
A siker alapja a megfelelő mentalitás.

Minden játékostól elvárjuk, hogy:
• felelősségteljesen álljon a csapat munkájához;
• tisztelje csapattársait és ellenfeleit;
• a klub érdekeit saját érdekei elé helyezze;
• törekedjen a folyamatos fejlődésre.

Ha valaki fáradt, ideges, nincs megfelelő mentális állapotban vagy nem tud kellően koncentrálni, kérjük, jelezze, és ne vállaljon játékot azon a napon.

A cél, hogy minden közös alkalom minőségi játékélményt nyújtson minden játékos számára.
        `,
      },
      {
        title: "2. 🗓️ Edzések és jelenlét",
        content: `
Az edzésnapokról minden héten Discord szavazás készül.

A szavazás módosítására az adott nap 12:00 óráig van lehetőség. Aki eddig az időpontig nem jelöl vagy nem módosítja a státuszát, arra az adott napon nem tudunk biztosan számítani.

A minimális kommunikáció minden játékostól elvárt.

Edzést kizárólag a management írhat ki.

Fun játékokra, karakterhúzásra és egyéb kötetlen programokra külön Discord csatorna szolgál.
        `,
      },
      {
        title: "3. 🔧 Technikai felkészülés",
        content: `
Minden játékos köteles gondoskodni arról, hogy mérkőzés előtt:

• stabil internetkapcsolattal rendelkezzen;
• headsete és mikrofonja megfelelően működjön;
• a játék, a konzol vagy a PC naprakész legyen;
• a szükséges buildek és beállítások elkészüljenek;
• kontrollere megfelelően fel legyen töltve;
• minden egyéb technikai körülmény alkalmas legyen a zavartalan játékra.

Technikai problémák miatt a csapat indokolatlan ideig nem vár.
        `,
      },
      {
        title: "4. ⏰ Pontos érkezés",
        content: `
Edzésre és hivatalos mérkőzésre minden játékos köteles legalább 2 perccel a kiírt kezdési idő előtt Discordon és játékban is készen állni.

Az előzetes jelzés nélküli késés esetén a management fenntartja a jogot arra, hogy az adott alkalommal más játékossal számoljon.
        `,
      },
      {
        title: "5. ⚽ Játékfilozófia és taktikai fegyelem",
        content: `
A Ball of Duty egységes taktikai rendszer szerint játszik.

Ennek megfelelően minden játékostól elvárjuk, hogy:

• a kijelölt posztján játsszon;
• betartsa az adott szerepkör feladatait;
• a csapat érdekeit helyezze előtérbe;
• kerülje az indokolatlan kockázatvállalást.

Új karaktereket, archetype-okat vagy buildeket hivatalos edzésen és bajnoki mérkőzésen nem tesztelünk.

Erre a célra külön fun napok állnak rendelkezésre.
        `,
      },
      {
        title: "6. 🎙️ Meccs közbeni irányítás",
        content: `
A mérkőzések során két kijelölt játékos irányítja a csapatot:

• a támadóharmad vezetője;
• a védekezőharmad vezetője.

Az általuk adott taktikai utasítások elsőbbséget élveznek.

Más játékos nem adhat velük ellentétes utasítást, illetve nem beszélheti túl őket.

Észrevételek, javaslatok és taktikai módosítások megbeszélésére félidőben, illetve mérkőzések között kerül sor.
        `,
      },
      {
        title: "7. 💬 Kommunikáció",
        content: `
Elvárt:

• rövid, egyértelmű callok;
• nyugodt kommunikáció;
• egymás támogatása;
• csapatközpontú gondolkodás.

Példák:
„Lábra.”
„Indítalak.”
„Magasan.”
„Zárj be.”
„Keresztezek.”

Nem megengedett:

• csapattárs hibáztatása;
• panaszkodás vagy hisztizés;
• vita mérkőzés közben;
• toxikus viselkedés;
• rage quit;
• hangulatromboló megnyilvánulások.

Minden konfliktust nyugodt körülmények között, a mérkőzés után beszélünk meg.
        `,
      },
      {
        title: "8. 👤 Személyes felelősség",
        content: `
Minden játékos felelős a saját teljesítményéért és a rábízott feladatok végrehajtásáért.

Amennyiben valaki ismételten eltér a megbeszélt taktikától vagy nem hajtja végre a kért feladatokat, a management:

• figyelmeztetést adhat;
• posztváltásról dönthet;
• vagy ideiglenes pihenőt rendelhet el.
        `,
      },
      {
        title: "9. 🧠 Alapelvek",
        content: `
Támadásban:
• szervezett építkezés;
• gyors döntések;
• első szándékú játék;
• csapatjáték előnyben;
• öncélú cselezés kerülése.

Védekezésben:
• pozíciótartás mindenek felett;
• pressing kizárólag callra;
• együtt mozgó csapatrészek;
• fegyelmezett visszarendeződés.
        `,
      },
      {
        title: "10. 🏟️ Kerettagság és játékidő",
        content: `
A Ball of Dutyban a játékidő nem alanyi jog.

A kezdőcsapatba kerülés és a játékpercek elosztása az alábbi szempontok alapján történik:

• hozzáállás;
• jelenlét;
• taktikai fegyelem;
• teljesítmény;
• csapatérdek.

A cél egy 16–18 fős aktív keret kialakítása, amely hosszú távon is versenyképes hazai és nemzetközi ligákban.
        `,
      },
      {
        title: "11. 📈 Visszajelzés",
        content: `
A management rendszeresen értékeli a játékosok:

• fejlődését;
• hozzáállását;
• aktivitását;
• taktikai fegyelmét.

A szabályok ismételt megszegése figyelmeztetést, súlyosabb esetben pedig a keretből való kikerülést eredményezheti.
        `,
      },
      {
        title: "12. 🤝 Közösségi élet",
        content: `
A Ball of Duty Discord szervere közös közösségi tér.

Elvárjuk, hogy minden játékos:

• kulturáltan kommunikáljon;
• tisztelettel bánjon másokkal;
• a személyes konfliktusokat privát úton rendezze.

A humor és a jó hangulat mindig belefér, amennyiben az nem mások rovására történik.
        `,
      },
      {
        title: "13. 🌐 Külső kommunikáció",
        content: `
A klub belső ügyei bizalmas információnak minősülnek.

Ennek megfelelően tilos:

• belső vitákat nyilvánosan megosztani;
• taktikai információkat kiszivárogtatni;
• a klub hírnevét sértő tartalmat közzétenni.

Publikus képek, videók és egyéb tartalmak kizárólag a Ball of Duty érdekeinek figyelembevételével oszthatók meg.
        `,
      },
      {
        title: "14. 📚 Egyéni fejlődés",
        content: `
Minden játékos köteles:

• megismerni saját posztjának szerepköreit;
• használni a management által kért buildeket;
• alkalmazkodni a csapat taktikai rendszeréhez.

Amennyiben a management a csapat érdekében buildmódosítást kér, annak alkalmazása kötelező.
        `,
      },
      {
        title: "15. 🛡️ A klub képviselete",
        content: `
A Ball of Duty nevét minden játékos képviseli:

• edzésen;
• bajnoki mérkőzésen;
• fun játékon;
• Discordon;
• közösségi felületeken.

A klub jó hírnevének megőrzése minden kerettag közös felelőssége.
        `,
      },
      {
        title: "16. ❤️ Klubhűség és elköteleződés",
        content: `
A Ball of Duty hosszú távú közösséget épít.

Célunk nem egy szezonra összeálló keret, hanem egy olyan csapat kialakítása, amely több szezonon keresztül együtt fejlődik, versenyez és képviseli a klubot.

Ennek megfelelően a klub által biztosított juttatások, támogatások és egyéb előnyök nem kizárólag a pályán nyújtott teljesítményhez, hanem a klub iránti elköteleződéshez is kapcsolódnak.

A nagyobb értékű szezonvégi jutalmakra való jogosultság részletes feltételeit a mindenkor hatályos Ball of Duty Benefit System tartalmazza.

A Ball of Duty célja egy olyan közösség felépítése, amelyben a hűség, a megbízhatóság és a csapategység legalább akkora értéket képvisel, mint a győzelmek és az egyéni statisztikák.
        `,
      },
      {
        title: "📡 Discord aktivitás és elérhetőség",
        content: `
A Ball of Duty működésének alapja az aktív kommunikáció.

Minden játékostól elvárjuk, hogy rendszeresen kövesse a Discord szervert, figyelemmel kísérje a kiírásokat, valamint időben reagáljon a szavazásokra és a management közleményeire.

Amennyiben egy játékos három egymást követő alkalommal, előzetes jelzés nélkül elmulasztja a részvételi szavazást vagy nem reagál a jelenléttel kapcsolatos egyeztetésekre, a management Inaktív státuszba helyezheti.

Az Inaktív státusz azt jelzi, hogy a játékossal rövid távon nem tudunk tervezni, ezért a management megkezdheti új játékos(ok) keresését az adott posztra.

Amennyiben az érintett játékos ismét aktívvá válik, ezt jelzi a management felé, és továbbra is rendelkezésre áll szabad hely a keretben, az Inaktív státusz felülvizsgálható.

Ha a keret időközben betelik, vagy az adott posztra megfelelő pótlás érkezik, a management dönthet a játékos kerettagságának megszüntetéséről.

Az előre jelzett távollét, illetve a management felé időben jelzett akadályoztatás nem számít inaktivitásnak.
        `,
      },
    ],
  },

  benefit: {
    title: "Ball of Duty CF – Benefit System",
    icon: "🎁",
    validity: "Hatályos: 2026. augusztus 1-től visszavonásig",
    sections: [
      {
        title: "Bevezetés",
        content: `
A Ball of Duty célja nem csupán egy sikeres csapat felépítése, hanem egy olyan közösség létrehozása, amely hosszú távon is stabil, összetartó és versenyképes marad.

A Benefit System ennek a szemléletnek a része.

A rendszer célja, hogy elismerje azon játékosok munkáját, akik teljesítményükkel, hozzáállásukkal, megbízhatóságukkal és a klub iránti elköteleződésükkel hozzájárulnak a Ball of Duty fejlődéséhez.

A jutalmak nem alanyi jogon járnak. Azok kizárólag a jelen dokumentumban meghatározott feltételek teljesülése esetén vehetők igénybe.
        `,
      },
      {
        title: "1. 🎯 A Benefit System alapelvei",
        content: `
A Ball of Duty a következő értékeket jutalmazza:

• megbízhatóság;
• jelenlét;
• fegyelmezettség;
• csapatmunka;
• sportszerűség;
• hosszú távú klubhűség.

A rendszer célja nem az egyéni érdekek erősítése, hanem egy olyan közösség kialakítása, amelyben minden játékos a csapat sikerét helyezi előtérbe.
        `,
      },
      {
        title: "2. ✅ Részvételi feltételek",
        content: `
A Benefit Systemben kizárólag azok a játékosok vesznek részt, akik:

• a Ball of Duty hivatalos kerettagjai;
• aktív játékosai a klubnak;
• betartják a Házirendet;
• rendszeresen használják a Discordot;
• időben jelölik részvételüket;
• betartják a taktikai utasításokat;
• a szezon végéig a Ball of Duty aktív játékosai maradnak.

A management fenntartja a jogot arra, hogy vitás esetekben egyedi döntést hozzon.
        `,
      },
      {
        title: "3. ⚠️ Büntetőpont-rendszer",
        content: `
1 büntetőpont jár:

• 5 percnél nagyobb késés előzetes jelzés nélkül;
• Discord-jelölés elmulasztása;
• ismétlődő kommunikációs hiányosság;
• a management által kért alapvető adminisztráció figyelmen kívül hagyása.

Az előre jelzett távollét nem számít szabályszegésnek.

🚨 5 büntetőpont elérése esetén a játékos automatikusan elveszíti jogosultságát az adott szezon Benefit System jutalmaira.

A büntetőpont-rendszer célja nem a büntetés, hanem a kiszámítható és megbízható működés biztosítása.
        `,
      },
      {
        title: "4. 🏅 Hűségszintek",
        content: `
A Ball of Duty külön értékeli a klub iránti hosszú távú elköteleződést.

A hűségszintet minden sikeresen befejezett szezon után a management frissíti.
        `,
      },
      {
        title: "5. 🏆 Szezon Játékosa",
        content: `
Minden szezon végén a management legfeljebb három játékost választ ki.

A döntés során figyelembe vesszük:

• teljesítményt;
• hozzáállást;
• aktivitást;
• fejlődést;
• csapatmunkát;
• példamutató viselkedést.

🎖️ Jutalom:
• Ball of Duty kupa;
• 5 000 Ft / játékos.

A díjra kizárólag legalább Operator hűségszinttel rendelkező játékos jogosult.
        `,
      },
      {
        title: "6. 📊 Statisztikai Top 3",
        content: `
A szezon végén külön díjazásban részesül a három legjobb statisztikai teljesítményt nyújtó játékos.

A rangsort a HPCL és a Balkan VPG hivatalos értékeléseinek átlaga alapján határozzuk meg.

Feltételek:

• minimum 20 hivatalos bajnoki mérkőzés;
• aktív kerettagság a szezon végén;
• kizárás hiánya a Benefit Systemből;
• legalább Veteran hűségszint.

🏆 Jutalom:

EA SPORTS FC Standard Edition

A jutalom kizárólag az adott EA SPORTS FC játék utolsó, hivatalosan támogatott versenyszezonjában kerül kiosztásra.

A jutalom egy játékos számára legfeljebb egyszer vehető igénybe az adott játékgeneráció során.
        `,
      },
      {
        title: "7. ⭐ Team of the Week bónusz",
        content: `
Aki a HPCL vagy Balkan VPG hivatalos Team of the Week válogatásába bekerül, alkalmanként 500 Ft bónuszban részesül.

A bónuszokat a szezon végén, egy összegben fizetjük ki.

Erre minden olyan játékos jogosult, aki aktív résztvevője a Benefit Systemnek.
        `,
      },
      {
        title: "8. 🚫 Jogosultság megszűnése",
        content: `
A szezon végi jutalmakra való jogosultság automatikusan megszűnik, ha a játékos:

• kilép a klubból;
• átigazol másik klubba;
• kizárásra kerül;
• elveszíti Benefit jogosultságát;
• a szezon végén már nem aktív Ball of Duty játékos.

A Benefit System kizárólag a Ball of Duty aktív közösségének tagjait jutalmazza.
        `,
      },
      {
        title: "9. 🛡️ A management döntési joga",
        content: `
A management fenntartja a jogot arra, hogy:

• vitás esetekben egyedi döntést hozzon;
• indokolt esetben kivételt alkalmazzon;
• a Benefit System szabályait szezononként módosítsa.

Minden döntés elsődleges szempontja a Ball of Duty érdeke és a csapategység megőrzése.
        `,
      },
      {
        title: "10. ❤️ Záró gondolat",
        content: `
A Benefit System célja nem az, hogy versengést teremtsen a csapattársak között.

Éppen ellenkezőleg.

Azért jött létre, hogy elismerje azok munkáját, akik hosszú távon is hozzátesznek a Ball of Duty közösségéhez.

Lehet kiváló játékosnak lenni. Lehet kiemelkedő statisztikákat produkálni. De a Ball of Duty számára a legnagyobb értéket mindig azok a játékosok jelentik, akikre szezonokon át lehet számítani.

Egy klubot nem egyetlen szezon épít fel. Egy klubot azok az emberek építenek fel, akik évről évre ugyanazért a címerért küzdenek.

— Ball of Duty Management
        `,
      },
    ],
  },
};

function BenefitTracker() {
  const [activeDocument, setActiveDocument] = useState(null);

  const [benefitBoard, setBenefitBoard] = useState({
    season: null,
    players: [],
  });

  const [loadingBoard, setLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState("");
  const [savingPlayerId, setSavingPlayerId] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadBenefitBoard() {
      try {
        setLoadingBoard(true);
        setBoardError("");

        const data = await getCurrentBenefitBoard();

        if (!mounted) {
          return;
        }

        setBenefitBoard(data);
      } catch (error) {
        console.error("Benefit Board betöltési hiba:", error);

        if (!mounted) {
          return;
        }

        setBoardError("A Benefit Board adatai jelenleg nem tölthetők be.");
      } finally {
        if (mounted) {
          setLoadingBoard(false);
        }
      }
    }

    loadBenefitBoard();

    return () => {
      mounted = false;
    };
  }, []);

  function changePenaltyPoints(playerId, delta) {
    setBenefitBoard((current) => ({
      ...current,
      players: current.players.map((player) => {
        if (player.playerId !== playerId) {
          return player;
        }

        const nextPenaltyPoints = Math.max(
          0,
          Number(player.penaltyPoints ?? 0) + delta,
        );

        return {
          ...player,
          penaltyPoints: nextPenaltyPoints,
          status: getBenefitStatus({
            penaltyPoints: nextPenaltyPoints,
            attendanceRate: player.attendance?.rate ?? null,
            votingRate: player.voting?.rate ?? null,
          }),
        };
      }),
    }));

    setSaveMessage("");
    setSaveError("");
  }

  async function savePenaltyPoints(player) {
    if (!benefitBoard.season?.id || !player?.playerId) {
      return;
    }

    try {
      setSavingPlayerId(player.playerId);
      setSaveMessage("");
      setSaveError("");

      await update(
        ref(
          database,
          `benefitTracker/${benefitBoard.season.id}/players/${player.playerId}`,
        ),
        {
          penaltyPoints: Number(player.penaltyPoints ?? 0),
        },
      );

      setSaveMessage(`${player.playerName} büntetőpontjai mentve.`);
    } catch (error) {
      console.error("Benefit büntetőpont mentési hiba:", error);
      setSaveError("Nem sikerült elmenteni a büntetőpontokat.");
    } finally {
      setSavingPlayerId(null);
    }
  }

  return (
    <div className="page-stack benefit-page">
      <PageHeader
        eyebrow="Club handbook"
        title="Benefit Tracker"
        description="A Ball of Duty hivatalos szabályzatai, benefit rendszere és aktuális juttatási struktúrája."
      />

      <section className="benefit-hero">
        <div>
          <p className="eyebrow">🎁 BALL OF DUTY BENEFIT CENTER</p>
          <h2>Klubszabályzat és juttatási rendszer</h2>
          <p>
            Itt található a Ball of Duty működését és juttatási rendszerét
            meghatározó hivatalos dokumentáció.
          </p>
        </div>
      </section>

      <section className="benefit-document-grid">
        <button
          type="button"
          className="benefit-document-card"
          onClick={() => setActiveDocument(documents.rules)}
        >
          <span className="benefit-document-icon">📜</span>

          <div>
            <span className="eyebrow">HIVATALOS DOKUMENTUM</span>
            <h3>Házirend és Csapatszabályzat</h3>
            <p>
              A csapat működésére, jelenlétre, kommunikációra, taktikára és
              klubtagságra vonatkozó szabályok.
            </p>
            <span className="benefit-document-link">
              Dokumentum megnyitása →
            </span>
          </div>
        </button>

        <button
          type="button"
          className="benefit-document-card"
          onClick={() => setActiveDocument(documents.benefit)}
        >
          <span className="benefit-document-icon">🎁</span>

          <div>
            <span className="eyebrow">HATÁLYOS RENDSZER</span>
            <h3>Benefit System</h3>
            <p>
              A klub hűségszintjei, jutalmai, büntetőpontjai és szezonvégi
              benefit szabályai.
            </p>
            <span className="benefit-document-link">
              Dokumentum megnyitása →
            </span>
          </div>
        </button>
      </section>

      <section className="panel benefit-current-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">📊 Aktuális rendszer</p>
            <h3>Benefit jogosultsági struktúra</h3>
          </div>

          <span className="benefit-validity">
            Hatályos: 2026. augusztus 1-től
          </span>
        </div>

        <div className="benefit-table-scroll">
          <table className="benefit-system-table">
            <thead>
              <tr>
                <th>Szint</th>
                <th>Feltétel</th>
                <th>Főbb jogosultságok</th>
              </tr>
            </thead>

            <tbody>
              {loyaltyLevels.map((level) => (
                <tr key={level.level}>
                  <td>
                    <div className="benefit-level">
                      <span>{level.icon}</span>
                      <strong>{level.level}</strong>
                    </div>
                  </td>

                  <td>{level.requirement}</td>

                  <td>
                    <ul className="benefit-perks-list">
                      {level.benefits.map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel benefit-board-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">🏆 Aktuális szezon</p>
            <h3>{benefitBoard.season?.name ?? "Benefit Board"}</h3>
          </div>

          <span className="benefit-validity">
            Az adatok kizárólag az aktuális szezonra vonatkoznak.
          </span>
        </div>

        {loadingBoard ? (
          <div className="benefit-board-state">
            <span>⏳</span>
            <p>Benefit adatok betöltése...</p>
          </div>
        ) : boardError ? (
          <div className="benefit-board-state error">
            <span>⚠️</span>
            <p>{boardError}</p>
          </div>
        ) : benefitBoard.players.length === 0 ? (
          <div className="benefit-board-state">
            <span>📋</span>
            <p>Még nincs megjeleníthető adat az aktuális szezonhoz.</p>
          </div>
        ) : (
          <div className="benefit-board-scroll">
            <table className="benefit-board-table">
              <thead>
                <tr>
                  <th>Játékos</th>
                  <th>Rang</th>
                  <th>Meccs</th>
                  <th>VPG pont</th>
                  <th>Komb. pont</th>
                  <th>Jelenlét</th>
                  <th>Szavazás</th>
                  <th>Bünti</th>
                  <th>ToTW</th>
                  <th>Státusz</th>
                  <th>Művelet</th>
                </tr>
              </thead>

              <tbody>
                {benefitBoard.players.map((player) => (
                  <tr key={player.playerId}>
                    <td>
                      <strong>{player.playerName}</strong>
                    </td>

                    <td>
                      <span className="benefit-board-loyalty">
                        <span>{player.loyaltyIcon}</span>
                        {player.loyaltyLevel}
                      </span>
                    </td>

                    <td className="numeric-cell">
                      {player.matchesPlayed ?? "–"}
                    </td>

                    <td className="numeric-cell">
                      {formatNumber(player.vpgPoints)}
                    </td>

                    <td className="numeric-cell combined-points">
                      {formatNumber(player.combinedPoints)}
                    </td>

                    <td>
                      <ProgressValue value={player.attendance.rate} />
                    </td>

                    <td>
                      <ProgressValue value={player.voting.rate} />
                    </td>

                    <td className="numeric-cell">
                      <div className="benefit-penalty-editor">
                        <button
                          type="button"
                          className="benefit-penalty-button"
                          onClick={() =>
                            changePenaltyPoints(player.playerId, -1)
                          }
                          disabled={Number(player.penaltyPoints ?? 0) <= 0}
                          aria-label={`${player.playerName} büntetőpont csökkentése`}
                        >
                          −
                        </button>

                        <span
                          className={
                            player.penaltyPoints >= 5
                              ? "penalty-danger"
                              : player.penaltyPoints > 0
                                ? "penalty-warning"
                                : "penalty-clean"
                          }
                        >
                          {player.penaltyPoints}
                        </span>

                        <button
                          type="button"
                          className="benefit-penalty-button"
                          onClick={() =>
                            changePenaltyPoints(player.playerId, 1)
                          }
                          aria-label={`${player.playerName} büntetőpont növelése`}
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="numeric-cell">
                      {player.totwBonus > 0
                        ? `${player.totwBonus.toLocaleString("hu-HU")} Ft`
                        : "–"}
                    </td>

                    <td>
                      <span
                        className={`benefit-status benefit-status-${player.status.key}`}
                      >
                        {player.status.icon} {player.status.label}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="button benefit-save-button"
                        disabled={savingPlayerId === player.playerId}
                        onClick={() => savePenaltyPoints(player)}
                      >
                        {savingPlayerId === player.playerId
                          ? "Mentés..."
                          : "Mentés"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(saveMessage || saveError) && (
        <div className={saveError ? "error-message" : "success-message"}>
          {saveError || saveMessage}
        </div>
      )}

      <section className="benefit-summary-grid">
        <article className="panel benefit-info-card">
          <span className="benefit-info-icon">⚠️</span>
          <div>
            <p className="eyebrow">BÜNTETŐPONTOK</p>
            <h3>5 pont = Benefit jogosultság elvesztése</h3>
            <p>
              A büntetőpont-rendszer célja a kiszámítható és megbízható
              csapatműködés biztosítása.
            </p>
          </div>
        </article>

        <article className="panel benefit-info-card">
          <span className="benefit-info-icon">⭐</span>
          <div>
            <p className="eyebrow">TEAM OF THE WEEK</p>
            <h3>500 Ft / bekerülés</h3>
            <p>
              A HPCL vagy Balkan VPG hivatalos Team of the Week válogatásába
              bekerülő aktív Benefit résztvevők számára.
            </p>
          </div>
        </article>

        <article className="panel benefit-info-card">
          <span className="benefit-info-icon">🏆</span>
          <div>
            <p className="eyebrow">SZEZON JÁTÉKOSA</p>
            <h3>5 000 Ft + Ball of Duty kupa</h3>
            <p>
              A management szezononként legfeljebb három játékost választ ki.
              Legalább Operator szint szükséges.
            </p>
          </div>
        </article>

        <article className="panel benefit-info-card">
          <span className="benefit-info-icon">🎮</span>
          <div>
            <p className="eyebrow">STATISZTIKAI TOP 3</p>
            <h3>EA SPORTS FC Standard Edition</h3>
            <p>
              A jutalom kizárólag az adott EA SPORTS FC játék utolsó,
              hivatalosan támogatott versenyszezonjában kerül kiosztásra. Egy
              játékos számára legfeljebb egyszer vehető igénybe az adott
              játékgeneráció során.
            </p>
          </div>
        </article>
      </section>

      {activeDocument && (
        <div
          className="benefit-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveDocument(null);
            }
          }}
        >
          <div className="benefit-modal" role="dialog" aria-modal="true">
            <header className="benefit-modal-header">
              <div>
                <span className="benefit-modal-icon">
                  {activeDocument.icon}
                </span>

                <div>
                  <p className="eyebrow">BALL OF DUTY CF</p>
                  <h2>{activeDocument.title}</h2>
                  <span className="benefit-modal-validity">
                    {activeDocument.validity}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="benefit-modal-close"
                onClick={() => setActiveDocument(null)}
                aria-label="Bezárás"
              >
                ×
              </button>
            </header>

            <div className="benefit-modal-body">
              {activeDocument.sections.map((section) => (
                <section
                  className="benefit-document-section"
                  key={section.title}
                >
                  <h3>{section.title}</h3>

                  <div className="benefit-document-text">
                    {section.content
                      .trim()
                      .split("\n\n")
                      .map((paragraph, index) => (
                        <p key={index}>
                          {paragraph.split("\n").map((line, lineIndex) => (
                            <span key={lineIndex}>
                              {line}
                              {lineIndex < paragraph.split("\n").length - 1 && (
                                <br />
                              )}
                            </span>
                          ))}
                        </p>
                      ))}
                  </div>
                </section>
              ))}
            </div>

            <footer className="benefit-modal-footer">
              <span>Ball of Duty Management</span>

              <button
                type="button"
                className="button-secondary"
                onClick={() => setActiveDocument(null)}
              >
                Bezárás
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="benefit-progress-empty">–</span>;
  }

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="benefit-progress">
      <div className="benefit-progress-track">
        <div
          className="benefit-progress-fill"
          style={{ width: `${clampedValue}%` }}
        />
      </div>

      <strong>{value}%</strong>
    </div>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "–";
  }

  return Number(value).toLocaleString("hu-HU", {
    maximumFractionDigits: 1,
  });
}

export default BenefitTracker;
