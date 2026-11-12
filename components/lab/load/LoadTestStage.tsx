"use client";

import { useEffect, useRef, useState } from "react";
import type { Resolved } from "@/content/lab";
import type { LOAD_COPY } from "@/content/lab/load-test";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { fill, type Lang } from "@/lib/i18n/core";
import { labParam } from "@/lib/lab";
import { damp } from "@/lib/math";
import { onFrame } from "@/lib/ticker";
import { TourCursor, useTour, type TourStep } from "../Tour";
import type { LoadStage, LoadView } from "./engine";
import { BEATS, breakingPoint, curve, loadPose, MAX_MACHINES, positionOf, tourState, usersAt, type Arch } from "./model";

type Copy = Resolved<typeof LOAD_COPY>;

/* Everything below is derived from the model once, at module load (pure, no clock). */
const CW = 340;
const CH = 160;
const PL = 36;
const PB = 24;
const xs = (x: number) => PL + x * (CW - PL - 8);
const ys = (ms: number) => CH - PB - ((Math.log10(Math.min(10000, Math.max(100, ms))) - 2) / 2) * (CH - PB - 10);
const pathOf = (arch: Arch) =>
  curve(arch, 90)
    .map(([x, ms], i) => `${i ? "L" : "M"}${xs(x).toFixed(1)},${ys(ms).toFixed(1)}`)
    .join("");
const PATHS = { single: pathOf("single"), scalable: pathOf("scalable") };
const two = (n: number) => Number(n.toPrecision(2));
const LIMITS = { single: two(breakingPoint("single")), scalable: two(breakingPoint("scalable")) };
const X_TICKS = [10, 100, 1000, 10000, 50000];
const Y_TICKS = [
  [100, "100 ms"],
  [1000, "1 s"],
  [10000, "10 s"],
] as const;

const STATUS_TEXT = { ok: "text-acc", slow: "text-warm", down: "text-danger" } as const;
const STATUS_DOT = { ok: "bg-acc", slow: "bg-warm", down: "bg-danger" } as const;

