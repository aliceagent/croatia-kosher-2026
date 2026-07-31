import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  brandByName, categories, fold, products, search, STATUS_FILTERS,
  statusOrder, displayName,
} from "./data";
import type { Product } from "./types";

export interface FilterState {
  q: string;
  cats: string[];
  status: string[];
  brands: string[];
  tags: string[];
  origin: string[];
}

/**
 * Filter state lives in the URL so every view is shareable and survives a
 * refresh or a back button.
 */
export function useFilters() {
  const [params, setParams] = useSearchParams();

  const state: FilterState = useMemo(
    () => ({
      q: params.get("q") ?? "",
      cats: params.getAll("cat"),
      status: params.getAll("status"),
      brands: params.getAll("brand"),
      tags: params.getAll("tag"),
      origin: params.getAll("origin"),
    }),
    [params],
  );

  const set = (key: string, values: string[] | string) => {
    const next = new URLSearchParams(params);
    next.delete(key);
    const list = Array.isArray(values) ? values : values ? [values] : [];
    for (const v of list) next.append(key, v);
    setParams(next, { replace: true });
  };

  const toggle = (key: keyof FilterState, value: string) => {
    const cur = state[key] as string[];
    set(
      key === "cats" ? "cat" : key === "status" ? "status" : key === "brands"
        ? "brand" : key === "tags" ? "tag" : "origin",
      cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
    );
  };

  const setQuery = (q: string) => set("q", q);

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const activeCount =
    state.cats.length + state.status.length + state.brands.length +
    state.tags.length + state.origin.length;

  const base = useMemo(() => {
    // Search ranks by relevance; browsing sorts alphabetically with the rows
    // that need a second look (dairy, needs-a-symbol, not kosher) after the
    // straightforwardly pareve ones.
    if (state.q.trim()) return search(state.q);
    return [...products].sort((a, b) => {
      const s = statusOrder(a) - statusOrder(b);
      if (s !== 0) return s;
      return fold(displayName(a)).localeCompare(fold(displayName(b)));
    });
  }, [state.q]);

  const predicates = useMemo(() => {
    const statusMatchers = STATUS_FILTERS.filter((f) => state.status.includes(f.id));
    return {
      cats: (p: Product) => !state.cats.length || state.cats.includes(p.category),
      status: (p: Product) => !statusMatchers.length || statusMatchers.some((f) => f.match(p)),
      brands: (p: Product) =>
        !state.brands.length || (!!p.brand && state.brands.includes(p.brand)),
      tags: (p: Product) =>
        !state.tags.length || state.tags.some((t) => p.tags?.includes(t)),
      origin: (p: Product) => {
        if (!state.origin.length) return true;
        const o = p.brand ? brandByName.get(p.brand)?.origin : null;
        return !!o && state.origin.includes(o);
      },
    };
  }, [state]);

  const results = useMemo(
    () => base.filter((p) => Object.values(predicates).every((fn) => fn(p))),
    [base, predicates],
  );

  /**
   * Facet counts exclude that facet's own selection, so a chip shows how many
   * results picking it *would* give. Counting against the fully filtered set
   * instead would show 0 on every unselected category the moment one category
   * is chosen, which reads as "nothing there" rather than "not selected".
   */
  const facets = useMemo(() => {
    const countBy = <T,>(
      exclude: keyof typeof predicates,
      keysOf: (p: Product) => T[],
    ) => {
      const out = new Map<T, number>();
      for (const p of base) {
        let passes = true;
        for (const [key, fn] of Object.entries(predicates)) {
          if (key !== exclude && !fn(p)) {
            passes = false;
            break;
          }
        }
        if (!passes) continue;
        for (const k of keysOf(p)) out.set(k, (out.get(k) ?? 0) + 1);
      }
      return Object.fromEntries(out) as Record<string, number>;
    };

    return {
      cat: countBy("cats", (p) => [p.category]),
      status: countBy("status", (p) =>
        STATUS_FILTERS.filter((f) => f.match(p)).map((f) => f.id),
      ),
      tag: countBy("tags", (p) => p.tags ?? []),
      origin: countBy("origin", (p) => {
        const o = p.brand ? brandByName.get(p.brand)?.origin : null;
        return o ? [o] : [];
      }),
    };
  }, [base, predicates]);

  const availableTags = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) for (const t of p.tags || []) seen.add(t);
    return [...seen];
  }, []);

  return {
    state, results, facets, categories, availableTags,
    setQuery, toggle, clearAll, activeCount,
  };
}
