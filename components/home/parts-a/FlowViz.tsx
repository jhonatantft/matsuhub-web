"use client";

import { useEffect, useRef } from "react";
import { fract, pointAt, samplePath, startLive } from "./live";

const W = 84;
const H = 34;
const NODES = [
  { id: "in", label: "Novo pedido", sub: "webhook", x: 58, y: 128 },
  { id: "crm", label: "CRM", sub: "lead.criar", x: 176, y: 128 },
  { id: "pay", label: "Pagamento", sub: "pix.confirmar", x: 300, y: 68 },
  { id: "erp", label: "ERP", sub: "estoque.baixar", x: 300, y: 188 },
  { id: "out", label: "WhatsApp", sub: "cliente.avisar", x: 424, y: 128 },
];
const LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 4],
];
// When each link's signal runs (fraction of the cycle) and when each node lights up.
const RUN: [number, number][] = [
  [0.04, 0.2],
  [0.26, 0.44],
  [0.26, 0.44],
  [0.5, 0.68],
  [0.5, 0.68],
];
const ARRIVE = [0.04, 0.2, 0.44, 0.44, 0.68];

const link = ([a, b]: [number, number]) => {
  const A = NODES[a];
  const B = NODES[b];
  const x1 = A.x + W / 2;
  const x2 = B.x - W / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1} ${A.y} C${mx} ${A.y} ${mx} ${B.y} ${x2} ${B.y}`;
};

/** Automação: an order flowing through CRM, payment and ERP until the customer is notified. */
export function FlowViz() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("[data-link]"));
    const trails = Array.from(svg.querySelectorAll<SVGPathElement>("[data-trail]"));
    const heads = Array.from(svg.querySelectorAll<SVGGElement>("[data-head]"));
    const nodes = Array.from(svg.querySelectorAll<SVGGElement>("[data-node]"));
    const log = svg.querySelector<SVGGElement>("[data-log]");
    const samples = paths.map((p) => samplePath(p, 64));
    const lens = paths.map((p) => p.getTotalLength());
    const pt = { x: 0, y: 0 };
    trails.forEach((t, i) => {
      t.style.strokeDasharray = `${lens[i] * 0.35} ${lens[i] * 2}`;
    });

    return startLive(
      svg,
      ({ clock, intro }) => {
        const ph = fract(clock * 0.24);
        for (let i = 0; i < LINKS.length; i++) {
          const [s, e] = RUN[i];
          const k = (ph - s) / (e - s);
          const on = k > 0 && k < 1.25;
          const p = Math.min(Math.max(k, 0), 1);
          const ease = p * p * (3 - 2 * p);
          pointAt(samples[i], ease, pt);
          heads[i].setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
          heads[i].style.opacity = on && k < 1 ? "1" : "0";
          trails[i].style.strokeDashoffset = String(lens[i] * 0.35 - ease * lens[i]);
          trails[i].style.opacity = on ? String(1 - Math.max(0, k - 1) * 4) : "0";
        }
        for (let n = 0; n < nodes.length; n++) {
          const since = ph - ARRIVE[n];
          const lit = since >= 0 ? Math.max(0.12, Math.exp(-since * 5)) : 0.12;
          const g = nodes[n];
          g.style.setProperty("--lit", lit.toFixed(3));
          g.style.opacity = String(Math.min(1, intro * 1.8 - n * 0.15));
        }
        if (log) {
          const t = ph - 0.7;
          log.style.opacity = String(t > 0 ? Math.min(1, t * 10) * Math.min(1, (0.98 - ph) * 10) : 0);
        }
      },
      { still: 0.72 / 0.24 },
    );
  }, []);

  return (
    <svg ref={ref} viewBox="6 34 470 216" className="h-full w-full" aria-hidden>
      <defs>
        <filter id="sa-fl-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <style>{`.sa-fl-node{--lit:.12}
.sa-fl-node .g{opacity:var(--lit)}
.sa-fl-node .b{stroke:rgb(185 255 75/calc(.18 + var(--lit)*.7))}
.sa-fl-node .d{opacity:calc(.35 + var(--lit))}`}</style>

      {LINKS.map((l, i) => (
        <path key={i} data-link d={link(l)} fill="none" stroke="rgb(190 255 215 / .16)" strokeDasharray="3 5" />
      ))}
      {LINKS.map((l, i) => (
        <path
          key={i}
          data-trail
          d={link(l)}
          fill="none"
          stroke="#b9ff4b"
          strokeWidth="1.6"
          strokeLinecap="round"
          style={{ opacity: 0 }}
        />
      ))}

      {NODES.map((n, i) => (
        <g key={n.id} data-node className="sa-fl-node" transform={`translate(${n.x} ${n.y})`} style={{ opacity: 0.0001 }}>
          <rect className="g" x={-W / 2 - 4} y={-H / 2 - 4} width={W + 8} height={H + 8} rx="14" fill="#b9ff4b" filter="url(#sa-fl-glow)" />
          <rect className="b" x={-W / 2} y={-H / 2} width={W} height={H} rx="10" fill="#0a130e" strokeWidth="1" />
          <circle className="d" cx={-W / 2 + 12} cy="0" r="3.2" fill={i === 4 ? "#3ef2c4" : "#b9ff4b"} />
          <text x={-W / 2 + 21} y="-2" fill="#eef4ee" fontSize="9.5" fontFamily="var(--font-sans)" fontWeight="700">
            {n.label}
          </text>
          <text x={-W / 2 + 21} y="9" fill="#5b6760" fontSize="7" fontFamily="var(--font-mono)">
            {n.sub}
          </text>
        </g>
      ))}

      {LINKS.map((l, i) => (
        <g key={i} data-head style={{ opacity: 0 }}>
          <circle r="9" fill="#b9ff4b" opacity=".3" filter="url(#sa-fl-glow)" />
          <circle r="3" fill="#f4ffe0" />
        </g>
      ))}

      <g data-log style={{ opacity: 0 }} transform="translate(241 236)">
        <rect x="-96" y="-11" width="192" height="20" rx="10" fill="rgb(185 255 75 / .1)" stroke="rgb(185 255 75 / .4)" />
        <text x="0" y="3" textAnchor="middle" fill="#b9ff4b" fontSize="8.5" fontFamily="var(--font-mono)">
          ✓ pedido sincronizado em 4 sistemas
        </text>
      </g>
    </svg>
  );
}
