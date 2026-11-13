"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Resolved } from "@/content/lab";
import type { NEXT_COPY } from "@/content/lab/next-word";
import { cn } from "@/lib/cn";
import { fill, type Lang } from "@/lib/i18n";
import { onFrame } from "@/lib/ticker";
import { detokenize, offsets, pick, predict, tokenize, train, type Candidate } from "./model";

type Copy = Resolved<typeof NEXT_COPY>;

/** How long the needle takes to land, seconds. */
const DRAW_S = 0.9;
const AUTO_GAP_MS = 380;
const MAX_TOKENS = 60;
/** Bar colours for the first candidates; the rest share the last one. */
const SEG = ["bg-acc", "bg-acc-2", "bg-warm", "bg-danger", "bg-[#9fb4ff]", "bg-[#d59bff]"];
const SEG_TEXT = ["text-acc", "text-acc-2", "text-warm", "text-danger", "text-[#9fb4ff]", "text-[#d59bff]"];
const segOf = (i: number) => Math.min(i, SEG.length - 1);
const toneOf = (p: number) => (p >= 0.5 ? "text-acc" : p >= 0.2 ? "text-acc-2" : "text-warm");
const pct = (p: number) => `${Math.round(p * 100)}%`;
const easeOut = (x: number) => 1 - (1 - x) ** 3;

type Drawn = { word: string; p: number };

