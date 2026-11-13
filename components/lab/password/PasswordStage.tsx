"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Resolved } from "@/content/lab";
import type { PASSWORD_COPY } from "@/content/lab/password";
import { cn } from "@/lib/cn";
import { fill, type Lang } from "@/lib/i18n";
import {
  analyze,
  ATTACKS,
  CLASS_SIZE,
  formatDuration,
  formatPower,
  log10Seconds,
  passphrase,
  RANDOM_ALPHABET,
  randomPassword,
  scaleOf,
  TICKS,
  type CharClass,
} from "./model";

type Copy = Resolved<typeof PASSWORD_COPY>;
type Props = { lang: Lang; copy: Copy; words: readonly string[]; dictionary: readonly string[]; common: readonly string[] };

const GLYPH: Record<CharClass, string> = { lower: "a", upper: "A", digit: "1", symbol: "#", other: "ç" };
const CLASS_TONE: Record<CharClass, string> = {
  lower: "border-acc/40 text-acc",
  upper: "border-acc-2/50 text-acc-2",
  digit: "border-warm/50 text-warm",
  symbol: "border-danger/50 text-danger",
  other: "border-line-2 text-ink",
};
const MAX_BOXES = 32;

/** Red under a day, amber under a thousand years, lime beyond. */
const tone = (log10S: number) => (log10S < Math.log10(86400) ? "danger" : log10S < Math.log10(1000 * 3.156e7) ? "warm" : "acc");
const TONE_TEXT = { danger: "text-danger", warm: "text-warm", acc: "text-acc" } as const;
const TONE_BG = { danger: "bg-danger", warm: "bg-warm", acc: "bg-acc" } as const;

function Power({ log10N, lang }: { log10N: number; lang: Lang }) {
  const f = formatPower(log10N, lang);
  if ("plain" in f) return <>{f.plain}</>;
  return (
    <>
      {f.mantissa} × 10<sup className="text-[0.6em]">{f.exponent}</sup>
    </>
  );
}

