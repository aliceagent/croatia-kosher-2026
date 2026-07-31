import { Link } from "react-router-dom";
import { Banner, Disclaimer, Notice, SOURCE_PDF } from "../components/ui";
import { brands, categories, products } from "../lib/data";
import storesRaw from "../../data/stores.json";

export default function About() {
  return (
    <div style={{ paddingTop: 18, maxWidth: 720 }}>
      <Banner name="about" widths={[1400, 760]} ratio="1400 / 788">
        <h1 style={{ fontSize: "clamp(19px, 3.4vw, 27px)" }}>About this site</h1>
        <p>An unofficial, searchable version of the 2026 kosher list of Croatia.</p>
      </Banner>

      <p>
        This is an unofficial, searchable version of{" "}
        <strong>KOŠER PROIZVODI U HRVATSKOJ — 2026</strong> (The 2026 Kosher
        Products List of Croatia), a 48-page document published by the Jewish
        community <em>Bet Israel</em> in Zagreb and authorised by Chief Rabbi
        Dr. Kotel Da-Don.
      </p>

      <div style={{ margin: "16px 0" }}>
        <Disclaimer />
      </div>

      <h2 className="section-title">Who made this</h2>
      <p>
        Built by <strong>Jonathan Caras</strong> (
        <a href="https://x.com/madcapslaugh" target="_blank" rel="noreferrer">@madcapslaugh</a>
        ) and <strong>Claude Code</strong>, by transcribing the{" "}
        <a href={SOURCE_PDF} target="_blank" rel="noreferrer">
          original 2026 PDF
        </a>{" "}
        published by Bet Israel. It is not affiliated with, endorsed by, or
        reviewed by Bet Israel, Chabad, or any rabbinic authority. The
        transcription was done by software and checked by no one.
      </p>

      <div style={{ margin: "16px 0" }}>
        <Notice kind="warn">
          <div>
            The community remains the authority. This site is a search interface,
            not a kashrut authority, and it does not replace a rabbi. It is also{" "}
            <strong>not a Passover list</strong>.
          </div>
        </Notice>
      </div>

      <h2 className="section-title">The publication</h2>
      <div className="card" style={{ padding: 16 }}>
        <p style={{ marginTop: 0 }}>
          <strong>Židovska vjerska zajednica „Bet Israel" u Hrvatskoj</strong>
          <br />
          Mažuranićev trg 6, 10000 Zagreb, Croatia
          <br />
          Tel <a href="tel:+38514851008">+385 (1) 48 51 008</a> · Fax +385 (1) 48 51 376
          <br />
          <a href="mailto:ured@bet-israel.com">ured@bet-israel.com</a> ·{" "}
          <a href="https://www.bet-israel.com" target="_blank" rel="noreferrer">
            www.bet-israel.com
          </a>
        </p>
        <p className="tiny muted" style={{ marginBottom: 0 }}>
          Authorised by Chief Rabbi Dr. Kotel Da-Don. Hebrew and design by Shlomi
          Dado. Web by Leo Drempetić.
        </p>
      </div>

      <h2 className="section-title">What is in the data</h2>
      <ul>
        <li>
          <strong>{products.length.toLocaleString()} entries</strong> across{" "}
          {categories.length} categories and {brands.length} producers, from all 48
          pages.
        </li>
        <li>
          Product names in <strong>Croatian, English, German and Hebrew</strong>,
          all of them searchable. Accents are optional — <em>cokolada</em> finds{" "}
          <em>čokolada</em>.
        </li>
        <li>
          <strong>Every entry cites its page</strong> in the printed list, so any
          answer here can be checked against the original.
        </li>
        <li>
          {storesRaw.stores.length.toLocaleString()} branches of the six chains
          the list names under "where to buy" across{" "}
          {storesRaw.cities.length} towns, from{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{" "}
          (ODbL), snapshot {storesRaw.snapshot}.
        </li>
      </ul>

      <h2 className="section-title">How the kashrut status is handled</h2>
      <p>
        The list does not use one flat "kosher" mark, and neither does this site.
        Statuses are taken from explicit markings in the document — the dairy
        declarations, the "only if it has the kosher symbol" notes, the alcohol
        table's kosher / not-kosher column, the fish species list. Where a status
        follows from the document's convention rather than a stated marking, the
        product page says so outright rather than presenting it as certain.
      </p>
      <p>
        A build-time check refuses to ship the site if a not-kosher item goes
        missing or is reclassified, if a "check the package" flag is lost, or if
        the section totals drift. <Link to="/guide">Read the kashrut guide →</Link>
      </p>

      <h2 className="section-title">Privacy</h2>
      <p>
        There is no account, no analytics, no cookies and no server. Favourites and
        shopping lists live in your browser's local storage on your device.
        Sharing a list puts it in the URL itself, so it travels between the people
        who have the link and nowhere else. Location, if you use "near me", is used
        in the page and never transmitted.
      </p>

      <h2 className="section-title">Offline</h2>
      <figure className="figure">
        <img
          src="/img/offline-1200.webp"
          srcSet="/img/offline-640.webp 640w, /img/offline-1200.webp 1200w"
          sizes="(max-width: 760px) 100vw, 720px"
          alt=""
          loading="lazy"
          decoding="async"
          width={1200}
          height={800}
        />
        <figcaption>
          The whole database is cached on your device, so search keeps working
          in a shop with no signal.
        </figcaption>
      </figure>
      <p>
        The whole database is cached on first visit, so search keeps working in a
        supermarket with no signal. Add it to your home screen and it behaves like
        an app.
      </p>

      <h2 className="section-title">Corrections</h2>
      <p>
        Errors in this site's transcription are worth reporting, and so are errors
        in the underlying list. Both go to{" "}
        <a href="mailto:ured@bet-israel.com">ured@bet-israel.com</a>. Every product
        page has a pre-filled correction link that includes the page number.
      </p>

      <p className="tiny muted" style={{ marginTop: 28 }}>
        2026 edition. Kashrut lists expire — check{" "}
        <a href="https://www.bet-israel.com" target="_blank" rel="noreferrer">
          bet-israel.com
        </a>{" "}
        for the current year before relying on this.
      </p>
    </div>
  );
}
