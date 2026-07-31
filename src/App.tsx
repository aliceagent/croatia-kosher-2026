import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { Disclaimer, Icon, Logo } from "./components/ui";
import { useStore } from "./lib/store";
// The store finder carries 1,032 branch records that no other page needs, so
// it is split out of the main bundle.
const Stores = lazy(() => import("./pages/Stores"));

import Home from "./pages/Home";
import Browse from "./pages/Browse";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import BrandPage from "./pages/BrandPage";
import Favorites from "./pages/Favorites";
import ListPage from "./pages/ListPage";
import Guide from "./pages/Guide";
import About from "./pages/About";

const TABS = [
  { to: "/", label: "Home", end: true },
  { to: "/browse", label: "Browse" },
  { to: "/stores", label: "Where to buy" },
  { to: "/guide", label: "Kashrut guide" },
  { to: "/about", label: "About" },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { favorites, activeList, theme, setTheme } = useStore();
  const listCount = activeList.items.filter((i) => !i.done).length;

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="header no-print">
        <div className="header-inner">
          <Link className="brand" to="/">
            <Logo size={32} tone="light" />
            <span>
              Kosher Croatia
              <br />
              <span className="brand-sub">2026 list</span>
            </span>
          </Link>
          <div className="header-spacer" />
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {Icon.moon}
            </button>
            <Link className="icon-btn" to="/favorites" aria-label={`Favourites (${favorites.length})`} title="Favourites">
              {Icon.star(favorites.length > 0)}
              {favorites.length > 0 && <span className="count">{favorites.length}</span>}
            </Link>
            <Link className="icon-btn" to="/list" aria-label={`Shopping list (${listCount})`} title="Shopping list">
              {Icon.cart}
              {listCount > 0 && <span className="count">{listCount}</span>}
            </Link>
          </div>
        </div>
      </header>

      <nav className="tabs no-print" aria-label="Main">
        <div className="tabs-inner">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
            >
              {t.label}
            </NavLink>
          ))}
          {/* Favourites and the shopping list also live behind the header
              icons, but an unlabelled icon in a corner is not somewhere people
              look. They are named here, where the rest of the site is. */}
          <span className="tab-sep" aria-hidden="true" />
          <NavLink
            to="/favorites"
            className={({ isActive }) => `tab tab-mine ${isActive ? "active" : ""}`}
          >
            {Icon.star(favorites.length > 0)}
            Favourites
            {favorites.length > 0 && <span className="tab-n">{favorites.length}</span>}
          </NavLink>
          <NavLink
            to="/list"
            className={({ isActive }) => `tab tab-mine ${isActive ? "active" : ""}`}
          >
            {Icon.cart}
            My list
            {listCount > 0 && <span className="tab-n">{listCount}</span>}
          </NavLink>
        </div>
      </nav>

      <nav className="bottomnav no-print" aria-label="Main, mobile">
        {[
          { to: "/", label: "Search", icon: Icon.search, end: true },
          { to: "/browse", label: "Browse", icon: Icon.grid },
          { to: "/stores", label: "Shops", icon: Icon.pin },
          { to: "/favorites", label: "Saved", icon: Icon.star(favorites.length > 0), n: favorites.length },
          { to: "/list", label: "My list", icon: Icon.cart, n: listCount },
        ].map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `bnav ${isActive ? "active" : ""}`}
          >
            <span className="bnav-icon">
              {t.icon}
              {!!t.n && <span className="bnav-n">{t.n}</span>}
            </span>
            {t.label}
          </NavLink>
        ))}
      </nav>

      <ScrollToTop />

      <main id="main" className="shell">
        <Suspense fallback={<p className="muted" style={{ padding: 30 }}>Loading…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/brand/:id" element={<BrandPage />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/about" element={<About />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h3>Page not found</h3>
                <p><Link to="/">Back to search</Link></p>
              </div>
            }
          />
        </Routes>
        </Suspense>
      </main>

      <footer className="site no-print">
        <div className="shell">
          <div style={{ marginBottom: 16 }}>
            <Disclaimer compact />
          </div>
          <p>
            Data from <strong>KOŠER PROIZVODI U HRVATSKOJ 2026</strong>, authorised by
            Chief Rabbi Dr. Kotel Da-Don and published by the Jewish community{" "}
            <a href="https://www.bet-israel.com" target="_blank" rel="noreferrer">
              Bet Israel
            </a>
            , Zagreb. This site is an unofficial search interface onto that list —
            the community remains the authority.
          </p>
          <p>
            Not a Passover list. Always verify with the printed list or the community.{" "}
            <Link to="/about">About &amp; contact</Link>
          </p>
        </div>
      </footer>
    </>
  );
}
