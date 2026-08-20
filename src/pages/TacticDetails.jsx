import { Link, Navigate, useParams } from "react-router-dom";
import { getTactic } from "../data/tactics";
import "../styles/tactics.css";

const ICE_CUBE_CLIP = "PricklyYawningEndiveTebowing-dVHcnzI_V42qVmN7";

const iceCubeSteps = [
  {
    title: "Kisszöglet és forgatás",
    description: "A szögletet röviden játsszuk meg. A fogadó visszapasszolja a labdát a szögletet végző játékosnak, vagy bevon egy harmadik embert a tizenhatos sarkánál.",
  },
  {
    title: "Mélységi beívelés",
    description: "A labdát kapó játékos a kimozgatott védelem mellett, kedvezőbb szögből ível a hosszú oldali ötös sarkának irányába.",
  },
  {
    title: "Visszafejelés (flick-on)",
    description: "A hosszú oldalon érkező magas játékos megnyeri a légi párharcot, majd fejjel visszakészíti a labdát a kapu előterébe – vagy tiszta helyzetben közvetlenül kapura fejel.",
  },
  {
    title: "Befejezés",
    description: "A kapu közepén berobbanó támadó az elmozdított védelem mögött, közelről fejezi be az akciót.",
  },
];

const smallBasicSteps = [
  {
    title: "Kisszöglet és forgatás",
    description: "A szögletet röviden játsszuk meg a társnak, aki egy érintéssel visszapasszolja a labdát a szögletet végző játékosnak.",
  },
  {
    title: "Mélységi passz",
    description: "A visszakapott labdát az alapvonal irányába induló játékoshoz, vagy a második hullámban érkező társhoz továbbítjuk.",
  },
  {
    title: "Lövés vagy visszajátszás",
    description: "A második hullámban érkező játékos tiszta helyzetből kapura lő. Ha az alapvonalnál lévő társ kapja a labdát, visszajátszhatja a második vonalra, vagy a hosszú oldali ötös sarkára ívelhet.",
  },
  {
    title: "Befejezés",
    description: "A tizenegyespont környékére berobbanó támadó lövéssel fejez, vagy a hosszú oldalon, az elmozdított védelem mögül érkező játékos kapura fejel.",
  },
];

const catapultSteps = [
  {
    title: "Kisszöglet",
    description: "A szögletet röviden játsszuk meg a kilépő társnak, aki visszapasszolja a labdát, vagy jobb beadási szöget nyitva azonnal középre ível.",
  },
  {
    title: "Beívelés",
    description: "A labda élesen és kanyarodva érkezik a rövid kapufához, közvetlenül az ötös sarkának környékére.",
  },
  {
    title: "Rövid oldali megcsúsztatás",
    description: "A rövid kapufához berobbanó játékos megelőzi az elmozdított védőt, majd fejjel a kapu előterén keresztül a hosszú oldal felé csúsztatja tovább a labdát.",
  },
  {
    title: "Befejezés",
    description: "A hátsó kapufánál üresen érkező támadó berobban a továbbcsúsztatott labdára, és közelről a hálóba fejel.",
  },
];

const magnetSteps = [
  {
    title: "Közvetlen beívelés",
    description: "A szögletet végző játékos közvetlenül, erőteljesen tekeri be a labdát a rövid kapufa vonalába, az ötös és a tizenhatos vonala közötti területre, nagyjából a tizenegyespont magasságába.",
  },
  {
    title: "Első érintés – lefejelés vagy lekészítés",
    description: "A rövid oldalra ütemben berobbanó támadó megelőzi a védőjét, majd kapura fejelés helyett továbbfejeli vagy lefejeli a labdát a középen érkező társnak.",
  },
  {
    title: "Lövés vagy továbbpassz",
    description: "A kapu elé érkező játékos közvetlenül kapura lőhet, vagy egy gyors továbbpasszal helyzetbe hozhatja a még jobb pozícióban lévő befejezőt.",
  },
  {
    title: "Befejezés",
    description: "A középen vagy a hosszú oldalon üresen maradó támadó közelről a hálóba juttatja a labdát.",
  },
];