export function NextWordStage({ lang, copy, corpus }: { lang: Lang; copy: Copy; corpus: readonly string[] }) {
  const locale = lang === "pt" ? "pt-BR" : "en-US";
  const model = useMemo(() => train(corpus, locale), [corpus, locale]);
  const starts = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const text of corpus) {
      const [a, b] = tokenize(text, locale);
      if (!a || !b || seen.has(a)) continue;
      seen.add(a);
      out.push(`${a} ${b}`);
    }
    return out.slice(0, 5);
  }, [corpus, locale]);

  const [prompt, setPrompt] = useState<string[]>(() => tokenize(starts[0] ?? "", locale));
  const [drawn, setDrawn] = useState<Drawn[]>([]);
  const [temperature, setTemperature] = useState(1);
  const [own, setOwn] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [auto, setAuto] = useState(false);
  const [last, setLast] = useState<{ word: string; p: number } | null>(null);

  const tokens = useMemo(() => [...prompt, ...drawn.map((d) => d.word)], [prompt, drawn]);
  const prediction = useMemo(() => predict(model, tokens, temperature), [model, tokens, temperature]);
  const shown = prediction.candidates.slice(0, 6);
  const starts0 = offsets(prediction.candidates);
  const full = tokens.length >= MAX_TOKENS;

  // The needle sweeps the bar once and lands where the draw fell; then the word is added.
  const needleRef = useRef<HTMLSpanElement>(null);
  const draw = useRef<{ at: number; r: number; cands: Candidate[] } | null>(null);
  const autoRef = useRef(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stepRef = useRef<() => void>(() => {});

  const step = () => {
    if (draw.current || !prediction.candidates.length || full) return;
    draw.current = { at: -1, r: Math.random(), cands: prediction.candidates };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) draw.current.at = -Infinity;
    setDrawing(true);
  };
  useEffect(() => {
    stepRef.current = step;
  });

  useEffect(
    () =>
      onFrame((time) => {
        const d = draw.current;
        if (!d) return;
        if (d.at === -1) d.at = time;
        const p = d.at === -Infinity ? 1 : Math.min(1, (time - d.at) / DRAW_S);
        const x = ((1 + d.r) * easeOut(p)) % 1;
        if (needleRef.current) needleRef.current.style.left = `${(p >= 1 ? d.r : x) * 100}%`;
        if (p < 1) return;
        draw.current = null;
        const chosen = d.cands[pick(d.cands, d.r)];
        setDrawn((list) => [...list, { word: chosen.word, p: chosen.p }]);
        setLast({ word: chosen.word, p: chosen.p });
        setDrawing(false);
        if (chosen.word === "." && autoRef.current) {
          autoRef.current = false;
          setAuto(false);
        } else if (autoRef.current) autoTimer.current = setTimeout(() => stepRef.current(), AUTO_GAP_MS);
      }),
    [],
  );
  useEffect(() => () => clearTimeout(autoTimer.current), []);

  const stopAuto = () => {
    autoRef.current = false;
    setAuto(false);
    clearTimeout(autoTimer.current);
  };
  const toggleAuto = () => {
    if (autoRef.current) return stopAuto();
    autoRef.current = true;
    setAuto(true);
    step();
  };
  const restart = (words: string[]) => {
    stopAuto();
    draw.current = null;
    setDrawing(false);
    setPrompt(words);
    setDrawn([]);
    setLast(null);
  };

  const text = detokenize(tokens);
  const loopAt = drawing ? 2 : last ? 3 : 0;

  return (
    <div className="relative mx-auto max-w-[1360px]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <section aria-label={copy.aria} className="card relative flex flex-col gap-6 overflow-hidden p-5 sm:p-7">
          <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.1),transparent)]" />

          <div className="relative">
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">{copy.starts}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {starts.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={prompt.join(" ") === s}
                  onClick={() => restart(tokenize(s, locale))}
                  className="rounded-full border border-line-2 px-3 py-1.5 text-[13.5px] text-mute transition-colors hover:border-acc/50 hover:text-ink aria-pressed:border-acc aria-pressed:bg-acc/10 aria-pressed:text-acc"
                >
                  {s.charAt(0).toLocaleUpperCase(locale) + s.slice(1)}…
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const words = tokenize(own, locale);
                if (words.length) restart(words);
              }}
            >
              <label htmlFor="lab-own" className="sr-only">
                {copy.own}
              </label>
              <input
                id="lab-own"
                value={own}
                onChange={(e) => setOwn(e.target.value)}
                placeholder={`${copy.own} · ${copy.ownPlaceholder}`}
                maxLength={80}
                className="min-w-0 flex-1 rounded-[12px] border border-line-2 bg-bg-2 px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-dim focus:border-acc/60"
              />
              <button type="submit" className="btn btn-ghost btn-sm shrink-0">
                {copy.use}
              </button>
            </form>
          </div>

          {/* the text being written */}
          <p aria-live="polite" className="relative min-h-[3.4em] font-display text-[clamp(22px,2.3vw,32px)] leading-[1.3] font-semibold tracking-[-0.02em]">
            {text.map((t, i) => {
              const generated = i >= prompt.length;
              const d = generated ? drawn[i - prompt.length] : null;
              const word = t.capital ? t.word.charAt(0).toLocaleUpperCase(locale) + t.word.slice(1) : t.word;
              return (
                <span key={i}>
                  {t.space && " "}
                  <span className={cn(generated ? cn(toneOf(d!.p), "animate-word-in motion-reduce:animate-none") : "text-ink")}>{word}</span>
                </span>
              );
            })}
            <span aria-hidden className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] animate-blink rounded-full bg-acc" />
          </p>
          <ul aria-hidden className="relative -mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
            {copy.legend.map((label, i) => (
              <li key={label} className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", ["bg-acc", "bg-acc-2", "bg-warm"][i])} />
                {label}
              </li>
            ))}
          </ul>

          {/* the draw */}
          <div className="relative">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">{copy.candidates}</p>
              {prediction.context.length > 0 && (
                <p className="font-mono text-[10.5px] tracking-[0.08em] text-dim uppercase">
                  {copy.looking}: <span className="text-acc-2 normal-case">«{prediction.context.join(" ")}»</span>
                </p>
              )}
            </div>

            {!prediction.known ? (
              <p className="mt-3 rounded-[12px] border border-warm/30 bg-warm/[0.05] px-4 py-3 text-[14px] leading-snug text-warm">{copy.unknown}</p>
            ) : (
              <>
                <div className="relative mt-3 h-9 overflow-hidden rounded-[10px] border border-line bg-bg-2">
                  {prediction.candidates.map((c, i) => (
                    <span
                      key={c.word}
                      className={cn("absolute inset-y-0 border-r border-bg/70 transition-[left,width] duration-500 ease-soft", SEG[segOf(i)], i >= SEG.length && "opacity-60")}
                      style={{ left: `${starts0[i] * 100}%`, width: `${c.p * 100}%` }}
                    />
                  ))}
                  <span ref={needleRef} aria-hidden className={cn("absolute -inset-y-px w-[3px] -translate-x-1/2 rounded-full bg-ink shadow-[0_0_10px_var(--color-ink)]", !drawing && "opacity-0")} />
                </div>
                <ol className="mt-3 grid gap-1.5">
                  {shown.map((c, i) => (
                    <li key={c.word} className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)_48px] items-center gap-3 text-[14px]">
                      <span className={cn("truncate font-medium", SEG_TEXT[segOf(i)])}>{c.word === "." ? `. (${copy.end})` : c.word}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-line">
                        <span className={cn("block h-full rounded-full transition-[width] duration-500 ease-soft", SEG[segOf(i)])} style={{ width: `${c.p * 100}%` }} />
                      </span>
                      <span className="text-right font-mono text-[12px] text-mute">{pct(c.p)}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          {/* controls */}
          <div className="relative flex flex-col gap-4 border-t border-line pt-5">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={step} disabled={drawing || auto || !prediction.known || full} className="btn btn-primary btn-sm">
                {copy.next} →
              </button>
              <button type="button" onClick={toggleAuto} disabled={!prediction.known && !auto} aria-pressed={auto} className="btn btn-ghost btn-sm">
                {auto ? `${copy.pause} ❚❚` : `${copy.auto} ▶`}
              </button>
              <button type="button" onClick={() => restart(prompt)} className="btn btn-ghost btn-sm">
                {copy.reset} ↺
              </button>
            </div>
            <label className="block">
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-mute uppercase">
                {fill(copy.temperature, { t: temperature.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}
              </span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(+e.target.value)}
                className="mt-2 w-full accent-[var(--color-acc)]"
              />
              <span aria-hidden className="mt-1 flex justify-between font-mono text-[9.5px] tracking-[0.08em] text-dim uppercase">
                {copy.tempScale.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </span>
            </label>
            {last && <p className="text-[13px] text-mute">{fill(copy.drawn, { w: `«${last.word}»`, p: pct(last.p) })}</p>}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="card p-5 sm:p-6">
            <h3 className="font-display text-[19px] font-semibold tracking-[-0.01em]">{copy.loopTitle}</h3>
            <ol className="mt-4 grid gap-2">
              {copy.loop.map((label, i) => (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-[14px] transition-colors duration-300",
                    i === loopAt || (drawing && i === 1) ? "border-acc/50 bg-acc/[0.06] text-ink" : "border-line text-mute",
                  )}
                >
                  <span className="font-mono text-[11px] text-acc">0{i + 1}</span>
                  {label}
                  {i === 3 && <span aria-hidden className="ml-auto text-acc">↺</span>}
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-5 sm:p-6">
            <h3 className="font-display text-[19px] font-semibold tracking-[-0.01em]">{copy.compareTitle}</h3>
            <table className="mt-4 w-full text-left text-[13.5px]">
              <thead>
                <tr className="font-mono text-[10px] tracking-[0.12em] text-mute uppercase">
                  <th className="pb-2 font-normal" />
                  <th className="pb-2 font-normal text-acc">{copy.compare.us}</th>
                  <th className="pb-2 font-normal">{copy.compare.them}</th>
                </tr>
              </thead>
              <tbody>
                {copy.compare.rows.map((row, i) => (
                  <tr key={row} className="border-t border-line align-top">
                    <th scope="row" className="py-2.5 pr-3 font-normal text-mute">
                      {row}
                    </th>
                    <td className="py-2.5 pr-3 text-ink">
                      {fill(copy.compare.mine[i], { vocab: String(model.vocab.size), sentences: String(model.sentences) })}
                    </td>
                    <td className="py-2.5 text-ink">{copy.compare.big[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 rounded-[12px] border border-warm/25 bg-warm/[0.04] px-4 py-3 text-[13.5px] leading-snug text-warm">{copy.hallucination}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
