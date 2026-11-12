"use client";

import { useEffect, useRef } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { fract, pointAt, samplePath, startLive } from "./live";

const CORE = { x: 220, y: 128 };
const TOOLS = [
  { x: 76, y: 66 },
  { x: 70, y: 196 },
  { x: 366, y: 62 },
  { x: 370, y: 194 },
];

const edge = (t: { x: number; y: number }) => {
  const mx = (CORE.x + t.x) / 2;
  return `M${CORE.x} ${CORE.y} C${mx} ${CORE.y} ${mx} ${t.y} ${t.x} ${t.y}`;
};

/** Agentes de IA: a core that dispatches packets to its tools and gets answers back. */
export function AgentGraph({ lang = "pt" }: { lang?: Lang }) {
  const ref = useRef<SVGSVGElement>(null);
  const viz = dict(lang).serviceViz;
  const calls = viz.agentCalls;
  const labels = viz.agentTools;

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const q = <T extends Element>(s: string) => Array.from(svg.querySelectorAll<T>(s));
    const paths = q<SVGPathElement>("[data-edge]");
    const flows = q<SVGPathElement>("[data-flow]");
    const packets = q<SVGGElement>("[data-packet]");
    const glows = q<SVGRectElement>("[data-glow]");
    const nodes = q<SVGGElement>("[data-tool]");
    const rings = q<SVGCircleElement>("[data-ring]");
    const spin = svg.querySelector<SVGGElement>("[data-spin]");
    const coreGlow = svg.querySelector<SVGCircleElement>("[data-core-glow]");
    const call = svg.querySelector<SVGTextElement>("[data-call]");
    const samples = paths.map((p) => samplePath(p));
    const pt = { x: 0, y: 0 };
    let lastCall = -1;

    return startLive(svg, ({ clock, energy, intro }) => {
      let coreHit = 0;
      for (let i = 0; i < TOOLS.length; i++) {
        const phase = fract(clock * 0.32 + i * 0.25);
        const out = phase < 0.5;
        const p = out ? phase * 2 : 1 - (phase - 0.5) * 2;
        const e = (p * p * (3 - 2 * p)) as number;
        pointAt(samples[i], e, pt);
        const g = packets[i];
        g.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
        g.style.opacity = String(intro);
        g.dataset.dir = out ? "out" : "in";
        const near = Math.max(0, 1 - Math.abs(phase - 0.5) * 9);
        glows[i].style.opacity = String(0.15 + near * 0.85);
        nodes[i].style.opacity = String(Math.min(1, intro * 1.6 - i * 0.12));
        coreHit = Math.max(coreHit, Math.max(0, 1 - Math.min(phase, 1 - phase) * 12));
        flows[i].style.strokeDashoffset = String((out ? -1 : 1) * clock * 26);
      }
      if (coreGlow) coreGlow.style.opacity = String(0.35 + coreHit * 0.65 * energy + 0.1);
      if (spin) spin.setAttribute("transform", `rotate(${(clock * 40) % 360} ${CORE.x} ${CORE.y})`);
      for (let r = 0; r < rings.length; r++) {
        const k = fract(clock * 0.45 + r * 0.5);
        rings[r].setAttribute("r", (24 + k * 46).toFixed(1));
        rings[r].style.opacity = String((1 - k) * 0.5 * intro);
      }
      const c = Math.floor(clock * 0.32 * 4 + 0.5) % calls.length;
      if (call && c !== lastCall) {
        lastCall = c;
        call.textContent = `> ${calls[c]}`;
      }
    });
  }, [calls]);

  return (
    <svg ref={ref} viewBox="0 0 440 250" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="sa-ag-core" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#b9ff4b" stopOpacity=".55" />
          <stop offset="1" stopColor="#b9ff4b" stopOpacity="0" />
        </radialGradient>
        <filter id="sa-ag-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {TOOLS.map((t, i) => (
        <g key={i}>
          <path data-edge d={edge(t)} fill="none" stroke="rgb(190 255 215 / .16)" strokeWidth="1" />
          <path
            data-flow
            d={edge(t)}
            fill="none"
            stroke={i % 2 ? "#3ef2c4" : "#b9ff4b"}
            strokeOpacity=".35"
            strokeWidth="1"
            strokeDasharray="2 10"
          />
        </g>
      ))}

      {[0, 1].map((r) => (
        <circle key={r} data-ring cx={CORE.x} cy={CORE.y} r="24" fill="none" stroke="#b9ff4b" strokeWidth=".8" opacity="0" />
      ))}
      <circle data-core-glow cx={CORE.x} cy={CORE.y} r="62" fill="url(#sa-ag-core)" opacity=".45" />
      <g data-spin>
        <circle cx={CORE.x} cy={CORE.y} r="34" fill="none" stroke="#3ef2c4" strokeOpacity=".55" strokeDasharray="3 7" />
        <circle cx={CORE.x} cy={CORE.y - 34} r="2.4" fill="#3ef2c4" />
      </g>
      <circle cx={CORE.x} cy={CORE.y} r="24" fill="#08120c" stroke="#b9ff4b" strokeWidth="1.2" />
      <path
        d={`M${CORE.x} ${CORE.y - 11} l9.5 5.5v11l-9.5 5.5-9.5-5.5v-11Z`}
        fill="none"
        stroke="#b9ff4b"
        strokeWidth="1.2"
      />
      <circle cx={CORE.x} cy={CORE.y} r="3.2" fill="#b9ff4b" />

      {TOOLS.map((_, i) => (
        <g key={i} data-packet className="sa-packet" style={{ opacity: 0 }}>
          <circle r="7" fill="currentColor" opacity=".25" filter="url(#sa-ag-blur)" />
          <circle r="3" fill="currentColor" />
        </g>
      ))}

      {TOOLS.map((t, i) => (
        <g key={i} data-tool style={{ opacity: 0.0001 }} transform={`translate(${t.x} ${t.y})`}>
          <rect data-glow x="-44" y="-14" width="88" height="28" rx="14" fill="#b9ff4b" opacity=".15" filter="url(#sa-ag-blur)" />
          <rect x="-44" y="-14" width="88" height="28" rx="14" fill="#0a130e" stroke="rgb(190 255 215 / .3)" />
          <circle cx="-30" cy="0" r="3" fill={i % 2 ? "#3ef2c4" : "#b9ff4b"} />
          <text x="-21" y="3.6" fill="#eef4ee" fontSize="10" fontFamily="var(--font-mono)" letterSpacing=".02em">
            {labels[i]}
          </text>
        </g>
      ))}

      <text
        data-call
        x={CORE.x}
        y="244"
        textAnchor="middle"
        fill="#8d9a92"
        fontSize="10"
        fontFamily="var(--font-mono)"
        letterSpacing=".04em"
      >
        {`> ${calls[0]}`}
      </text>
      <style>{`.sa-packet{color:#b9ff4b;transition:color .3s}.sa-packet[data-dir="in"]{color:#3ef2c4}`}</style>
    </svg>
  );
}