export function LoadTestStage({ lang, copy }: { lang: Lang; copy: Copy }) {
  const locale = lang === "pt" ? "pt-BR" : "en-US";
  const num = (n: number) => Math.round(n).toLocaleString(locale);

  const [arch, setArch] = useState<Arch>("single");
  const [open, setOpen] = useState(0);
  const [target, setTarget] = useState(150);
  const [users, setUsers] = useState(150);
  const [view, setView] = useState<LoadView>("iso");
  const [failed, setFailed] = useState(false);
  /** Motion allowed and time not frozen by ?t= (read once on the client; not part of the markup). */
  const [live] = useState(() => typeof window !== "undefined" && !reducedMotion() && labParam("t") === null);

  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const stageRef = useRef<LoadStage | null>(null);
  const state = useRef({ users: 150, arch: "single" as Arch, open: 0 });

  /* the 3D stage, loaded after the page is up */
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    let disposed = false;
    let stage: LoadStage | null = null;
    import("./engine").then(({ createLoadStage }) => {
      if (disposed) return;
      try {
        stage = createLoadStage({
          canvas,
          host,
          labels: labelRefs.current,
          reduced: reducedMotion(),
          frozen: labParam("t") !== null,
          onInteract: () => {},
          onLost: () => setFailed(true),
        });
      } catch {
        setFailed(true);
        return;
      }
      stageRef.current = stage;
      const s = state.current;
      stage.set(s.users, s.arch, s.open);
    });
    return () => {
      disposed = true;
      stage?.dispose();
      stageRef.current = null;
    };
  }, []);

  /* architecture and layers go straight to the stage (it eases them itself) */
  useEffect(() => {
    state.current.arch = arch;
    state.current.open = open;
    stageRef.current?.set(state.current.users, arch, open);
  }, [arch, open]);

  useEffect(() => {
    stageRef.current?.view(view);
  }, [view]);

  /* people ease towards the target in log space; panels and stage read the same value */
  useEffect(() => {
    let stop: (() => void) | null = onFrame((_, dt) => {
      const s = state.current;
      const snap = dt >= 1 || reducedMotion();
      let next = snap ? target : Math.exp(damp(Math.log(s.users), Math.log(target), 4.5, dt));
      if (Math.abs(next - target) / target < 0.002) next = target;
      s.users = next;
      stageRef.current?.set(next, s.arch, s.open);
      setUsers(next);
      if (next === target) {
        stop?.();
        stop = null;
      }
    });
    return () => stop?.();
  }, [target]);

  /* the self-driving tour */
  const steps: TourStep[] = [
    { target: "arch-single", run: () => setArch("single"), hold: 1.4 },
    { target: "preset-2500", run: () => setTarget(2500), hold: 4.4 },
    { target: "arch-scalable", run: () => setArch("scalable"), hold: 3.6 },
    { target: "preset-20000", run: () => setTarget(20000), hold: 4.4 },
    { target: "layers", run: () => setOpen(1), hold: 3.8 },
    { target: "layers", run: () => setOpen(0), hold: 1.2 },
    { target: "preset-150", run: () => setTarget(150), hold: 3.6 },
  ];
  const { rootRef, cursorRef, touring } = useTour(steps, live);

  /* stills hook for the desmonte check (dev only) */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as Window & { __desmonte?: unknown };
    w.__desmonte = {
      beats: BEATS.map((b, i) => ({ t: i, name: b.name })),
      seek: (t: number) =>
        new Promise<void>((resolve) => {
          const s = tourState(t);
          state.current = { users: s.users, arch: s.arch, open: s.open };
          setTarget(s.users);
          setUsers(s.users);
          setArch(s.arch);
          setOpen(s.open);
          stageRef.current?.set(s.users, s.arch, s.open);
          setTimeout(() => {
            stageRef.current?.snap(1.7);
            resolve();
          }, 120);
        }),
      ready: true,
    };
    return () => {
      delete w.__desmonte;
    };
  }, []);

  const pose = loadPose(users, arch);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const db =
    arch === "single"
      ? copy.values.sameBox
      : fill(pose.replicas === 0 ? copy.values.noReplica : pose.replicas === 1 ? copy.values.replica : copy.values.replicas, {
          use: pct(pose.dbUse),
          n: String(pose.replicas),
        });
  const down = pose.errors > 0;
  const markerX = xs(positionOf(users));
  const markerY = ys(pose.p95);

  return (
    <div ref={rootRef} className="relative mx-auto max-w-[1360px]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
        {/* stage */}
        <div className="card relative min-h-[360px] overflow-hidden p-0 max-lg:aspect-[4/5] sm:max-lg:aspect-[4/3.3] lg:min-h-[640px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgb(185_255_75/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(185_255_75/0.035)_1px,transparent_1px)] [background-size:32px_32px]"
          />
          <div ref={hostRef} role="img" aria-label={copy.aria} className="absolute inset-0">
            <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full cursor-grab touch-pan-y active:cursor-grabbing", failed && "hidden")} />
            {(["users", "cdn", "app", "db"] as const).map((id, i) => (
              <span
                key={id}
                ref={(el) => {
                  labelRefs.current[i] = el;
                }}
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 px-2 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-mute uppercase opacity-0 sm:text-[11px]"
              >
                <span className="mr-1.5 inline-block h-px w-3 bg-acc/60 align-middle" />
                {copy.layers[id]}
              </span>
            ))}
            {failed && <p className="absolute inset-0 grid place-items-center p-8 text-center text-[15px] text-mute">{copy.noWebgl}</p>}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-4 sm:p-5">
            <span className="flex items-center gap-2 rounded-full border border-line-2 bg-bg/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] uppercase backdrop-blur">
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[pose.status], pose.status !== "ok" && "animate-blink")} />
              <span className={STATUS_TEXT[pose.status]}>{copy.status[pose.status]}</span>
            </span>
            {touring && (
              <span className="rounded-full border border-line bg-bg/70 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-mute uppercase backdrop-blur max-sm:hidden">
                {copy.tour}
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
            <ul className="pointer-events-none flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.08em] text-mute uppercase">
              {(
                [
                  ["static", "bg-acc-2"],
                  ["dynamic", "bg-acc"],
                  ["queued", "bg-warm"],
                  ["error", "bg-danger"],
                ] as const
              ).map(([id, color]) => (
                <li key={id} className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2", color)} />
                  {copy.legend[id]}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label={copy.views.label} className="flex rounded-full border border-line-2 bg-bg/70 p-0.5 backdrop-blur">
                {(["iso", "side", "top"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className="rounded-full px-3 py-1.5 font-mono text-[10.5px] tracking-[0.1em] text-mute uppercase transition-colors hover:text-ink aria-pressed:bg-acc/15 aria-pressed:text-acc"
                  >
                    {copy.views[v]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                data-tour="layers"
                aria-pressed={open > 0.5}
                onClick={() => setOpen(open > 0.5 ? 0 : 1)}
                className="rounded-full border border-line-2 bg-bg/70 px-3.5 py-1.5 font-mono text-[10.5px] tracking-[0.1em] text-ink uppercase backdrop-blur transition-colors hover:border-acc/50 hover:text-acc aria-pressed:border-acc/50 aria-pressed:text-acc"
              >
                {open > 0.5 ? copy.close : copy.open}
              </button>
            </div>
          </div>
          <p className="pointer-events-none absolute right-5 bottom-[60px] font-mono text-[10px] tracking-[0.1em] text-dim uppercase max-sm:hidden">{copy.hint}</p>
        </div>

        {/* console */}
        <div className="card flex flex-col gap-6 p-5 sm:p-6">
          <div>
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">{copy.arch.label}</p>
            <div role="group" aria-label={copy.arch.label} className="mt-2.5 grid grid-cols-2 rounded-[14px] border border-line-2 p-1">
              {(["single", "scalable"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  data-tour={`arch-${a}`}
                  aria-pressed={arch === a}
                  onClick={() => setArch(a)}
                  className="rounded-[10px] px-3 py-2.5 text-[14px] font-semibold text-mute transition-colors hover:text-ink aria-pressed:bg-acc aria-pressed:text-bg"
                >
                  {copy.arch[a]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="load-users" className="font-mono text-[10.5px] tracking-[0.14em] text-mute uppercase">
              {copy.users.label}
            </label>
            <p className="mt-1 font-display text-[clamp(34px,3.4vw,46px)] leading-none font-bold tracking-[-0.04em] tabular-nums">{num(users)}</p>
            <input
              id="load-users"
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(positionOf(target) * 1000)}
              onChange={(e) => {
                const next = usersAt(Number(e.target.value) / 1000);
                state.current.users = next;
                setTarget(next);
              }}
              aria-valuetext={num(target)}
              className="mt-4 w-full accent-[var(--color-acc)]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {copy.presets.map((p) => (
                <button
                  key={p.users}
                  type="button"
                  data-tour={`preset-${p.users}`}
                  aria-pressed={Math.abs(target - p.users) < 1}
                  onClick={() => setTarget(p.users)}
                  className="rounded-full border border-line-2 px-3 py-1.5 text-[13px] text-mute transition-colors hover:border-acc/50 hover:text-ink aria-pressed:border-acc aria-pressed:bg-acc/10 aria-pressed:text-acc"
                >
                  {p.label} <span className="font-mono text-[11px] opacity-70">{num(p.users)}</span>
                </button>
              ))}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line" aria-live="polite">
            <div className="col-span-2 bg-bg-2 p-4">
              <dt className="font-mono text-[10.5px] tracking-[0.12em] text-mute uppercase">{copy.metrics.p95}</dt>
              <dd className={cn("mt-1 font-display text-[30px] leading-none font-bold tracking-[-0.03em] tabular-nums", STATUS_TEXT[pose.status])}>
                {down ? copy.values.down : `${num(pose.p95)} ms`}
              </dd>
            </div>
            {(
              [
                [copy.metrics.errors, pose.errors > 0 ? pct(pose.errors) : "0%", down],
                [copy.metrics.rps, num(pose.rps), false],
                [
                  copy.metrics.machines,
                  arch === "single" ? `1 · ${copy.values.fixed}` : `${pose.machines} ${fill(copy.values.of, { n: String(MAX_MACHINES) })}`,
                  false,
                ],
                [copy.metrics.cpu, pct(Math.min(9.99, pose.appUse)), pose.appUse >= 1],
                [copy.metrics.db, db, false],
                [copy.metrics.cdn, arch === "single" ? copy.values.noCdn : fill(copy.values.cdnShare, { n: String(Math.round(pose.cdnShare * 100)) }), false],
              ] as const
            ).map(([label, value, bad]) => (
              <div key={label} className="bg-bg-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.12em] text-mute uppercase">{label}</dt>
                <dd className={cn("mt-1 text-[15px] font-semibold tabular-nums", bad ? "text-danger" : "text-ink")}>{value}</dd>
              </div>
            ))}
          </dl>

          <figure>
            <figcaption className="font-mono text-[10.5px] tracking-[0.12em] text-mute uppercase">{copy.chart.title}</figcaption>
            <svg viewBox={`0 0 ${CW} ${CH}`} className="mt-3 w-full" role="img" aria-label={copy.chart.title}>
              {Y_TICKS.map(([ms, text]) => (
                <g key={ms}>
                  <line x1={PL} x2={CW - 8} y1={ys(ms)} y2={ys(ms)} stroke="currentColor" className="text-line" />
                  <text x={PL - 6} y={ys(ms) + 3} textAnchor="end" className="fill-dim font-mono text-[8px]">
                    {text}
                  </text>
                </g>
              ))}
              {X_TICKS.map((u) => (
                <text key={u} x={xs(positionOf(u))} y={CH - 8} textAnchor="middle" className="fill-dim font-mono text-[8px]">
                  {u >= 1000 ? `${u / 1000}k` : u}
                </text>
              ))}
              <path d={PATHS.single} fill="none" stroke="var(--color-warm)" strokeWidth={arch === "single" ? 2 : 1.2} strokeOpacity={arch === "single" ? 1 : 0.45} strokeDasharray="4 3" />
              <path d={PATHS.scalable} fill="none" stroke="var(--color-acc)" strokeWidth={arch === "scalable" ? 2 : 1.2} strokeOpacity={arch === "scalable" ? 1 : 0.45} />
              <line x1={markerX} x2={markerX} y1={8} y2={CH - PB} stroke="var(--color-ink)" strokeOpacity="0.35" strokeDasharray="2 3" />
              <circle cx={markerX} cy={markerY} r="4.5" fill={arch === "single" ? "var(--color-warm)" : "var(--color-acc)"} stroke="var(--color-bg)" strokeWidth="2" />
            </svg>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.08em] text-mute uppercase">
              <span className="flex items-center gap-1.5">
                <span className="h-px w-4 border-t-2 border-dashed border-warm" />
                {copy.arch.single}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-acc" />
                {copy.arch.scalable}
              </span>
              <span className="ml-auto">{copy.chart.x}</span>
            </div>
          </figure>

          <p className="border-t border-line pt-5 text-[14.5px] leading-relaxed text-mute">
            {fill(copy.verdict, { single: num(LIMITS.single), scalable: num(LIMITS.scalable), max: String(MAX_MACHINES) })}
          </p>
        </div>
      </div>
      <TourCursor cursorRef={cursorRef} />
    </div>
  );
}