function TwitchClip({ clip, title }) {
  const parent = window.location.hostname || "localhost";
  const src = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&parent=${encodeURIComponent(parent)}&autoplay=false`;

  return (
    <iframe
      src={src}
      title={title}
      allow="autoplay; fullscreen"
      allowFullScreen
      loading="lazy"
    />
  );
}

function TacticDetails() {
  const { tacticSlug } = useParams();
  const tactic = getTactic(tacticSlug);

  if (!tactic) return <Navigate to="/tactics" replace />;

  if (tactic.type === "set-piece") {
    return (
      <div className="page-stack tactic-details">
        <Link className="tactic-details__back" to="/tactics">← Vissza a taktikákhoz</Link>
        <header className="tactic-details__hero panel">
          <div>
            <span className="eyebrow">Ball of Duty Playbook</span>
            <h1>{tactic.name}</h1>
            <p>{tactic.summary}</p>
          </div>
          <span className="tactic-details__tag">{tactic.accent}</span>
        </header>

        <section className="corner-variations panel">
          <div className="corner-variations__heading">
            <div>
              <span className="eyebrow">Rövid videók és animációk</span>
              <h2>Variációk</h2>
            </div>
            <span>Egymás után lejátszható figurák</span>
          </div>

          <div className="corner-variations__list">
            <article className="corner-variation corner-variation--complete">
              <div className="corner-variation__media corner-variation__media--clip">
                <TwitchClip clip={ICE_CUBE_CLIP} title="ICE CUBE szögletvariáció" />
              </div>
              <div className="corner-variation__copy">
                <span className="eyebrow">Variáció 01</span>
                <h3>ICE CUBE</h3>
                <ol className="corner-variation__steps">
                  {iceCubeSteps.map((step) => (
                    <li key={step.title}>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </article>

            <article className="corner-variation corner-variation--complete">
              <div className="corner-variation__media corner-variation__media--clip">
                <video controls playsInline preload="metadata">
                  <source src="/videos/tactics/kicsi-alap.mp4" type="video/mp4" />
                  A böngésződ nem támogatja a videó lejátszását.
                </video>
              </div>
              <div className="corner-variation__copy">
                <span className="eyebrow">Variáció 02</span>
                <h3>KICSI ALAP</h3>
                <ol className="corner-variation__steps">
                  {smallBasicSteps.map((step) => (
                    <li key={step.title}>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </article>

            <article className="corner-variation corner-variation--complete">
              <div className="corner-variation__media corner-variation__media--clip">
                <video controls playsInline preload="metadata">
                  <source src="/videos/tactics/katapult.mp4" type="video/mp4" />
                  A böngésződ nem támogatja a videó lejátszását.
                </video>
              </div>
              <div className="corner-variation__copy">
                <span className="eyebrow">Variáció 03</span>
                <h3>KATAPULT</h3>
                <ol className="corner-variation__steps">
                  {catapultSteps.map((step) => (
                    <li key={step.title}>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </article>

            <article className="corner-variation corner-variation--complete">
              <div className="corner-variation__media corner-variation__media--clip">
                <video controls playsInline preload="metadata">
                  <source src="/videos/tactics/magnes.mp4" type="video/mp4" />
                  A böngésződ nem támogatja a videó lejátszását.
                </video>
              </div>
              <div className="corner-variation__copy">
                <span className="eyebrow">Variáció 04</span>
                <h3>MÁGNES</h3>
                <ol className="corner-variation__steps">
                  {magnetSteps.map((step) => (
                    <li key={step.title}>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack tactic-details">
      <Link className="tactic-details__back" to="/tactics">← Vissza a taktikákhoz</Link>
      <header className="tactic-details__hero panel">
        <div>
          <span className="eyebrow">Ball of Duty Playbook</span>
          <h1>{tactic.name}{tactic.label === "False 9" ? " (False 9)" : ""}</h1>
          <p>{tactic.summary}</p>
        </div>
        <span className="tactic-details__tag">{tactic.accent}</span>
      </header>

      <section className="tactic-details__layout">
        <article className="tactic-content panel">
          <span className="eyebrow">Taktikai leírás</span>
          <h2>A rendszer működése</h2>
          <div className="tactic-empty">
            <span>✦</span>
            <strong>A részletes leírás előkészítve</strong>
            <p>Ide kerül majd a felállás célja, a játékosok szerepköre, valamint a támadó és védekező alapelvek.</p>
          </div>
        </article>
        <aside className="tactic-media panel">
          <span className="eyebrow">Képek és videók</span>
          <h2>Vizuális segédletek</h2>
          <div className="tactic-media__placeholder">Felállásábra</div>
          <div className="tactic-media__placeholder tactic-media__placeholder--video">Videóelemzés</div>
        </aside>
      </section>
    </div>
  );
}

export default TacticDetails;
