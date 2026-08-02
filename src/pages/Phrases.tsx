import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import phrasebook from "../../data/phrases.json";
import { SearchBar } from "../components/SearchBar";
import { Empty, Notice } from "../components/ui";
import { fold } from "../lib/data";

interface Phrase {
  en: string;
  hr: string;
  say: string;
  flag?: "dairy" | "avoid";
}
interface Section {
  id: string;
  title: string;
  emoji: string;
  intro?: string;
  watch?: boolean;
  items: Phrase[];
}

const sections = phrasebook.sections as unknown as Section[];
const alphabet = phrasebook.alphabet as { letter: string; says: string; "as in": string }[];

export default function Phrases() {
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const results = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return sections;
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter((i) =>
          fold(`${i.en} ${i.hr} ${i.say}`).includes(f),
        ),
      }))
      .filter((s) => s.items.length);
  }, [q]);

  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const hits = results.reduce((n, s) => n + s.items.length, 0);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked: the text is on screen to show anyway */
    }
  };

  return (
    <div style={{ paddingTop: 18 }}>
      <h1 style={{ fontSize: 25, marginBottom: 6 }}>Croatian phrasebook</h1>
      <p className="muted tiny" style={{ marginTop: 0 }}>
        {total} phrases and words for shopping and travelling in Croatia. Works
        offline, like the rest of the site.
      </p>

      <div style={{ margin: "14px 0" }}>
        <Notice kind="info">
          <div>
            <strong>Start with “Reading a label”.</strong> Most of the 2026 list
            has no kosher symbol on the package, so the useful skill is
            recognising <em>mlijeko</em>, <em>surutka</em> and{" "}
            <em>želatina</em> in an ingredients list. Tap any row to copy the
            Croatian and show it to someone.
          </div>
        </Notice>
      </div>

      <div style={{ margin: "16px 0" }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search a word or phrase, English or Croatian…"
        />
      </div>

      {q.trim() && (
        <p className="tiny muted">
          {hits} match{hits === 1 ? "" : "es"} for “{q}”
        </p>
      )}

      {results.length === 0 ? (
        <Empty title="Nothing matching that">
          <button className="btn btn-sm" onClick={() => setQ("")}>Clear search</button>
        </Empty>
      ) : (
        results.map((s) => (
          <section key={s.id}>
            <h2 className="section-title">
              <span aria-hidden="true">{s.emoji}</span> {s.title}
            </h2>
            {s.intro && !q.trim() && (
              <p className="tiny muted" style={{ marginTop: -4 }}>{s.intro}</p>
            )}
            <div className="plist">
              {s.items.map((p) => (
                <button
                  className={`prow phrase ${p.flag ? `phrase-${p.flag}` : ""}`}
                  key={`${s.id}-${p.hr}-${p.en}`}
                  onClick={() => copy(p.hr)}
                  title="Copy the Croatian"
                >
                  <span className="prow-main">
                    <span className="phrase-hr" lang="hr">{p.hr}</span>
                    <span className="prow-meta">
                      <span>{p.en}</span>
                      <span className="phrase-say">{p.say}</span>
                    </span>
                  </span>
                  <span className="prow-side">
                    {p.flag === "avoid" && <span className="badge badge-not">Avoid</span>}
                    {p.flag === "dairy" && <span className="badge badge-dairy">Dairy</span>}
                    <span className="tiny muted">
                      {copied === p.hr ? "Copied ✓" : "Copy"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <h2 className="section-title">How to say it</h2>
      <div className="card" style={{ padding: 16 }}>
        <p className="tiny muted" style={{ marginTop: 0 }}>{phrasebook.note}</p>
        <div className="chips">
          {alphabet.map((a) => (
            <span className="tag" key={a.letter}>
              <strong>{a.letter}</strong> = {a.says}
            </span>
          ))}
        </div>
      </div>

      <p className="tiny muted" style={{ marginTop: 22 }}>
        These translations were not checked by a native speaker, and the
        ingredient words are a reading aid, not a kashrut ruling — an
        ingredients list can be incomplete or change between production runs.{" "}
        <Link to="/guide">What the badges mean →</Link>
      </p>
    </div>
  );
}
