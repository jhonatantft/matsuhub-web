"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Resolved } from "@/content/lab";
import type { SEARCH_COPY } from "@/content/lab/semantic-search";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { decimal, fill, type Lang } from "@/lib/i18n/core";
import { labParam } from "@/lib/lab";
import { onFrame } from "@/lib/ticker";
import { TourCursor, useTour, type TourStep } from "../Tour";
import type { SearchStage as Stage } from "./engine";
import { ask, buildIndex, featureLabel, MIN_SCORE, neighbours, type Query } from "./model";

type Copy = Resolved<typeof SEARCH_COPY>;
type Passage = { topic: number; text: string };

/** Seconds spent in each pipeline step: question, vector, neighbours, answer. */
const STEP_SECONDS = [0.5, 1.1, 1.2, 0.5];
const TOPIC_DOT = ["bg-[#7fb3a3]", "bg-[#a3b37f]", "bg-[#b8a27f]", "bg-[#8f98b8]"];

export function SearchStage({ lang, copy, topics, corpus }: { lang: Lang; copy: Copy; topics: readonly string[]; corpus: readonly Passage[] }) {
  const index = useMemo(() => buildIndex(corpus.map((p) => p.text), lang), [corpus, lang]);
  const links = useMemo(() => {
    const seen = new Set<string>();
    const out: [number, number][] = [];
    for (let i = 0; i < index.n; i++)
      for (const j of neighbours(index, i, 2)) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push([i, j]);
        }
      }
    return out;
  }, [index]);

  const [query, setQuery] = useState<Query | null>(null);
  const [phase, setPhase] = useState(0);
  const [text, setText] = useState("");
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [live] = useState(() => typeof window !== "undefined" && !reducedMotion() && labParam("t") === null);

  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const tipRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const latest = useRef<{ query: Query | null; phase: number }>({ query: null, phase: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    let disposed = false;
    let stage: Stage | null = null;
    import("./engine").then(({ createSearchStage }) => {
      if (disposed) return;
      try {
        stage = createSearchStage({
          canvas,
          host,
          coords: index.coords,
          topics: corpus.map((p) => p.topic),
          links,
          topicLabels: labelRefs.current,
          tooltip: tipRef.current,
          reduced: reducedMotion(),
          frozen: labParam("t") !== null,
          onHover: (i) => setHover(i),
          onPick: (i) => setPicked(i),
          onInteract: () => {},
          onLost: () => setFailed(true),
        });
      } catch {
        setFailed(true);
        return;
      }
      stageRef.current = stage;
      const { query: q, phase: p } = latest.current;
      if (q) stage.setQuery(q.point, q.hits.map((h) => h.index), q.answered);
      stage.setPhase(p);
    });
    return () => {
      disposed = true;
      stage?.dispose();
      stageRef.current = null;
    };
  }, [index, links, corpus]);

  /* the pipeline plays out after each question; panel and map read the same phase */
  useEffect(() => {
    latest.current.query = query;
    if (!query) return;
    stageRef.current?.setQuery(query.point, query.hits.map((h) => h.index), query.answered);
    let p = 0;
    let stop: (() => void) | null = onFrame((_, dt) => {
      if (dt >= 1 || reducedMotion()) p = 4;
      else p = Math.min(4, p + dt / STEP_SECONDS[Math.min(3, Math.floor(p))]);
      latest.current.phase = p;
      stageRef.current?.setPhase(p);
      setPhase(p);
      if (p >= 4) {
        stop?.();
        stop = null;
      }
    });
    return () => stop?.();
  }, [query]);

  const run = (value: string) => {
    const clean = value.trim().slice(0, 200);
    if (!clean) return;
    setText(clean);
    setPicked(null);
    setQuery(ask(index, clean));
  };

  const steps: TourStep[] = copy.presets.map((preset, i) => ({ target: `q${i}`, run: () => run(preset), hold: 6.2 }));
  const { rootRef, cursorRef, touring } = useTour(steps, live);

  /* stills hook for the desmonte check (dev only) */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as Window & { __desmonte?: unknown };
    w.__desmonte = {
      beats: copy.presets.map((name, t) => ({ t, name })),
      seek: (t: number) =>
        new Promise<void>((resolve) => {
          const preset = copy.presets[Math.max(0, Math.min(copy.presets.length - 1, Math.floor(t)))];
          setText(preset);
          setQuery(ask(index, preset));
          setTimeout(() => {
            stageRef.current?.setPhase(4);
            setPhase(4);
            stageRef.current?.snap(2);
            resolve();
          }, 150);
        }),
      ready: true,
    };
    return () => {
      delete w.__desmonte;
    };
  }, [copy.presets, index]);

  const tip = hover ?? picked;
  const step = query ? Math.min(3, Math.floor(phase)) : -1;
  const score = (s: number) => decimal(s, 2, lang);

  return (
    <div ref={rootRef} className="relative mx-auto max-w-[1360px]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        {/* map */}
        <div className="card relative overflow-hidden p-0 max-lg:aspect-square lg:min-h-[640px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgb(62_242_196/0.07),transparent_60%)]"
          />
          <div ref={hostRef} role="img" aria-label={copy.aria} className="absolute inset-0">
            <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full cursor-grab touch-pan-y active:cursor-grabbing", failed && "hidden")} />
            {topics.map((topic, i) => (
              <span
                key={topic}
                ref={(el) => {
                  labelRefs.current[i] = el;
                }}
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 flex items-center gap-1.5 rounded-full border border-line bg-bg/60 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.12em] whitespace-nowrap text-mute uppercase opacity-0 backdrop-blur-sm sm:text-[10.5px]"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", TOPIC_DOT[i % TOPIC_DOT.length])} />
                {topic}
              </span>
            ))}
            <div
              ref={tipRef}
              aria-hidden
              className="pointer-events-none absolute top-0 left-0 w-[min(280px,70vw)] rounded-[12px] border border-acc-2/40 bg-[rgb(7_13_10/0.92)] p-3 text-[13px] leading-snug text-ink opacity-0 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur"
            >
              {tip !== null && (
                <>
                  <span className="mb-1 block font-mono text-[9.5px] tracking-[0.12em] text-acc-2 uppercase">
                    {fill(copy.passage, { n: String(tip + 1) })} · {topics[corpus[tip].topic]}
                  </span>
                  {corpus[tip].text}
                </>
              )}
            </div>
            {failed && <p className="absolute inset-0 grid place-items-center p-8 text-center text-[15px] text-mute">{copy.noWebgl}</p>}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-4 sm:p-5">
            <span className="rounded-full border border-line-2 bg-bg/70 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.12em] text-mute uppercase backdrop-blur">
              {fill(copy.base, { n: String(corpus.length) })}
            </span>
            {touring && (
              <span className="rounded-full border border-line bg-bg/70 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-mute uppercase backdrop-blur max-sm:hidden">
                {copy.tour}
              </span>
            )}
          </div>
          <p className="pointer-events-none absolute bottom-4 left-5 font-mono text-[10px] tracking-[0.1em] text-dim uppercase max-sm:hidden">{copy.hint}</p>
        </div>

        {/* console */}
        <div className="card flex flex-col gap-5 p-5 sm:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(text);
            }}
          >
            <label htmlFor="lab-ask" className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">
              {copy.ask}
            </label>
            <div className="mt-2.5 flex gap-2">
              <input
                id="lab-ask"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={copy.placeholder}
                maxLength={200}
                autoComplete="off"
                className="min-w-0 flex-1 rounded-[12px] border border-line-2 bg-bg-2 px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-dim focus:border-acc/60"
              />
              <button type="submit" className="btn btn-primary btn-sm shrink-0">
                {copy.submit}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {copy.presets.map((preset, i) => (
                <button
                  key={preset}
                  type="button"
                  data-tour={`q${i}`}
                  aria-pressed={query?.text === preset}
                  onClick={() => run(preset)}
                  className="rounded-full border border-line-2 px-3 py-1.5 text-left text-[13px] text-mute transition-colors hover:border-acc/50 hover:text-ink aria-pressed:border-acc aria-pressed:bg-acc/10 aria-pressed:text-acc"
                >
                  {preset}
                </button>
              ))}
            </div>
          </form>

          <ol className="grid grid-cols-4 gap-1.5" aria-label={copy.steps.join(" → ")}>
            {copy.steps.map((label, i) => (
              <li
                key={label}
                aria-current={step === i ? "step" : undefined}
                className={cn(
                  "rounded-[10px] border px-2 py-2 text-center font-mono text-[9.5px] tracking-[0.1em] uppercase transition-colors sm:text-[10px]",
                  step > i || (step === i && phase >= 4)
                    ? "border-acc/40 bg-acc/10 text-acc"
                    : step === i
                      ? "border-acc-2/60 text-acc-2"
                      : "border-line text-dim",
                )}
              >
                <span className="block text-[9px] opacity-70">0{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          <div aria-live="polite" className="flex flex-col gap-5">
            {!query && <p className="text-[14.5px] text-mute">{copy.empty}</p>}

            {query && phase >= 1 && (
              <div>
                <p className="font-mono text-[10px] tracking-[0.12em] text-mute uppercase">{copy.vector}</p>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {query.top.length === 0 && <li className="text-[13px] text-dim">—</li>}
                  {query.top.map((f) => (
                    <li key={f.feature} className="relative overflow-hidden rounded-[8px] border border-line px-2 py-1 font-mono text-[11px] text-ink">
                      <span aria-hidden className="absolute inset-y-0 left-0 bg-acc-2/15" style={{ width: `${Math.round(f.weight * 100 * 2.2)}%` }} />
                      <span className="relative">
                        {featureLabel(f.feature)} <span className="text-dim">{score(f.weight)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {query && phase >= 2 && (
              <div>
                <p className="font-mono text-[10px] tracking-[0.12em] text-mute uppercase">{copy.results}</p>
                <ol className="mt-2.5 grid gap-2">
                  {query.hits.map((hit, rank) => {
                    const p = corpus[hit.index];
                    const ok = hit.score >= MIN_SCORE;
                    return (
                      <li key={hit.index} className={cn("rounded-[12px] border p-3", ok ? "border-acc/30" : "border-line")}>
                        <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.08em] uppercase">
                          <span className="flex items-center gap-1.5 text-mute">
                            <span className={cn("h-1.5 w-1.5 rounded-full", TOPIC_DOT[p.topic % TOPIC_DOT.length])} />
                            {fill(copy.passage, { n: String(hit.index + 1) })} · {topics[p.topic]}
                          </span>
                          <span className={ok ? "text-acc" : "text-warm"}>
                            {copy.similarity} {score(hit.score)}
                          </span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                          <div className={cn("h-full rounded-full", ok ? "bg-acc" : "bg-warm/70")} style={{ width: `${Math.min(100, Math.round(hit.score * 100 * 1.4))}%` }} />
                        </div>
                        <p className={cn("mt-2 text-[13.5px] leading-snug", rank === 0 ? "text-ink" : "text-mute")}>{p.text}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {query && phase >= 3 && (
              <div className={cn("rounded-[14px] border p-4", query.answered ? "border-acc/40 bg-acc/[0.06]" : "border-warm/40 bg-warm/[0.06]")}>
                <p className="font-mono text-[10px] tracking-[0.12em] text-mute uppercase">{copy.answer}</p>
                {query.answered ? (
                  <>
                    <p className="mt-2 text-[15.5px] leading-snug text-ink">{corpus[query.hits[0].index].text}</p>
                    <p className="mt-2 font-mono text-[10.5px] tracking-[0.08em] text-acc uppercase">
                      {fill(copy.source, { n: String(query.hits[0].index + 1), topic: topics[corpus[query.hits[0].index].topic] })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-[15.5px] leading-snug text-ink">{copy.noAnswer}</p>
                    <p className="mt-2 text-[13px] leading-snug text-mute">{fill(copy.noAnswerWhy, { min: score(MIN_SCORE) })}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <TourCursor cursorRef={cursorRef} />
    </div>
  );
}
