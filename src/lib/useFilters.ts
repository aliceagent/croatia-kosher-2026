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

  const results = useMemo(() => {
    // Search ranks by relevance; browsing sorts alphabetically with the rows
    // that need a second look (dairy, needs-a-symbol, not kosher) after the
    // straightforwardly pareve ones.
    let base: Product[];
    if (state.q.trim()) {
      base = search(state.q);
    } else {
      base = [...products].sort((a, b) => {
        const s = statusOrder(a) - statusOrder(b);
        if (s !== 0) return s;
        return fold(displayName(a)).localeCompare(fold(displayName(b)));
      });
    }

    const statusMatchers = STATUS_FILTERS.filter((f) => state.status.includes(f.id));

    return base.filter((p) => {
      if (state.cats.length && !state.cats.includes(p.category)) return false;
      if (statusMatchers.length && !statusMatchers.some((f) => f.match(p))) return false;
      if (state.brands.length && (!p.brand || !state.brands.includes(p.brand))) return false;
      if (state.tags.length && !state.tags.some((t) => p.tags?.includes(t))) return false;
      if (state.origin.length) {
        const o = p.brand ? brandByName.get(p.brand)?.origin : null;
        if (!o || !state.origin.includes(o)) return false;
      }
      return true;
    });
  }, [state]);

  /** Counts for the facet chips, computed against the other active filters. */
  const facets = useMemo(() => {
    const cat: Record<string, number> = {};
    const status: Record<string, number> = {};
    const tag: Record<string, number> = {};
    const origin: Record<string, number> = {};
    for (const p of results) {
      cat[p.category] = (cat[p.category] || 0) + 1;
      for (const f of STATUS_FILTERS) {
        if (f.match(p)) status[f.id] = (status[f.id] || 0) + 1;
      }
      for (const t of p.tags || []) tag[t] = (tag[t] || 0) + 1;
      const o = p.brand ? brandByName.get(p.brand)?.origin : null;
      if (o) origin[o] = (origin[o] || 0) + 1;
    }
    return { cat, status, tag, origin };
  }, [results]);

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
