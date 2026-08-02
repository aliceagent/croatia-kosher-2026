import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { ReactNode } from "react";

/*
 * All personal state lives in localStorage. There is no account and no server:
 * the site holds nothing about anyone, and it keeps working on a phone with no
 * signal, which is the situation it is actually used in.
 */

const KEY_FAVS = "ckl.favorites.v1";
const KEY_LISTS = "ckl.lists.v1";
const KEY_ACTIVE = "ckl.activeList.v1";
const KEY_THEME = "ckl.theme.v1";
const KEY_RECENT = "ckl.recent.v1";
const KEY_ACK = "ckl.disclaimerAck.v1";

export interface ListItem {
  productId: string | null;
  /** Free text for things the list does not cover, like fresh produce. */
  custom?: string;
  qty: number;
  done: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ListItem[];
  createdAt: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota: personal state is best-effort, never fatal */
  }
}

export function newListId(): string {
  return Math.random().toString(36).slice(2, 9);
}

interface StoreShape {
  favorites: string[];
  isFav: (id: string) => boolean;
  toggleFav: (id: string) => void;
  clearFavs: () => void;

  lists: ShoppingList[];
  activeListId: string;
  activeList: ShoppingList;
  setActiveListId: (id: string) => void;
  createList: (name: string) => string;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  replaceList: (id: string, items: ListItem[]) => void;

  inList: (productId: string) => boolean;
  addToList: (productId: string, qty?: number) => void;
  addCustom: (text: string) => void;
  removeItem: (index: number) => void;
  setQty: (index: number, qty: number) => void;
  toggleDone: (index: number) => void;
  clearDone: () => void;
  addMany: (productIds: string[]) => void;

  recent: string[];
  pushRecent: (id: string) => void;

  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;

  /** Whether the reader has acknowledged the site-wide disclaimer. */
  disclaimerAck: boolean;
  ackDisclaimer: () => void;
}

const Ctx = createContext<StoreShape | null>(null);

const DEFAULT_LIST: ShoppingList = {
  id: "default",
  name: "My list",
  items: [],
  createdAt: 0,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => read(KEY_FAVS, []));
  const [lists, setLists] = useState<ShoppingList[]>(() =>
    read<ShoppingList[]>(KEY_LISTS, [DEFAULT_LIST]),
  );
  const [activeListId, setActiveListId] = useState<string>(() =>
    read(KEY_ACTIVE, "default"),
  );
  const [recent, setRecent] = useState<string[]>(() => read(KEY_RECENT, []));
  const [theme, setThemeState] = useState<"light" | "dark" | "system">(() =>
    read(KEY_THEME, "system"),
  );
  const [disclaimerAck, setAck] = useState<boolean>(() => read(KEY_ACK, false));

  useEffect(() => write(KEY_FAVS, favorites), [favorites]);
  useEffect(() => write(KEY_LISTS, lists), [lists]);
  useEffect(() => write(KEY_ACTIVE, activeListId), [activeListId]);
  useEffect(() => write(KEY_RECENT, recent), [recent]);
  useEffect(() => write(KEY_ACK, disclaimerAck), [disclaimerAck]);

  useEffect(() => {
    write(KEY_THEME, theme);
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const activeList = useMemo(
    () => lists.find((l) => l.id === activeListId) ?? lists[0] ?? DEFAULT_LIST,
    [lists, activeListId],
  );

  const mutateActive = useCallback(
    (fn: (l: ShoppingList) => ShoppingList) => {
      setLists((prev) => {
        const idx = prev.findIndex((l) => l.id === activeListId);
        const i = idx === -1 ? 0 : idx;
        if (!prev[i]) return [fn(DEFAULT_LIST)];
        const next = [...prev];
        next[i] = fn(prev[i]);
        return next;
      });
    },
    [activeListId],
  );

  const value: StoreShape = {
    favorites,
    isFav: useCallback((id) => favorites.includes(id), [favorites]),
    toggleFav: useCallback((id) => {
      setFavorites((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev],
      );
    }, []),
    clearFavs: useCallback(() => setFavorites([]), []),

    lists,
    activeListId: activeList.id,
    activeList,
    setActiveListId,
    createList: useCallback((name) => {
      const id = newListId();
      setLists((prev) => [
        ...prev,
        { id, name: name || "Untitled list", items: [], createdAt: Date.now() },
      ]);
      setActiveListId(id);
      return id;
    }, []),
    renameList: useCallback((id, name) => {
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
    }, []),
    deleteList: useCallback((id) => {
      setLists((prev) => {
        const next = prev.filter((l) => l.id !== id);
        return next.length ? next : [DEFAULT_LIST];
      });
      setActiveListId((cur) => (cur === id ? "default" : cur));
    }, []),
    replaceList: useCallback((id, items) => {
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, items } : l)));
    }, []),

    inList: useCallback(
      (productId) => activeList.items.some((i) => i.productId === productId),
      [activeList],
    ),
    addToList: useCallback(
      (productId, qty = 1) => {
        mutateActive((l) => {
          const at = l.items.findIndex((i) => i.productId === productId);
          if (at >= 0) {
            const items = [...l.items];
            items[at] = { ...items[at], qty: items[at].qty + qty, done: false };
            return { ...l, items };
          }
          return { ...l, items: [...l.items, { productId, qty, done: false }] };
        });
      },
      [mutateActive],
    ),
    addCustom: useCallback(
      (text) => {
        const t = text.trim();
        if (!t) return;
        mutateActive((l) => ({
          ...l,
          items: [...l.items, { productId: null, custom: t, qty: 1, done: false }],
        }));
      },
      [mutateActive],
    ),
    removeItem: useCallback(
      (index) => {
        mutateActive((l) => ({
          ...l,
          items: l.items.filter((_, i) => i !== index),
        }));
      },
      [mutateActive],
    ),
    setQty: useCallback(
      (index, qty) => {
        mutateActive((l) => {
          if (qty <= 0) return { ...l, items: l.items.filter((_, i) => i !== index) };
          const items = [...l.items];
          items[index] = { ...items[index], qty };
          return { ...l, items };
        });
      },
      [mutateActive],
    ),
    toggleDone: useCallback(
      (index) => {
        mutateActive((l) => {
          const items = [...l.items];
          items[index] = { ...items[index], done: !items[index].done };
          return { ...l, items };
        });
      },
      [mutateActive],
    ),
    clearDone: useCallback(() => {
      mutateActive((l) => ({ ...l, items: l.items.filter((i) => !i.done) }));
    }, [mutateActive]),
    addMany: useCallback(
      (productIds) => {
        mutateActive((l) => {
          const have = new Set(l.items.map((i) => i.productId));
          const fresh = productIds
            .filter((id) => !have.has(id))
            .map((id) => ({ productId: id, qty: 1, done: false }));
          return { ...l, items: [...l.items, ...fresh] };
        });
      },
      [mutateActive],
    ),

    recent,
    pushRecent: useCallback((id) => {
      setRecent((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12));
    }, []),

    theme,
    setTheme: setThemeState,

    disclaimerAck,
    ackDisclaimer: useCallback(() => setAck(true), []),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreShape {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
