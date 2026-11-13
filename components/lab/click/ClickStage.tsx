"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Resolved } from "@/content/lab";
import type { CLICK_COPY } from "@/content/lab/one-click";
import { cn } from "@/lib/cn";
import { fill, type Lang } from "@/lib/i18n";
import { onFrame } from "@/lib/ticker";
import { formatKm, formatMs, maxKmOf, median, PHASE_IDS, protocolName, regionOf, timelineOf, type PhaseId, type Timeline } from "./model";

type Copy = Resolved<typeof CLICK_COPY>;

/** Replay length, seconds; the page's real time is stretched to fit. */
const REPLAY_S = 6;
/** The round-trip animation runs this many times slower than reality. */
const PING_SLOW = 40;

const PHASE_BG: Record<PhaseId, string> = {
  prep: "bg-dim",
  dns: "bg-acc-2",
  tcp: "bg-acc",
  tls: "bg-warm",
  wait: "bg-danger",
  download: "bg-acc-2/70",
  build: "bg-acc/70",
  rest: "bg-mute/50",
};

/* The navigation entry, read once it is complete (after the load event). */
type Snapshot = Timeline | "none" | null;
let cached: Snapshot = null;
function readTimeline(): Snapshot {
  if (cached) return cached;
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!entry) return (cached = "none");
  if (!entry.loadEventEnd) return null;
  return (cached = timelineOf(entry));
}
function subscribe(onChange: () => void) {
  if (readTimeline()) return () => {};
  const on = () => setTimeout(onChange, 0);
  window.addEventListener("load", on);
  const poll = setInterval(onChange, 500);
  return () => {
    window.removeEventListener("load", on);
    clearInterval(poll);
  };
}

