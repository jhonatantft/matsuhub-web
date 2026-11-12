"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { onFrame } from "@/lib/ticker";

/**
 * The custom-builds hero: a live system diagram (clients → gateway → services → data, plus the
 * integrations around them) with packets travelling along the connections. It walks through the
 * pieces on its own; hover, focus or tap one to read what it does. Copy comes resolved from
 * content/custom.ts; positions live here. Plain SVG driven by the shared ticker — no WebGL.
 */

export type MapNodeId =
  | "web" | "app" | "partner" | "iot" | "gateway" | "erp" | "core" | "pay" | "agent" | "notify"
  | "whatsapp" | "db" | "queue" | "rag" | "wh" | "bi";
type Group = "channel" | "entry" | "service" | "ai" | "data" | "integration";
type Flow = "request" | "event" | "ai";

export type MapNode = { id: MapNodeId; label: string; name: string; desc: string };
type Labels = { title: string; caption: string; hint: string; legend: Record<Flow, string>; groups: Record<Group, string> };

const W = 128;
const H = 44;
const VIEW = { w: 760, h: 530 };
const CYCLE = 2.6; // seconds per piece while the diagram walks on its own
const HOLD = 8; // seconds the walk pauses after the visitor picks a piece

const NODE: Record<MapNodeId, { x: number; y: number; group: Group }> = {
  web: { x: 80, y: 110, group: "channel" },
  app: { x: 80, y: 240, group: "channel" },
  partner: { x: 80, y: 370, group: "channel" },
  iot: { x: 80, y: 480, group: "channel" },
  gateway: { x: 262, y: 240, group: "entry" },
  erp: { x: 262, y: 480, group: "integration" },
  core: { x: 458, y: 60, group: "service" },
  pay: { x: 458, y: 160, group: "service" },
  agent: { x: 458, y: 260, group: "ai" },
  notify: { x: 458, y: 370, group: "service" },
  whatsapp: { x: 458, y: 480, group: "integration" },
  db: { x: 664, y: 60, group: "data" },
  queue: { x: 664, y: 160, group: "data" },
  rag: { x: 664, y: 260, group: "ai" },
  wh: { x: 664, y: 370, group: "data" },
  bi: { x: 664, y: 480, group: "data" },
};

/** h = leaves/enters by the sides (mx = where the S-curve turns), v = top/bottom, r = loop out on the right. */
type Edge = { from: MapNodeId; to: MapNodeId; flow: Flow; o: "h" | "v" | "r"; mx?: number };
const EDGES: Edge[] = [
  { from: "web", to: "gateway", flow: "request", o: "h" },
  { from: "app", to: "gateway", flow: "request", o: "h" },
  { from: "partner", to: "gateway", flow: "request", o: "h" },
  { from: "iot", to: "gateway", flow: "event", o: "h" },
  { from: "gateway", to: "core", flow: "request", o: "h" },
  { from: "gateway", to: "pay", flow: "request", o: "h" },
  { from: "gateway", to: "agent", flow: "ai", o: "h" },
  { from: "gateway", to: "erp", flow: "request", o: "v" },
  { from: "core", to: "db", flow: "request", o: "h" },
  { from: "core", to: "queue", flow: "event", o: "h" },
  { from: "pay", to: "queue", flow: "event", o: "h" },
  { from: "agent", to: "rag", flow: "ai", o: "h" },
  { from: "agent", to: "db", flow: "ai", o: "h", mx: 545 },
  { from: "queue", to: "notify", flow: "event", o: "h", mx: 582 },
  { from: "queue", to: "wh", flow: "event", o: "r" },
  { from: "notify", to: "whatsapp", flow: "event", o: "v" },
  { from: "wh", to: "bi", flow: "event", o: "v" },
];

