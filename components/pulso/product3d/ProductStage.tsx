"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PULSO_ONE_PARTS } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { onFrame } from "@/lib/ticker";
import { musicAt, noiseAt, type PartId } from "./model";
import type { Stage } from "./engine";

export type PulsoExplodeDetail = { value: number };
export type PulsoPartDetail = { id: string | null };
export type PulsoStageDetail = { explode: number; part: string | null; working: boolean };

const PARTS = PULSO_ONE_PARTS;
const isPart = (id: unknown): id is PartId => typeof id === "string" && PARTS.some((p) => p.id === id);
const partInfo = (id: PartId) => PARTS.find((p) => p.id === id)!;
const pad2 = (n: number) => String(n).padStart(2, "0");

function emitStage(l: { explode: number; part: PartId | null; working: boolean; sent: string }) {
  const explode = Math.round(l.explode * 1000) / 1000;
  const key = `${explode}|${l.part}|${l.working}`;
  if (key === l.sent) return;
  l.sent = key;
  const detail: PulsoStageDetail = { explode, part: l.part, working: l.working };
  window.dispatchEvent(new CustomEvent("pulso:stage", { detail }));
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The Pulso One as a live 3D object (fills its parent; the parent sets the size).
 *
 * Drag turns it (touch: horizontal drags only, vertical ones scroll the page), hover names a part,
 * click focuses it, Esc or a click on empty space goes back. "Desmontar" opens the exploded view,
 * the slider scrubs it, "Ver funcionando" shows noise cancelling at work. Without WebGL the studio
 * photo stands in and the parts list keeps working.
 *
 * Window events — listens to `pulso:explode` { value 0..1 } and `pulso:part` { id | null };
 * dispatches `pulso:stage` { explode, part, working } whenever any of them changes.
 */
export function ProductStage({ className, colorId }: { className?: string; colorId?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const live = useRef({ explode: 0, part: null as PartId | null, working: false, sent: "" });

  const [part, setPart] = useState<PartId | null>(null);
  const [hover, setHover] = useState<PartId | null>(null);
  const [working, setWorking] = useState(false);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const emit = () => emitStage(live.current);

  const choosePart = (id: PartId | null, fromList: boolean) => {
    const st = stageRef.current;
    if (st) {
      if (fromList) st.focusFromList(id);
      else st.setPart(id);
      return;
    }
    live.current.part = id;
    setPart(id);
    emitStage(live.current);
  };

  const toggleWorking = () => {
    const next = !live.current.working;
    live.current.working = next;
    setWorking(next);
    stageRef.current?.setWorking(next);
    emit();
  };

  // Engine lifecycle.
  useEffect(() => {
    let cancelled = false;
    let stage: Stage | null = null;
    import("./engine").then(({ createStage }) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const host = hostRef.current;
      if (!canvas || !host || !hoverRef.current || !focusRef.current) return;
      if (labParam("nogl") === 1 || !webglAvailable()) {
        setFailed(true);
        return;
      }
      try {
        stage = createStage({
          canvas,
          host,
          hoverEl: hoverRef.current,
          focusEl: focusRef.current,
          reduced: reducedMotion(),
          frozen: labParam("t") !== null,
          colorId,
          cb: {
            onExplode(v) {
              live.current.explode = v;
              const s = sliderRef.current;
              if (s) {
                s.value = String(Math.round(v * 1000));
                s.style.setProperty("--v", `${(v * 100).toFixed(1)}%`);
              }
              if (pctRef.current) pctRef.current.textContent = `${Math.round(v * 100)}%`;
              emitStage(live.current);
            },
            onOpen: setOpen,
            onPart(id) {
              live.current.part = id;
              setPart(id);
              emitStage(live.current);
            },
            onHover: setHover,
            onLost() {
              setFailed(true);
            },
          },
        });
      } catch {
        setFailed(true);
        return;
      }
      stageRef.current = stage;
      setReady(true);
      if (process.env.NODE_ENV !== "production") {
        const st = stage;
        (window as unknown as { __desmonte?: unknown }).__desmonte = {
          beats: [
            { t: 0, name: "Montado" },
            { t: 0.5, name: "Abrindo" },
            { t: 1, name: "Vista explodida" },
          ],
          seek: (t: number) => {
            st.setExplode(t, "instant");
            return new Promise((r) => setTimeout(r, 120));
          },
          ready: true,
        };
      }
    });
    return () => {
      cancelled = true;
      stage?.dispose();
      stageRef.current = null;
    };
    // colorId is applied by the effect below; the engine must not be rebuilt for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stageRef.current?.setColor(colorId);
  }, [colorId, ready]);

  // Window events from the page, and Esc while showing the photo.
  useEffect(() => {
    const onExplode = (e: Event) => {
      const v = Number((e as CustomEvent<PulsoExplodeDetail>).detail?.value);
      if (!Number.isFinite(v)) return;
      const st = stageRef.current;
      if (st) st.setExplode(v, "ease");
    };
    // Without the engine (photo fallback) the part lives here.
    const pick = (id: PartId | null) => {
      const st = stageRef.current;
      if (st) return st.setPart(id);
      live.current.part = id;
      setPart(id);
      emitStage(live.current);
    };
    const onPart = (e: Event) => {
      const id = (e as CustomEvent<PulsoPartDetail>).detail?.id ?? null;
      pick(isPart(id) ? id : null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !stageRef.current && live.current.part) pick(null);
    };
    window.addEventListener("pulso:explode", onExplode);
    window.addEventListener("pulso:part", onPart);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pulso:explode", onExplode);
      window.removeEventListener("pulso:part", onPart);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const active = part ? partInfo(part) : null;
  const activeIdx = part ? PARTS.findIndex((p) => p.id === part) : -1;
  const hovered = hover ? partInfo(hover) : null;

  return (
    <div ref={hostRef} className={cn("relative h-full w-full overflow-hidden font-sans text-pu-ink", className)}>
      {/* Blueprint grid, very faint, so the object sits in a lab rather than in a void. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgb(12_13_18/0.045)_1px,transparent_1px),linear-gradient(90deg,rgb(12_13_18/0.045)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_45%_50%,black_20%,transparent_72%)]"
      />

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Modelo 3D do fone Pulso One. Arraste para girar; use a lista de peças para ver cada uma."
        className={cn(
          "absolute inset-0 h-full w-full cursor-grab transition-opacity duration-700 ease-soft active:cursor-grabbing",
          ready && !failed ? "opacity-100" : "opacity-0",
        )}
        style={{ touchAction: "pan-y pinch-zoom" }}
      />

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pb-48 md:pr-[270px] md:pb-24">
          <div className="relative aspect-square h-full max-h-[640px] max-w-full">
            <Image
              src="/pulso/one-1000.jpg"
              alt="Fone Pulso One em grafite com anel de luz violeta, foto de estúdio"
              fill
              sizes="(min-width: 900px) 640px, 90vw"
              className="rounded-[20px] object-cover"
            />
          </div>
        </div>
      )}

      {/* Hover label (positioned by the engine at the part's anchor). */}
      <div ref={hoverRef} aria-hidden className="pointer-events-none absolute top-0 left-0 z-10 will-change-transform">
        <div
          className={cn(
            "flex -translate-x-1/2 -translate-y-[calc(100%+14px)] items-center gap-2 rounded-full border border-pu-line bg-pu-bg-2/90 py-1 pr-3 pl-2 whitespace-nowrap shadow-[0_6px_24px_-10px_rgb(12_13_18/0.35)] backdrop-blur transition-opacity duration-200",
            hovered && hover !== part ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="size-1.5 rounded-full bg-pu-acc" />
          <span className="font-mono text-[10px] tracking-[0.14em] text-pu-mute uppercase">
            {hovered ? pad2(PARTS.indexOf(hovered) + 1) : ""}
          </span>
          <span className="text-[13px] font-medium">{hovered?.name}</span>
        </div>
      </div>

      {/* Focus marker. */}
      <div ref={focusRef} aria-hidden className="pointer-events-none absolute top-0 left-0 z-10 will-change-transform">
        <div className={cn("relative -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300", part && !failed ? "opacity-100" : "opacity-0")}>
          <span className="block size-3 rounded-full border border-pu-acc bg-pu-bg-2" />
          <span className="absolute inset-0 animate-ping rounded-full border border-pu-acc/60 motion-reduce:hidden" />
        </div>
      </div>

      {/* Header. */}
      <div className="pointer-events-none absolute top-4 left-4 z-20 md:top-6 md:left-6">
        <p className="font-mono text-[10px] tracking-[0.18em] text-pu-mute uppercase">
          Pulso One <span className="text-pu-acc">·</span> modelo 3D
        </p>
        <p className="mt-1 hidden text-[13px] text-pu-mute md:block">
          {failed ? "Foto de estúdio · 3D indisponível neste aparelho" : "Arraste para girar · passe o mouse e clique numa peça"}
        </p>
      </div>

      {/* Note of the focused part. */}
      <div
        className={cn(
          "absolute top-12 left-4 z-20 w-[min(300px,calc(100%-32px))] transition-[opacity,transform] duration-300 ease-soft md:top-[88px] md:left-6",
          active ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
        aria-live="polite"
      >
        {active && (
          <div className="rounded-2xl border border-pu-line bg-pu-bg-2/90 p-4 shadow-[0_18px_50px_-24px_rgb(12_13_18/0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] tracking-[0.16em] text-pu-acc uppercase">
                Peça {pad2(activeIdx + 1)} / {pad2(PARTS.length)}
              </span>
              <button
                type="button"
                onClick={() => choosePart(null, false)}
                className="rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-pu-mute uppercase transition-colors hover:text-pu-ink focus-visible:outline-2 focus-visible:outline-pu-acc"
              >
                Vista geral · Esc
              </button>
            </div>
            <h3 className="mt-2 font-pulso text-xl font-semibold tracking-tight">{active.name}</h3>
            <p className="mt-1 text-sm leading-relaxed text-pu-mute">{active.note}</p>
          </div>
        )}
      </div>

      {/* Parts list: a column on wide screens, a row of chips on phones. */}
      <nav
        aria-label="Peças do Pulso One"
        className="absolute inset-x-0 bottom-[132px] z-20 md:inset-x-auto md:top-1/2 md:right-6 md:bottom-auto md:w-[230px] md:-translate-y-1/2"
      >
        <p className="mb-2 hidden font-mono text-[10px] tracking-[0.18em] text-pu-mute uppercase md:block">Peças · {PARTS.length}</p>
        <ol className="flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:flex-col md:gap-0 md:overflow-visible md:rounded-2xl md:border md:border-pu-line md:bg-pu-bg-2/70 md:p-1.5 md:backdrop-blur">
          {PARTS.map((p, i) => {
            const on = p.id === part;
            return (
              <li key={p.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => choosePart(on ? null : p.id, true)}
                  onMouseEnter={() => stageRef.current?.setHover(p.id)}
                  onMouseLeave={() => stageRef.current?.setHover(null)}
                  onFocus={() => stageRef.current?.setHover(p.id)}
                  onBlur={() => stageRef.current?.setHover(null)}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-full border px-3 py-1.5 text-left text-[13px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pu-acc md:rounded-xl md:border-transparent md:py-2",
                    on
                      ? "border-pu-acc bg-pu-acc text-white md:bg-pu-acc"
                      : "border-pu-line bg-pu-bg-2/80 text-pu-ink hover:bg-pu-bg-2 md:bg-transparent",
                  )}
                >
                  <span className={cn("font-mono text-[10px] tracking-[0.1em]", on ? "text-white/70" : "text-pu-mute")}>{pad2(i + 1)}</span>
                  <span className="whitespace-nowrap">{p.name}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "ml-auto hidden h-px w-4 transition-all duration-300 md:block",
                      on ? "w-6 bg-white/70" : "bg-pu-line group-hover:w-6 group-hover:bg-pu-acc",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Controls. */}
      <div className="absolute inset-x-4 bottom-4 z-20 md:right-auto md:bottom-6 md:left-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-pu-line bg-pu-bg-2/85 p-2 md:flex-nowrap shadow-[0_18px_50px_-30px_rgb(12_13_18/0.4)] backdrop-blur md:gap-4">
          <button
            type="button"
            disabled={failed}
            onClick={() => stageRef.current?.toggleExplode()}
            aria-pressed={open}
            className="shrink-0 rounded-xl bg-pu-ink px-3.5 py-2.5 font-pulso text-[13px] font-medium text-white transition-colors hover:bg-pu-acc focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pu-acc disabled:opacity-40 md:px-4"
          >
            {open ? "Montar" : "Desmontar"}
          </button>
          <label className="order-last flex min-w-0 basis-full flex-col gap-1 px-1 pb-1 md:order-none md:w-[220px] md:basis-auto md:px-0 md:pb-0">
            <span className="flex items-center justify-between font-mono text-[10px] tracking-[0.14em] text-pu-mute uppercase">
              Vista explodida
              <span ref={pctRef} className="text-pu-ink tabular-nums">
                0%
              </span>
            </span>
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={1000}
              step={1}
              defaultValue={0}
              disabled={failed}
              onInput={(e) => stageRef.current?.setExplode(Number(e.currentTarget.value) / 1000, "instant")}
              aria-label="Vista explodida"
              className="h-5 w-full cursor-pointer appearance-none bg-transparent [--v:0%] disabled:opacity-40 [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-pu-acc [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-pu-line [&::-webkit-slider-runnable-track]:h-[2px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,var(--color-pu-acc)_var(--v),rgb(12_13_18/0.12)_var(--v))] [&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-pu-acc [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgb(91_75_255/0.12)]"
            />
          </label>
          <span aria-hidden className="hidden h-8 w-px bg-pu-line md:block" />
          <button
            type="button"
            role="switch"
            aria-checked={working}
            disabled={failed}
            onClick={toggleWorking}
            className="ml-auto flex shrink-0 items-center gap-2 rounded-xl px-2 py-2 text-[13px] md:ml-0 font-medium transition-colors hover:bg-pu-bg focus-visible:outline-2 focus-visible:outline-pu-acc disabled:opacity-40 md:px-3"
          >
            <span className={cn("relative h-4 w-7 rounded-full transition-colors duration-300", working ? "bg-pu-acc" : "bg-pu-ink/15")}>
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow transition-transform duration-300 ease-soft",
                  working && "translate-x-3",
                )}
              />
            </span>
            Ver funcionando
          </button>
        </div>
      </div>

      {working && !failed && <Scope className={part ? "max-md:hidden" : undefined} />}
    </div>
  );
}

/** Three traces, drawn from the same functions as the 3D waves: noise, anti-noise, what reaches the ear. */
function Scope({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth;
    const H = c.clientHeight;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rows: [string, number][] = [
      ["#8a8f9c", 0],
      ["#00c8f0", 1],
      ["#5b4bff", 2],
    ];
    const reduced = reducedMotion();
    const draw = (time: number) => {
      const t = reduced ? 1.2 : time;
      g.clearRect(0, 0, W, H);
      const rh = H / 3;
      for (let r = 0; r < 3; r++) {
        const [color, kind] = rows[r];
        const cy = rh * r + rh / 2;
        g.strokeStyle = "rgba(12,13,18,0.08)";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(0, cy);
        g.lineTo(W, cy);
        g.stroke();
        g.strokeStyle = color;
        g.lineWidth = 1.5;
        g.beginPath();
        for (let x = 0; x <= W; x += 2) {
          const q = (x / W) * 7;
          let v: number;
          if (kind === 0) v = noiseAt(q, t);
          else if (kind === 1) v = -noiseAt(q, t);
          else v = musicAt(q, t) + 0.04 * noiseAt(q * 3, t);
          const y = cy - v * rh * 0.34;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
    };
    draw(0);
    if (reduced) return;
    return onFrame(draw);
  }, []);

  return (
    <div className={cn("absolute top-12 right-4 z-20 w-[min(260px,calc(100%-32px))] rounded-2xl border border-pu-line bg-pu-bg-2/90 p-3 shadow-[0_18px_50px_-30px_rgb(12_13_18/0.4)] backdrop-blur md:top-6 md:right-[270px] md:w-[270px]", className)}>
      <p className="font-mono text-[10px] tracking-[0.16em] text-pu-acc uppercase">Cancelamento de ruído · ao vivo</p>
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3">
        <ul className="flex flex-col justify-around py-1 font-mono text-[9.5px] leading-tight tracking-[0.08em] text-pu-mute uppercase">
          <li>
            <span className="mr-1.5 inline-block h-px w-3 bg-[#8a8f9c] align-middle" />
            Ruído
          </li>
          <li>
            <span className="mr-1.5 inline-block h-px w-3 bg-pu-acc-2 align-middle" />
            Antirruído
          </li>
          <li>
            <span className="mr-1.5 inline-block h-px w-3 bg-pu-acc align-middle" />
            No ouvido
          </li>
        </ul>
        <canvas ref={ref} aria-hidden className="h-[96px] w-full" />
      </div>
      <p className="mt-2 hidden text-[12px] leading-snug text-pu-mute md:block">
        Os microfones medem o ruído, o chip N1 gera a onda oposta e as duas se anulam. Ao ouvido chega só a música.
      </p>
    </div>
  );
}