export function ClickStage({ lang, copy }: { lang: Lang; copy: Copy }) {
  const snap = useSyncExternalStore(subscribe, readTimeline, () => null);
  const timeline = snap && snap !== "none" ? snap : null;
  const pathname = usePathname();
  const earlier = timeline ? new URL(timeline.url).pathname !== pathname : false;

  const [active, setActive] = useState<PhaseId | null>(null);
  const activeRef = useRef<PhaseId | null>(null);
  const replayAt = useRef<number | null>(null);
  const cursors = useRef<(HTMLSpanElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const select = (id: PhaseId | null) => {
    activeRef.current = id;
    setActive(id);
  };

  const replay = () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    replayAt.current = -1;
  };

  // The replay: one cursor per row sweeps the page's real timeline, stretched to REPLAY_S.
  useEffect(() => {
    if (!timeline) return;
    const setCursor = (p: number | null) => {
      for (const el of cursors.current) {
        if (!el) continue;
        el.style.opacity = p === null ? "0" : "1";
        if (p !== null) el.style.left = `${p * 100}%`;
      }
    };
    return onFrame((time) => {
      if (replayAt.current === null) return;
      if (replayAt.current < 0) replayAt.current = time;
      const p = Math.min(1, (time - replayAt.current) / REPLAY_S);
      setCursor(p);
      const ms = p * timeline.total;
      const here = timeline.phases.find((ph) => ph.end > ph.start && ms >= ph.start && ms <= ph.end);
      if (here && here.id !== activeRef.current) select(here.id);
      if (p >= 1) {
        replayAt.current = null;
        setTimeout(() => setCursor(null), 900);
      }
    });
  }, [timeline]);

  // Play once, the first time the timeline scrolls into view.
  useEffect(() => {
    const el = rootRef.current;
    if (!timeline || !el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      replay();
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [timeline]);

  const shown = active ? copy.phases[active] : null;
  const shownPhase = active && timeline ? timeline.phases.find((p) => p.id === active)! : null;

  return (
    <div className="relative mx-auto max-w-[1360px]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        {/* ------------------------------------------------ the page's own timeline */}
        <section ref={rootRef} aria-label={copy.aria} className="card relative overflow-hidden p-5 sm:p-7">
          <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(62_242_196/0.12),transparent)]" />
          {!timeline ? (
            <p className="relative py-16 text-center text-[15px] text-mute">{snap === "none" ? copy.unsupported : copy.loading}</p>
          ) : (
            <>
              <div className="relative flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-[clamp(22px,2.4vw,32px)] leading-tight font-bold tracking-[-0.025em]">
                    {copy.total} <span className="text-gradient">{formatMs(timeline.total, lang)}</span>
                  </p>
                  <p className="mt-1.5 font-mono text-[10.5px] tracking-[0.12em] text-mute uppercase">
                    {copy.measured} · {fill(copy.protocol, { p: protocolName(timeline.protocol) })} · {fill(copy.slow, { x: String(Math.max(1, Math.round((REPLAY_S * 1000) / timeline.total))) })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={replay} className="btn btn-primary btn-sm">
                    {copy.replay} ▶
                  </button>
                  <button type="button" onClick={() => location.reload()} className="btn btn-ghost btn-sm">
                    {copy.reload} ↻
                  </button>
                </div>
              </div>
              {earlier && <p className="relative mt-4 rounded-[12px] border border-warm/30 bg-warm/[0.05] px-4 py-3 text-[13.5px] leading-snug text-warm">{copy.earlier}</p>}

              <ol className="relative mt-6 grid gap-1.5">
                {timeline.phases.map((phase, i) => {
                  const dur = phase.end - phase.start;
                  const c = copy.phases[phase.id];
                  return (
                    <li key={phase.id}>
                      <button
                        type="button"
                        aria-pressed={active === phase.id}
                        onClick={() => {
                          replayAt.current = null;
                          select(phase.id);
                        }}
                        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-[12px] px-3 py-2 text-left transition-colors hover:bg-acc/[0.05] aria-pressed:bg-acc/[0.07] sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)_72px]"
                      >
                        <span className="min-w-0">
                          <span className="flex items-baseline gap-2">
                            <span className="font-mono text-[10px] text-dim">0{i + 1}</span>
                            <span className="text-[14.5px] font-medium text-ink group-aria-pressed:text-acc">{c.name}</span>
                          </span>
                          <span className="block truncate pl-[22px] text-[12px] text-mute">{c.short}</span>
                        </span>
                        <span className="relative col-span-2 h-3 rounded-full bg-line/60 sm:col-span-1 sm:row-start-1 sm:col-start-2">
                          <span
                            className={cn("absolute inset-y-0 rounded-full", PHASE_BG[phase.id], dur === 0 && "opacity-40")}
                            style={{ left: `${(phase.start / timeline.total) * 100}%`, width: dur ? `max(3px, ${(dur / timeline.total) * 100}%)` : "2px" }}
                          />
                          <span
                            ref={(el) => {
                              cursors.current[i] = el;
                            }}
                            aria-hidden
                            className="absolute -inset-y-1.5 w-px bg-ink opacity-0 shadow-[0_0_8px_var(--color-ink)]"
                          />
                        </span>
                        <span className="row-start-1 col-start-2 text-right font-mono text-[13px] text-ink sm:col-start-3">{formatMs(dur, lang)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div aria-live="polite" className="relative mt-5 min-h-[96px] rounded-[14px] border border-line bg-bg/40 p-4 sm:p-5">
                {shown && shownPhase ? (
                  <>
                    <p className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-acc">
                        {shown.name} <span className="text-mute">· {shown.short}</span>
                      </span>
                      <span className="font-mono text-[13px] text-ink">
                        {shownPhase.end - shownPhase.start === 0 ? copy.zero : formatMs(shownPhase.end - shownPhase.start, lang)}
                      </span>
                    </p>
                    <p className="mt-2 text-[14.5px] leading-snug text-mute">{shown.long}</p>
                  </>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {PHASE_IDS.map((id) => (
                      <li key={id} className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-mute uppercase">
                        <span className={cn("h-2 w-2 rounded-full", PHASE_BG[id])} />
                        {copy.phases[id].name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>

        <Distance lang={lang} copy={copy} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- the round trip */

type Ping = { status: "idle" | "measuring" | "done" | "error"; samples: number[]; region: string | null; local: boolean };

function Distance({ lang, copy }: { lang: Lang; copy: Copy }) {
  const c = copy.distance;
  const [ping, setPing] = useState<Ping>({ status: "idle", samples: [], region: null, local: false });
  const dotRef = useRef<SVGCircleElement>(null);
  const rtt = ping.samples.length ? median(ping.samples) : 0;

  const measure = async () => {
    setPing((p) => ({ ...p, status: "measuring", samples: [] }));
    const samples: number[] = [];
    let id: string | null = null;
    try {
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        const res = await fetch(location.pathname, { method: "HEAD", cache: "no-store" });
        samples.push(performance.now() - t0);
        id = res.headers.get("x-vercel-id") ?? id;
        setPing((p) => ({ ...p, samples: [...samples] }));
      }
      setPing({ status: "done", samples, region: regionOf(id), local: !id && /^(localhost|127\.|\[::1\])/.test(location.hostname) });
    } catch {
      setPing((p) => ({ ...p, status: "error" }));
    }
  };

  // The packet goes out and back, PING_SLOW times slower than it really did.
  useEffect(() => {
    if (ping.status !== "done" || !rtt) return;
    const period = (rtt * PING_SLOW) / 1000;
    return onFrame((time) => {
      const p = (time % period) / period;
      const x = 34 + (p < 0.5 ? p * 2 : 2 - p * 2) * 232;
      dotRef.current?.setAttribute("cx", x.toFixed(1));
    });
  }, [ping.status, rtt]);

  const regions = copy.regions as Record<string, string>;
  const where = ping.local ? c.local : ping.region ? (regions[ping.region] ?? ping.region.toUpperCase()) : c.unknownRegion;

  return (
    <section aria-labelledby="lab-ping-title" className="card relative flex flex-col overflow-hidden p-5 sm:p-6">
      <h3 id="lab-ping-title" className="font-display text-[19px] font-semibold tracking-[-0.01em]">
        {c.title}
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-snug text-mute">{c.lead}</p>

      <svg viewBox="0 0 300 92" className="mt-5 w-full" aria-hidden>
        <line x1="34" y1="40" x2="266" y2="40" stroke="var(--color-line-2)" strokeDasharray="3 5" />
        <circle cx="34" cy="40" r="9" fill="rgb(185 255 75 / 0.12)" stroke="var(--color-acc)" />
        <circle cx="266" cy="40" r="9" fill="rgb(62 242 196 / 0.12)" stroke="var(--color-acc-2)" />
        {ping.status === "done" && <circle ref={dotRef} cx="34" cy="40" r="4" fill="var(--color-ink)" style={{ filter: "drop-shadow(0 0 6px var(--color-acc))" }} />}
        <text x="34" y="74" textAnchor="middle" fill="var(--color-mute)" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1">
          {c.you.toUpperCase()}
        </text>
        <text x="266" y="74" textAnchor="middle" fill="var(--color-mute)" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="1">
          {c.server.toUpperCase()}
        </text>
      </svg>

      <div aria-live="polite" className="mt-3 flex-1">
        {ping.samples.length > 0 && (
          <p className="flex flex-wrap gap-1.5">
            {ping.samples.map((s, i) => (
              <span key={i} className="chip">
                {Math.round(s)} ms
              </span>
            ))}
          </p>
        )}
        {ping.status === "done" && (
          <div className="mt-4 grid gap-3">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-[34px] leading-none font-bold tracking-[-0.03em] text-gradient">{formatMs(rtt, lang)}</span>
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-mute uppercase">{c.rtt}</span>
            </p>
            <p className="text-[14.5px] text-ink">
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-mute uppercase">{c.servedFrom} · </span>
              {where}
            </p>
            {!ping.local && <p className="text-[15px] font-medium text-acc">{fill(c.maxKm, { km: formatKm(maxKmOf(rtt), lang) })}</p>}
            <p className="text-[13px] leading-snug text-mute">{fill(c.light, { ms: formatMs(rtt, lang), half: formatKm(maxKmOf(rtt), lang) })}</p>
            <p className="font-mono text-[10px] tracking-[0.1em] text-dim uppercase">{fill(copy.slow, { x: String(PING_SLOW) })}</p>
          </div>
        )}
        {ping.status === "error" && <p className="mt-3 text-[14px] text-danger">{c.error}</p>}
      </div>

      <button type="button" onClick={measure} disabled={ping.status === "measuring"} className="btn btn-primary btn-sm mt-5 self-start">
        {ping.status === "measuring" ? c.measuring : ping.status === "done" ? `${c.again} ↻` : `${c.start} →`}
      </button>
    </section>
  );
}
