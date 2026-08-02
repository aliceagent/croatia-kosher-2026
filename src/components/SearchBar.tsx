import { useEffect, useRef } from "react";
import { Icon } from "./ui";
import { products } from "../lib/data";

export function SearchBar({
  value, onChange, placeholder, autoFocus, hero,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  hero?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere, the way every search-first site behaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        // Focus on the next tick: preventDefault only suppresses the keystroke
        // for the element that had focus, so focusing synchronously would let
        // the "/" land in the search box as text.
        setTimeout(() => ref.current?.focus(), 0);
      }
      if (e.key === "Escape" && el === ref.current) {
        onChange("");
        ref.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  return (
    <div className={hero ? "hero-search" : ""}>
      <div className="searchbar">
        <span className="s-icon">{Icon.search}</span>
        <input
          ref={ref}
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? `Search ${products.length.toLocaleString("en-US")} products…`}
          aria-label="Search products"
        />
        {value && (
          <button className="s-clear" onClick={() => onChange("")} aria-label="Clear search">
            {Icon.x}
          </button>
        )}
      </div>
    </div>
  );
}