function edgePath({ from, to, o, mx }: Edge): string {
  const a = NODE[from];
  const b = NODE[to];
  if (o === "v") {
    const s = Math.sign(b.y - a.y);
    const sy = a.y + (s * H) / 2;
    const ey = b.y - (s * H) / 2;
    const my = (sy + ey) / 2;
    return `M${a.x} ${sy}C${a.x} ${my} ${b.x} ${my} ${b.x} ${ey}`;
  }
  if (o === "r") {
    const x = a.x + W / 2;
    return `M${x} ${a.y}C${x + 28} ${a.y} ${x + 28} ${b.y} ${x} ${b.y}`;
  }
  const s = Math.sign(b.x - a.x);
  const sx = a.x + (s * W) / 2;
  const ex = b.x - (s * W) / 2;
  const m = mx ?? (sx + ex) / 2;
  return `M${sx} ${a.y}C${m} ${a.y} ${m} ${b.y} ${ex} ${b.y}`;
}

const PATHS = EDGES.map(edgePath);

/** Packets: one or two per connection, each with its own pace and phase (deterministic). */
const PACKETS = EDGES.flatMap((edge, i) =>
  Array.from({ length: i % 3 === 0 ? 2 : 1 }, (_, k) => ({
    edge: i,
    dur: 1.7 + ((i * 37 + k * 13) % 10) / 10,
    phase: (i * 0.618 + k * 0.5) % 1,
  })),
);

/** Where each connection's packets start in PACKETS, and how many it has. */
const PACKET_START = EDGES.map((_, i) => PACKETS.findIndex((packet) => packet.edge === i));
const PACKET_COUNT = EDGES.map((_, i) => PACKETS.filter((packet) => packet.edge === i).length);

const FLOW_COLOR: Record<Flow, string> = { request: "var(--color-acc)", event: "var(--color-acc-2)", ai: "var(--color-warm)" };
const GROUP_COLOR: Record<Group, string> = {
  channel: "var(--color-acc)",
  entry: "var(--color-acc)",
  service: "var(--color-acc)",
  ai: "var(--color-warm)",
  data: "var(--color-acc-2)",
  integration: "var(--color-ink)",
};

const SAMPLES = 48;

