import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import faqData from "../../data/travel-faq.json";
import phrasebook from "../../data/phrases.json";
import { SearchBar } from "../components/SearchBar";
import { Empty, Notice } from "../components/ui";
import { fold } from "../lib/data";

/* ------------------------------------------------------------------ types */

interface FaqItem {
  q: string;
  a: string;
  tag?: string;
  link?: { to?: string; href?: string; label: string };
}
interface FaqSection {
  id: string;
  title: string;
  emoji: string;
  warn?: boolean;
  items: FaqItem[];
}
interface Phrase {
  en: string;
  hr: string;
  say: string;
  flag?: "dairy" | "avoid";
}
interface PhraseSection {
  id: string;
  title: string;
  emoji: string;
  intro?: string;
  items: Phrase[];
}

const faqSections = faqData.sections as unknown as FaqSection[];
const phraseSections = phrasebook.sections as unknown as PhraseSection[];
const alphabet = phrasebook.alphabet as { letter: string; says: string }[];

/** Minimal inline markdown: **bold**, *italic* and line breaks. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const bullet = line.trimStart().startsWith("- ");
        const body = bullet ? line.trimStart().slice(2) : line;
        const parts = body.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
        const rendered = parts.map((p, j) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return <strong key={j}>{p.slice(2, -2)}</strong>;
          }
          if (p.startsWith("*") && p.endsWith("*")) {
            return <em key={j}>{p.slice(1, -1)}</em>;
          }
          return <span key={j}>{p}</span>;
        });
        if (!body.trim()) return null;
        return bullet ? (
          <li key={i} style={{ marginBottom: 3 }}>{rendered}</li>
        ) : (
          <p key={i} style={{ margin: "0 0 8px" }}>{rendered}</p>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------- page */

export default function Travel() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "phrases" ? "phrases" : "faq";
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const setTab = (t: "faq" | "phrases") => {
    const next = new URLSearchParams(params);
    if (t === "faq") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
    setQ("");
  };

  const faqResults = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return faqSections;
    return faqSections
      .map((s) => ({ ...s, items: s.items.filter((i) => fold(`${i.q} ${i.a}`).includes(f)) }))
      .filter((s) => s.items.length);
  }, [q]);

  const phraseResults = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return phraseSections;
    return phraseSections
      .map((s) => ({
        ...s,
        items: s.items.filter((i) => fold(`${i.en} ${i.hr} ${i.say}`).includes(f)),
      }))
      .filter((s) => s.items.length);
  }, [q]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked: the text is on screen to show anyway */
    }
  };

  const phraseCount = phraseSections.reduce((n, s) => n + s.items.length, 0);
  const faqCount = faqSections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div style={{ paddingTop: 18 }}>
      <h1 style={{ fontSize: 25, marginBottom: 10 }}>Travelling in Croatia</h1>

      <div className="chips" style={{ marginBottom: 16 }}>
        <button
          className={`chip ${tab === "faq" ? "on" : ""}`}
          onClick={() => setTab("faq")}
          aria-pressed={tab === "faq"}
        >
          🧳 Practical FAQ <span className="n">{faqCount}</span>
        </button>
        <button
          className={`chip ${tab === "phrases" ? "on" : ""}`}
          onClick={() => setTab("phrases")}
          aria-pressed={tab === "phrases"}
        >
          🗣️ Phrasebook <span className="n">{phraseCount}</span>
        </button>
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder={
          tab === "faq"
            ? "Search the FAQ — outlets, visas, driving…"
            : "Search a word or phrase, English or Croatian…"
        }
      />

      {tab === "faq" ? (
        <>
          <div style={{ margin: "16px 0" }}>
            <Notice kind="warn">
              <div>{faqData.verifyNote}</div>
            </Notice>
          </div>

          {faqResults.length === 0 ? (
            <Empty title="Nothing in the FAQ matches that">
              <button className="btn btn-sm" onClick={() => setQ("")}>Clear search</button>
            </Empty>
          ) : (
            faqResults.map((s) => (
              <section key={s.id}>
                <h2 className="section-title">
                  <span aria-hidden="true">{s.emoji}</span> {s.title}
                </h2>
                <div className="plist">
                  {s.items.map((item) => (
                    <details className="faq" key={item.q} open={Boolean(q.trim())}>
                      <summary>
                        <span className="faq-q">{item.q}</span>
                        {item.tag && <span className="tag faq-tag">{item.tag}</span>}
                      </summary>
                      <div className="faq-a">
                        <RichText text={item.a} />
                        {item.link && (
                          item.link.to ? (
                            <Link className="btn btn-sm" to={item.link.to}>
                              {item.link.label}
                            </Link>
                          ) : (
                            <a
                              className="btn btn-sm"
                              href={item.link.href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {item.link.label} ↗
                            </a>
                          )
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      ) : (
        <>
          <div style={{ margin: "16px 0" }}>
            <Notice kind="info">
              <div>
                <strong>Start with “Reading a label”.</strong> Most of the 2026
                list has no kosher symbol on the package, so the useful skill is
                recognising <em>mlijeko</em>, <em>surutka</em> and{" "}
                <em>želatina</em> in an ingredients list. Tap any row to copy the
                Croatian and show it to someone.
              </div>
            </Notice>
          </div>

          {phraseResults.length === 0 ? (
            <Empty title="Nothing matching that">
              <button className="btn btn-sm" onClick={() => setQ("")}>Clear search</button>
            </Empty>
          ) : (
            phraseResults.map((s) => (
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
            ingredients list can be incomplete or change between production
            runs. <Link to="/guide">What the badges mean →</Link>
          </p>
        </>
      )}
    </div>
  );
}
