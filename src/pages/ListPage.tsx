import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge, Empty, Icon, Notice } from "../components/ui";
import {
  aisleFor, AISLES, displayName, productById,
} from "../lib/data";
import storesData from "../../data/stores.json";
import { useStore } from "../lib/store";
import type { ListItem } from "../lib/store";
import { decodeList, encodeList, listAsText } from "../lib/share";

export default function ListPage() {
  const {
    lists, activeList, activeListId, setActiveListId, createList, deleteList,
    renameList, addCustom, removeItem, setQty, toggleDone, clearDone,
  } = useStore();
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const location = useLocation();

  // A shared list arrives in the URL hash and is imported as a new list, so it
  // can never silently overwrite whatever the person already had.
  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash) return;
    const parsed = decodeList(hash);
    if (!parsed) return;
    const id = createList(parsed.name);
    setImported({ id, count: parsed.items.length, items: parsed.items });
    history.replaceState(null, "", location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [imported, setImported] = useState<
    { id: string; count: number; items: ListItem[] } | null
  >(null);
  const { replaceList } = useStore();
  useEffect(() => {
    if (imported) {
      replaceList(imported.id, imported.items);
      setImported(null);
    }
  }, [imported, replaceList]);

  const items = activeList.items;
  const done = items.filter((i) => i.done).length;

  const grouped = useMemo(() => {
    const map = new Map<string, { item: ListItem; index: number }[]>();
    items.forEach((item, index) => {
      const p = item.productId ? productById.get(item.productId) : null;
      const aisle = p ? aisleFor(p) : "Other";
      const arr = map.get(aisle) ?? [];
      arr.push({ item, index });
      map.set(aisle, arr);
    });
    return AISLES.filter((a) => map.has(a)).map((a) => [a, map.get(a)!] as const);
  }, [items]);

  /*
   * The imported organic brands are the only part of the list a normal
   * supermarket will not have, so if any are on the list it is worth saying so
   * before someone walks to the wrong shop.
   */
  const healthFoodOnList = useMemo(() => {
    const brands = storesData.healthFoodBrands as string[];
    const hits = items
      .map((i) => (i.productId ? productById.get(i.productId) : null))
      .filter((p) => p && p.brand && brands.includes(p.brand));
    return hits.length;
  }, [items]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !items.length) return "";
    return `${window.location.origin}/list#${encodeList(items, activeList.name)}`;
  }, [items, activeList.name]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      setCopied("failed");
    }
  };

  return (
    <div style={{ paddingTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 25 }}>{activeList.name}</h1>
        <span className="muted tiny">
          {items.length - done} to buy{done > 0 && ` · ${done} done`}
        </span>
      </div>

      {lists.length > 1 && (
        <div className="chips no-print" style={{ margin: "12px 0" }}>
          {lists.map((l) => (
            <button
              key={l.id}
              className={`chip ${l.id === activeListId ? "on" : ""}`}
              onClick={() => setActiveListId(l.id)}
            >
              {l.name} <span className="n">{l.items.filter((i) => !i.done).length}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className="no-print"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0 18px", maxWidth: "100%" }}
      >
        <button
          className="btn btn-sm"
          onClick={() => {
            const name = prompt("Name for the new list", "Shabbat shopping");
            if (name !== null) createList(name);
          }}
        >
          + New list
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            const name = prompt("Rename this list", activeList.name);
            if (name) renameList(activeListId, name);
          }}
        >
          Rename
        </button>
        {items.length > 0 && (
          <>
            <button className="btn btn-sm" onClick={() => window.print()}>
              Print
            </button>
            <button
              className="btn btn-sm"
              onClick={() => copy(listAsText(items, activeList.name), "text")}
            >
              {copied === "text" ? "Copied ✓" : "Copy as text"}
            </button>
            <button className="btn btn-sm" onClick={() => copy(shareUrl, "link")}>
              {copied === "link" ? "Link copied ✓" : "Share link"}
            </button>
          </>
        )}
        {done > 0 && (
          <button className="btn btn-sm" onClick={clearDone}>
            Clear {done} done
          </button>
        )}
        {lists.length > 1 && (
          <button
            className="btn btn-sm"
            onClick={() => {
              if (confirm(`Delete the list “${activeList.name}”?`)) deleteList(activeListId);
            }}
          >
            Delete list
          </button>
        )}
      </div>

      <form
        className="no-print"
        onSubmit={(e) => {
          e.preventDefault();
          addCustom(custom);
          setCustom("");
        }}
        style={{ display: "flex", gap: 8, marginBottom: 20 }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Add anything else — tomatoes, fresh fish…"
          aria-label="Add a custom item"
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text)", fontSize: 16,
          }}
        />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      {items.length === 0 ? (
        <Empty title="Your shopping list is empty">
          <img
            className="empty-art"
            src="/img/empty-list-380.webp"
            alt=""
            loading="lazy"
            decoding="async"
            width={380}
            height={380}
          />
          <p>
            Add products with the <strong>+</strong> button anywhere on the site,
            or type anything into the box above. Fresh fruit and vegetables of all
            kinds are approved by the list, so add those freely.
          </p>
          <p>
            <Link className="btn btn-primary" to="/browse">Browse products</Link>{" "}
            <Link className="btn" to="/favorites">From favourites</Link>
          </p>
        </Empty>
      ) : (
        <>
          {healthFoodOnList > 0 && (
            <div className="no-print" style={{ marginBottom: 16 }}>
              <Notice kind="warn">
                <div>
                  <strong>
                    {healthFoodOnList} item{healthFoodOnList === 1 ? "" : "s"} on
                    this list {healthFoodOnList === 1 ? "is" : "are"} an imported
                    organic brand.
                  </strong>{" "}
                  An ordinary supermarket is unlikely to carry those — plan a
                  bio&amp;bio stop. <Link to="/stores">Find the nearest one →</Link>
                </div>
              </Notice>
            </div>
          )}

          {grouped.map(([aisle, entries]) => (
            <section key={aisle}>
              <h2 className="section-title">{aisle}</h2>
              <div className="plist">
                {entries.map(({ item, index }) => {
                  const p = item.productId ? productById.get(item.productId) : null;
                  return (
                    <div
                      className="prow"
                      key={`${item.productId ?? item.custom}-${index}`}
                      style={{ opacity: item.done ? 0.5 : 1 }}
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleDone(index)}
                        aria-label={`Mark ${p ? displayName(p) : item.custom} as bought`}
                        style={{ width: 26, height: 26, flex: "none", cursor: "pointer", margin: 3 }}
                      />
                      <div className="prow-main">
                        {p ? (
                          <Link
                            className="prow-name"
                            to={`/product/${p.id}`}
                            style={{ textDecoration: item.done ? "line-through" : "none" }}
                          >
                            {displayName(p)}
                          </Link>
                        ) : (
                          <span
                            className="prow-name"
                            style={{ textDecoration: item.done ? "line-through" : "none" }}
                          >
                            {item.custom}
                          </span>
                        )}
                        <div className="prow-meta">
                          {p?.brand && <strong>{p.brand}</strong>}
                          {p?.sizes && <span>{p.sizes.join(" · ")}</span>}
                          {!p && <span className="tag">Your own item</span>}
                        </div>
                      </div>
                      <div className="prow-side">
                        {p && <Badge product={p} />}
                        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <button
                            className="addbtn"
                            onClick={() => setQty(index, item.qty - 1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span
                            style={{ minWidth: 22, textAlign: "center", fontWeight: 700 }}
                            aria-label={`Quantity ${item.qty}`}
                          >
                            {item.qty}
                          </span>
                          <button
                            className="addbtn"
                            onClick={() => setQty(index, item.qty + 1)}
                            aria-label="Increase quantity"
                          >
                            {Icon.plus}
                          </button>
                          <button
                            className="addbtn"
                            onClick={() => removeItem(index)}
                            aria-label="Remove from list"
                          >
                            {Icon.x}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div style={{ marginTop: 22 }}>
            <Notice kind="info">
              <div>
                Items grouped by supermarket aisle. Print this before Shabbat, or
                share the link — it encodes the whole list in the URL, so nothing
                is stored on a server.
              </div>
            </Notice>
          </div>
        </>
      )}
    </div>
  );
}