export function ArchitectureMap({ nodes, labels }: { nodes: MapNode[]; labels: Labels }) {
  const [active, setActive] = useState<MapNodeId>(nodes[0].id);
  const wrap = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(SVGGElement | null)[]>([]);
  const clock = useRef(0);
  const holdUntil = useRef(-1);
  const gridId = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const reduce = reducedMotion();
    const order = nodes.map((node) => node.id);

    // Sample every connection once, so the frame loop only interpolates numbers.
    const samples = PATHS.map((_, i) => {
      const out = new Float32Array((SAMPLES + 1) * 2);
      const path = paths.current[i];
      if (!path) return out;
      const length = path.getTotalLength();
      for (let k = 0; k <= SAMPLES; k++) {
        const p = path.getPointAtLength((length * k) / SAMPLES);
        out[k * 2] = p.x;
        out[k * 2 + 1] = p.y;
      }
      return out;
    });

    let visible = false;
    let shown = -1;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(el);

    const off = onFrame((time) => {
      clock.current = time;
      if (!visible || document.hidden || reduce) return;
      if (time > holdUntil.current) {
        const step = Math.floor(time / CYCLE) % order.length;
        if (step !== shown) {
          shown = step;
          setActive(order[step]);
        }
      } else shown = -1;
      for (let j = 0; j < PACKETS.length; j++) {
        const dot = dots.current[j];
        if (!dot) continue;
        const packet = PACKETS[j];
        const t = (time / packet.dur + packet.phase) % 1;
        const s = samples[packet.edge];
        const f = t * SAMPLES;
        const k = Math.floor(f);
        const r = f - k;
        const x = s[k * 2] + (s[k * 2 + 2] - s[k * 2]) * r;
        const y = s[k * 2 + 1] + (s[k * 2 + 3] - s[k * 2 + 1]) * r;
        dot.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        dot.style.opacity = Math.sin(Math.PI * t).toFixed(2);
      }
    });
    return () => {
      off();
      io.disconnect();
    };
  }, [nodes]);

  const pick = (id: MapNodeId) => {
    holdUntil.current = clock.current + HOLD;
    setActive(id);
  };

  const neighbors = new Set<MapNodeId>();
  for (const edge of EDGES) {
    if (edge.from === active) neighbors.add(edge.to);
    if (edge.to === active) neighbors.add(edge.from);
  }
  const current = nodes.find((node) => node.id === active) ?? nodes[0];
  const group = NODE[current.id].group;

  return (
    <div ref={wrap}>
      <div className="relative overflow-hidden rounded-[22px] border border-line-2 bg-[rgb(7_13_10/0.72)] shadow-[0_40px_120px_-60px_rgb(185_255_75/0.45)]">
        <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="block h-auto w-full" role="group" aria-label={labels.title}>
          <defs>
            <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgb(190 255 215 / 0.08)" />
            </pattern>
          </defs>
          <rect width={VIEW.w} height={VIEW.h} fill={`url(#${gridId})`} />

          {EDGES.map((edge, i) => {
            const on = edge.from === active || edge.to === active;
            const count = PACKET_COUNT[i];
            const first = PACKET_START[i];
            return (
              <g key={`${edge.from}-${edge.to}`} className={cn("transition-opacity duration-500", on ? "opacity-100" : "opacity-50")}>
                <path
                  ref={(node) => {
                    paths.current[i] = node;
                  }}
                  d={PATHS[i]}
                  fill="none"
                  stroke={FLOW_COLOR[edge.flow]}
                  strokeOpacity={on ? 0.8 : 0.3}
                  strokeWidth={on ? 1.6 : 1}
                  strokeDasharray={edge.flow === "event" ? "3 5" : undefined}
                />
                {Array.from({ length: count }, (_, k) => (
                  <g
                    key={k}
                    ref={(node) => {
                      dots.current[first + k] = node;
                    }}
                    className="motion-reduce:hidden"
                    style={{ opacity: 0 }}
                  >
                    <circle r={on ? 8 : 6} fill={FLOW_COLOR[edge.flow]} opacity={0.16} />
                    <circle r={on ? 3 : 2.4} fill={FLOW_COLOR[edge.flow]} />
                  </g>
                ))}
              </g>
            );
          })}

          {nodes.map((node) => {
            const { x, y, group: g } = NODE[node.id];
            const isActive = node.id === active;
            const isNear = neighbors.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${x - W / 2} ${y - H / 2})`}
                role="button"
                tabIndex={0}
                aria-label={`${node.name}: ${node.desc}`}
                aria-pressed={isActive}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") pick(node.id);
                }}
                onClick={() => pick(node.id)}
                onFocus={() => pick(node.id)}
                className="group/node cursor-pointer outline-none"
              >
                <rect
                  width={W}
                  height={H}
                  rx={11}
                  strokeWidth={isActive ? 1.6 : 1}
                  className={cn(
                    "transition-[fill,stroke] duration-300 group-focus-visible/node:stroke-acc",
                    isActive ? "fill-[rgb(185_255_75/0.12)] stroke-acc" : isNear ? "fill-bg-2 stroke-acc/45" : "fill-bg-2 stroke-line-2",
                  )}
                />
                <circle cx={18} cy={H / 2} r={isActive ? 4.5 : 3.5} fill={GROUP_COLOR[g]} opacity={isActive || isNear ? 1 : 0.6} />
                <text
                  x={30}
                  y={H / 2}
                  dominantBaseline="central"
                  className={cn("font-mono text-[13px] max-sm:hidden", isActive ? "fill-ink" : isNear ? "fill-ink/80" : "fill-mute")}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 grid min-h-[116px] grid-cols-1 gap-1.5 rounded-[18px] border border-line bg-bg-2/60 px-5 py-4 sm:min-h-[100px]">
        <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase" style={{ color: GROUP_COLOR[group] }}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: GROUP_COLOR[group] }} />
          {labels.groups[group]}
        </p>
        <p className="font-display text-[17px] leading-tight font-semibold tracking-[-0.01em]">{current.name}</p>
        <p className="text-[14.5px] leading-snug text-mute">{current.desc}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 font-mono text-[10.5px] tracking-[0.08em] text-dim">
        <span className="flex items-center gap-3.5">
          {(Object.keys(FLOW_COLOR) as Flow[]).map((flow) => (
            <span key={flow} className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: FLOW_COLOR[flow] }} />
              {labels.legend[flow]}
            </span>
          ))}
        </span>
        <span>
          {labels.caption} <span className="max-sm:hidden">· {labels.hint}</span>
        </span>
      </div>
    </div>
  );
}
