import { products, productById } from "./data";
import type { ListItem } from "./store";

/*
 * Sharing a list without a backend.
 *
 * Product ids are long, so a list is encoded as indices into the product array
 * in base36, plus quantities, then packed into the URL hash. Custom free-text
 * items are carried verbatim. The hash never reaches a server, so a shared list
 * stays between the people who have the link.
 */

const SEP = "!";
const ITEM_SEP = ".";

export function encodeList(items: ListItem[], name: string): string {
  const index = new Map(products.map((p, i) => [p.id, i]));
  const packed: string[] = [];
  const customs: string[] = [];
  for (const it of items) {
    if (it.productId) {
      const i = index.get(it.productId);
      if (i === undefined) continue;
      packed.push(it.qty > 1 ? `${i.toString(36)}x${it.qty.toString(36)}` : i.toString(36));
    } else if (it.custom) {
      customs.push(it.custom);
    }
  }
  const payload = [
    encodeURIComponent(name),
    packed.join(ITEM_SEP),
    customs.map(encodeURIComponent).join(ITEM_SEP),
  ].join(SEP);
  return payload;
}

export function decodeList(
  payload: string,
): { name: string; items: ListItem[] } | null {
  try {
    const [rawName, packed, customs] = payload.split(SEP);
    const items: ListItem[] = [];
    for (const token of (packed || "").split(ITEM_SEP).filter(Boolean)) {
      const [idxRaw, qtyRaw] = token.split("x");
      const p = products[parseInt(idxRaw, 36)];
      if (!p) continue;
      items.push({
        productId: p.id,
        qty: qtyRaw ? Math.max(1, parseInt(qtyRaw, 36)) : 1,
        done: false,
      });
    }
    for (const c of (customs || "").split(ITEM_SEP).filter(Boolean)) {
      items.push({ productId: null, custom: decodeURIComponent(c), qty: 1, done: false });
    }
    if (!items.length) return null;
    return { name: decodeURIComponent(rawName || "Shared list"), items };
  } catch {
    return null;
  }
}

export function listAsText(items: ListItem[], name: string): string {
  const lines = [`${name} — kosher shopping list`, ""];
  for (const it of items) {
    const label = it.productId
      ? productById.get(it.productId)?.names.en ?? it.productId
      : it.custom ?? "";
    lines.push(`${it.done ? "x" : "-"} ${label}${it.qty > 1 ? ` ×${it.qty}` : ""}`);
  }
  lines.push("", "From the 2026 kosher list of Croatia (Bet Israel, Zagreb)");
  return lines.join("\n");
}
