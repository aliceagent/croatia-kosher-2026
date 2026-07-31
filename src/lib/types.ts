export type KashrutStatus =
  | "pareve"
  | "dairy"
  | "requires-symbol"
  | "kosher-species"
  | "not-kosher"
  | "conditional";

export interface Kashrut {
  status: KashrutStatus;
  /**
   * True when the PDF states the status outright. False when it comes from the
   * document's convention of marking only its dairy lines, which is weaker
   * evidence and is surfaced as a footnote on the product page.
   */
  explicit: boolean;
  /** Approved only when that specific package carries a kosher symbol. */
  requiresHechsher: boolean;
  certifier: string | null;
  note: string | null;
}

export interface Product {
  id: string;
  category: string;
  brand: string | null;
  subheading: string | null;
  names: { hr?: string; en?: string; alt?: string[] | null };
  aliases?: string[] | null;
  hebrew: string | null;
  sizes: string[] | null;
  kashrut: Kashrut;
  scope: "item" | "all-varieties";
  /** Companies approved for a staple good, e.g. every listed flour miller. */
  approvedCompanies?: string[];
  tags: string[] | null;
  sourcePage: number;
}

export interface Category {
  id: string;
  label: string;
  defaultStatus: KashrutStatus | null;
  icon: string;
  aisle: string;
  count: number;
}

export interface Brand {
  id: string;
  name: string;
  categories: string[];
  origin: "croatian" | "imported";
}

export interface Store {
  id: string;
  chain: string;
  name: string;
  lat: number;
  lon: number;
  city: string | null;
  street: string | null;
  openingHours: string | null;
}