export function PasswordStage({ lang, copy, words, dictionary, common }: Props) {
  const dict = useMemo(() => new Set(dictionary), [dictionary]);
  const [value, setValue] = useState<string>(copy.presets[1]);
  const [show, setShow] = useState(false);
  const a = useMemo(() => analyze(value, dict, common), [value, dict, common]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeCopy = { instant: copy.time.instant, universe: copy.time.universe, units: copy.time.units as readonly (readonly [string, string])[] };

  // Generator. The first value is drawn after hydration, so server and client HTML agree.
  const [mode, setMode] = useState<"phrase" | "random">("phrase");
  const [count, setCount] = useState(7);
  const [length, setLength] = useState(20);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draw = (m = mode, n = count, len = length) => (m === "phrase" ? passphrase(words, n) : randomPassword(len));
  useEffect(() => {
    let live = true;
    queueMicrotask(() => live && setGenerated(passphrase(words, 7)));
    return () => {
      live = false;
    };
  }, [words]);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const genLog10 = mode === "phrase" ? count * Math.log10(words.length) : length * Math.log10(RANDOM_ALPHABET.length);
  const genTime = (id: "bcrypt" | "md5") => formatDuration(log10Seconds(genLog10, ATTACKS.find((x) => x.id === id)!.perSecond), timeCopy, lang);

  const copyGenerated = async () => {
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the text is selectable anyway */
    }
  };

  const findings = value ? (a.findings.filter((f) => f !== "short").length ? a.findings : a.length >= 12 ? ["good" as const] : a.findings) : [];
  const realisticDiffers = a.log10Brute - a.log10Guesses > 0.5;

  return (
    <div aria-label={copy.aria} role="group" className="relative mx-auto max-w-[1360px]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        {/* ------------------------------------------------ meter */}
        <section className="card relative flex flex-col gap-7 overflow-hidden p-5 sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgb(185_255_75/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(185_255_75/0.04)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(180deg,black,transparent_60%)]"
          />
          <div className="relative">
            <label htmlFor="lab-password" className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">
              {copy.inputLabel}
            </label>
            <div className="mt-2.5 flex gap-2">
              <input
                ref={inputRef}
                id="lab-password"
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={copy.placeholder}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={128}
                className="min-w-0 flex-1 rounded-[12px] border border-line-2 bg-bg-2 px-4 py-3 font-mono text-[18px] tracking-[0.04em] text-ink outline-none placeholder:text-dim focus:border-acc/60 sm:text-[20px]"
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="btn btn-ghost btn-sm shrink-0">
                {show ? copy.hide : copy.show}
              </button>
            </div>
            <p className="mt-2.5 flex items-center gap-2 text-[13px] text-mute">
              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-acc">
                <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              {copy.privacy}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">{copy.examples}</span>
              {copy.presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={value === preset}
                  onClick={() => setValue(preset)}
                  className="rounded-full border border-line-2 px-3 py-1.5 font-mono text-[12px] text-mute transition-colors hover:border-acc/50 hover:text-ink aria-pressed:border-acc aria-pressed:bg-acc/10 aria-pressed:text-acc"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* every character multiplies */}
          <div className="relative">
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">{copy.charsTitle}</p>
            <div aria-hidden className="mt-3 flex min-h-[38px] flex-wrap gap-1">
              {[...value].slice(0, MAX_BOXES).map((ch, i) => {
                const c = a.classes[i];
                return (
                  <span key={i} className={cn("grid h-[38px] w-[28px] place-items-center rounded-[7px] border bg-bg/60 font-mono text-[15px]", CLASS_TONE[c])}>
                    {show ? ch : GLYPH[c]}
                  </span>
                );
              })}
              {a.length > MAX_BOXES && <span className="grid h-[38px] place-items-center px-2 font-mono text-[12px] text-dim">+{a.length - MAX_BOXES}</span>}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[11px] tracking-[0.06em] text-mute uppercase">
              {a.used.map((c) => (
                <li key={c} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-[2px] border", CLASS_TONE[c])} />
                  {copy.classes[c]} <span className="text-ink">{CLASS_SIZE[c]}</span>
                </li>
              ))}
            </ul>
            {a.length > 0 && <p className="mt-2 text-[14px] text-mute">{fill(copy.pool, { pool: String(a.pool), len: String(a.length) })}</p>}
          </div>

          {/* brute force vs. realistic */}
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={cn("rounded-[14px] border border-line p-4", realisticDiffers && "opacity-60")}>
              <p className="font-mono text-[10px] tracking-[0.12em] text-mute uppercase">{copy.brute}</p>
              <p className={cn("mt-2 font-display text-[26px] leading-none font-bold tracking-[-0.02em]", realisticDiffers && "line-through decoration-danger/70 decoration-2")}>
                <Power log10N={a.log10Brute} lang={lang} />
              </p>
              <p className="mt-1.5 font-mono text-[10.5px] text-dim uppercase">{copy.guesses}</p>
            </div>
            <div className="rounded-[14px] border border-acc/40 bg-acc/[0.04] p-4">
              <p className="font-mono text-[10px] tracking-[0.12em] text-acc uppercase">{copy.realistic}</p>
              <p className="mt-2 font-display text-[26px] leading-none font-bold tracking-[-0.02em] text-ink">
                <Power log10N={a.log10Guesses} lang={lang} />
              </p>
              <p className="mt-1.5 font-mono text-[10.5px] text-dim uppercase">
                {copy.guesses} · {fill(copy.bits, { bits: String(Math.round(a.bits)) })}
              </p>
            </div>
            {realisticDiffers && <p className="text-[13.5px] leading-snug text-mute sm:col-span-2">{copy.realisticWhy}</p>}
          </div>

          {/* time, three attackers */}
          <div className="relative">
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">{copy.timeTitle}</p>
            <ul className="mt-4 grid gap-5">
              {ATTACKS.map((attack) => {
                const s = log10Seconds(a.log10Guesses, attack.perSecond);
                const k = tone(s);
                const name = copy.attacks[attack.id];
                return (
                  <li key={attack.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium text-ink">{name.name}</span>
                        <span className="block font-mono text-[10.5px] tracking-[0.06em] text-dim uppercase">{name.detail}</span>
                      </span>
                      <span aria-live="polite" className={cn("font-display text-[19px] font-semibold tracking-[-0.01em]", TONE_TEXT[k])}>
                        {a.length ? formatDuration(s, timeCopy, lang) : "—"}
                      </span>
                    </div>
                    <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-line">
                      <div
                        className={cn("absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-700 ease-soft", TONE_BG[k])}
                        style={{ width: `${a.length ? Math.max(1.5, scaleOf(s) * 100) : 0}%` }}
                      />
                      {TICKS.slice(1, -1).map((x) => (
                        <span key={x} aria-hidden className="absolute inset-y-0 w-px bg-bg/70" style={{ left: `${x * 100}%` }} />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div aria-hidden className="relative mt-2 h-4 font-mono text-[9.5px] tracking-[0.06em] text-dim uppercase">
              {copy.ticks.map((label, i) => (
                <span
                  key={label}
                  className={cn("absolute top-0 whitespace-nowrap", i === 0 ? "left-0" : i === copy.ticks.length - 1 ? "right-0" : "-translate-x-1/2 max-sm:hidden")}
                  style={i > 0 && i < copy.ticks.length - 1 ? { left: `${TICKS[i] * 100}%` } : undefined}
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[12.5px] leading-snug text-dim">{copy.note}</p>
          </div>
        </section>

        {/* ------------------------------------------------ findings, tips, generator */}
        <div className="flex flex-col gap-4">
          <section className="card p-5 sm:p-6">
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">{copy.findingsTitle}</p>
            <ul aria-live="polite" className="mt-3 grid gap-2.5">
              {!value && <li className="text-[14.5px] text-mute">{copy.findings.empty}</li>}
              {findings.map((f) => (
                <li key={f} className="flex gap-2.5 text-[14.5px] leading-snug text-ink">
                  <span aria-hidden className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", f === "good" || f === "phrase" ? "bg-acc" : f === "short" ? "bg-warm" : "bg-danger")} />
                  {copy.findings[f]}
                </li>
              ))}
            </ul>
            <p className="mt-6 font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">{copy.tipsTitle}</p>
            <ol className="mt-3 grid gap-2.5">
              {copy.tips.map((tip, i) => (
                <li key={tip} className="flex gap-3 text-[14.5px] leading-snug text-mute">
                  <span className="font-mono text-[11px] text-acc">0{i + 1}</span>
                  {tip}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="lab-gen-title" className="card relative overflow-hidden p-5 sm:p-6">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.16),transparent)]" />
            <h3 id="lab-gen-title" className="relative flex items-center gap-2 font-display text-[19px] font-semibold tracking-[-0.01em]">
              <span aria-hidden className="h-2 w-2 animate-blink rounded-full bg-acc shadow-[0_0_10px_var(--color-acc)]" />
              {copy.gen.title}
            </h3>
            <p className="relative mt-1.5 text-[13.5px] leading-snug text-mute">{copy.gen.lead}</p>

            <div role="radiogroup" className="relative mt-4 grid grid-cols-2 gap-1 rounded-[12px] border border-line p-1">
              {(["phrase", "random"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => {
                    setMode(m);
                    setGenerated(draw(m));
                  }}
                  className="rounded-[9px] px-2 py-2 text-[13px] text-mute transition-colors aria-checked:bg-acc/12 aria-checked:text-acc"
                >
                  {m === "phrase" ? copy.gen.phrase : copy.gen.random}
                </button>
              ))}
            </div>

            <label className="relative mt-4 block">
              <span className="flex justify-between font-mono text-[10.5px] tracking-[0.1em] text-mute uppercase">
                <span>{mode === "phrase" ? fill(copy.gen.words, { n: String(count) }) : fill(copy.gen.length, { n: String(length) })}</span>
              </span>
              <input
                type="range"
                min={mode === "phrase" ? 5 : 12}
                max={mode === "phrase" ? 10 : 32}
                value={mode === "phrase" ? count : length}
                onChange={(e) => {
                  const n = +e.target.value;
                  if (mode === "phrase") setCount(n);
                  else setLength(n);
                  setGenerated(mode === "phrase" ? draw(mode, n) : draw(mode, count, n));
                }}
                className="mt-2 w-full accent-[var(--color-acc)]"
              />
            </label>

            <output
              aria-live="polite"
              className="relative mt-3 block min-h-[56px] rounded-[12px] border border-acc/30 bg-bg-2 px-4 py-3.5 font-mono text-[16px] leading-snug break-all text-acc select-all"
            >
              {generated || " "}
            </output>
            <div className="relative mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={copyGenerated} className="btn btn-primary btn-sm">
                {copied ? `${copy.gen.copied} ✓` : copy.gen.copy}
              </button>
              <button type="button" onClick={() => setGenerated(draw())} className="btn btn-ghost btn-sm">
                {copy.gen.again} ↻
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue(generated);
                  inputRef.current?.focus({ preventScroll: true });
                  inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
                }}
                className="btn btn-ghost btn-sm"
              >
                {copy.gen.test} ↑
              </button>
            </div>
            <p className="relative mt-4 text-[14px] text-ink">{fill(copy.gen.strength, { bcrypt: genTime("bcrypt"), md5: genTime("md5") })}</p>
            <p className="relative mt-1 text-[12.5px] leading-snug text-dim">
              {fill(copy.gen.honest, {
                options: (mode === "phrase" ? words.length : RANDOM_ALPHABET.length).toLocaleString(lang === "pt" ? "pt-BR" : "en-US"),
                unit: mode === "phrase" ? copy.gen.unitWord : copy.gen.unitChar,
              })}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
