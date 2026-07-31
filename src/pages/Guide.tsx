import { Link } from "react-router-dom";
import { Notice } from "../components/ui";
import { products } from "../lib/data";

const count = (fn: (p: (typeof products)[number]) => boolean) =>
  products.filter(fn).length;

export default function Guide() {
  return (
    <div style={{ paddingTop: 18, maxWidth: 720 }}>
      <h1 style={{ fontSize: 26, marginBottom: 10 }}>Kashrut guide</h1>
      <p className="muted">
        What each badge on this site means, and what it does not mean.
      </p>

      <div style={{ margin: "18px 0" }}>
        <Notice kind="danger">
          <div>
            <strong>This is not a Passover list.</strong> The 2026 list contains no
            Pesach information at all. Nothing here should be relied on for
            Passover.
          </div>
        </Notice>
      </div>

      <h2 className="section-title">The badges</h2>

      <div className="card" style={{ padding: 18, display: "grid", gap: 20 }}>
        <div>
          <span className="badge badge-pareve lg">✓ Pareve</span>
          <p style={{ marginBottom: 0 }}>
            Neither meat nor dairy — it can be eaten with either.{" "}
            {count((p) => p.kashrut.status === "pareve" && !p.kashrut.requiresHechsher)} entries.
          </p>
          <p className="tiny muted" style={{ marginTop: 6, marginBottom: 0 }}>
            Where the list does not state the status outright, the product page
            says so. The 2026 list marks its dairy lines explicitly, so an unmarked
            entry is not a dairy entry — but if it matters for your meal, read the
            ingredients.
          </p>
        </div>

        <div>
          <span className="badge badge-dairy lg">◗ Dairy</span>
          <p style={{ marginBottom: 0 }}>
            Dairy, and <strong>not Chalav Yisrael</strong> — the milk is not under
            Jewish supervision from milking. Not to be eaten with or after meat.{" "}
            {count((p) => p.kashrut.status === "dairy")} entries, including most
            chocolate bars, Nestlé cereals and the Koestlin biscuit range.
          </p>
        </div>

        <div>
          <span className="badge badge-symbol lg">⌕ Check the package</span>
          <p style={{ marginBottom: 0 }}>
            The most misread status on the list. These items are approved{" "}
            <strong>only when the specific package in your hand carries a kosher
            symbol</strong>. The same product without the symbol is not covered.{" "}
            {count((p) => p.kashrut.requiresHechsher)} entries — Mlinar's burek and
            cakes, every Vindija cheese, and wine.
          </p>
        </div>

        <div>
          <span className="badge badge-not lg">✕ Not kosher</span>
          <p style={{ marginBottom: 0 }}>
            Listed so you can recognise them.{" "}
            {count((p) => p.kashrut.status === "not-kosher")} entries, all in the
            alcohol table — Campari, Martini, Ouzo, Vermouth, Champagne, cognac,
            egg liqueur and grape juice among them.{" "}
            <Link to="/category/alcohol">See the alcohol page →</Link>
          </p>
        </div>

        <div>
          <span className="badge badge-conditional lg">◈ Conditional</span>
          <p style={{ marginBottom: 0 }}>
            Kosher only from a named producer, or "generally kosher" as a category.
            Cherry Brandy and Maraschino are approved from <strong>Maraska</strong>;
            the same drink from another distiller is not.
          </p>
        </div>

        <div>
          <span className="badge badge-species lg">≈ Kosher species</span>
          <p style={{ marginBottom: 0 }}>
            Used only in the fish section. It says the <em>species</em> is kosher —
            fins and scales — which is what you need when reading a Croatian
            fish-market board. It does not certify any processed fish product.{" "}
            <Link to="/category/fish">See the fish list →</Link>
          </p>
        </div>
      </div>

      <h2 className="section-title">Three things worth knowing</h2>

      <div className="card" style={{ padding: 18, display: "grid", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>
            Not being on the list is not a ruling
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            The list covers what the community checked for 2026. A product can be
            missing simply because nobody submitted it. If you need an answer about
            something specific, ask{" "}
            <a href="mailto:ured@bet-israel.com">Bet Israel</a>.
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Grape products are different</h3>
          <p className="muted" style={{ margin: 0 }}>
            Wine, grape juice, cognac and brandy require rabbinic supervision, full
            stop. The list is explicit that it contains none of them. Even approved
            juice brands carve grape juice out: Granini, Rauch and Juicy are listed
            "except grape juice". Kosher wine comes from the community in Zagreb.
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>"All varieties" has limits</h3>
          <p className="muted" style={{ margin: 0 }}>
            Some producers are approved wholesale — Barilla pasta, Illy and Lavazza
            coffee, Teekanne tea, Colgate toothpaste. Where the list carves out an
            exception it is shown on the product page, such as Lindt thin dark
            chocolate being approved <em>only</em> when made in Switzerland.
          </p>
        </div>
      </div>

      <h2 className="section-title">The source</h2>
      <p>
        Everything here comes from <strong>KOŠER PROIZVODI U HRVATSKOJ 2026</strong>,
        authorised by Chief Rabbi Dr. Kotel Da-Don and published by the Jewish
        community Bet Israel in Zagreb. Every product page cites the page of the
        printed list it came from, so you can check it yourself.{" "}
        <Link to="/about">More about this site →</Link>
      </p>
    </div>
  );
}
