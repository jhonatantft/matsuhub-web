"use client";

import { useEffect, useRef } from "react";
import { startLive } from "./live";

// Chart area inside the 400×250 viewBox.
const CX = 150;
const CW = 222;
const CY = 136;
const CH = 70;
const PTS = 24;
const BARS = 7;

const wave = (x: number, c: number) =>
  0.5 + 0.22 * Math.sin(x * 5.2 + c * 1.3) + 0.14 * Math.sin(x * 11 - c * 2.1) + 0.18 * (x - 0.5);

/** Web apps: an app shell whose KPIs, line chart and bars keep updating. */
export function DashboardViz() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const line = svg.querySelector<SVGPathElement>("[data-line]");
    const area = svg.querySelector<SVGPathElement>("[data-area]");
    const clip = svg.querySelector<SVGRectElement>("[data-clip]");
    const cursor = svg.querySelector<SVGGElement>("[data-cursor]");
    const tip = svg.querySelector<SVGTextElement>("[data-tip]");
    const bars = Array.from(svg.querySelectorAll<SVGRectElement>("[data-bar]"));
    const kpis = Array.from(svg.querySelectorAll<SVGRectElement>("[data-kpi]"));
    const ring = svg.querySelector<SVGCircleElement>("[data-ring]");
    const ys = new Float32Array(PTS);
    let lastTip = "";

    return startLive(svg, ({ clock, intro }) => {
      let d = "";
      for (let i = 0; i < PTS; i++) {
        const x = i / (PTS - 1);
        ys[i] = CY + CH - Math.min(0.98, Math.max(0.06, wave(x, clock))) * CH;
        d += `${i ? "L" : "M"}${(CX + x * CW).toFixed(1)} ${ys[i].toFixed(1)}`;
      }
      line?.setAttribute("d", d);
      area?.setAttribute("d", `${d}L${CX + CW} ${CY + CH}L${CX} ${CY + CH}Z`);
      clip?.setAttribute("width", String(CW * intro + 2));

      const cp = (Math.sin(clock * 0.6) * 0.5 + 0.5) * 0.8 + 0.1;
      const ci = Math.round(cp * (PTS - 1));
      cursor?.setAttribute("transform", `translate(${(CX + (ci / (PTS - 1)) * CW).toFixed(1)} ${ys[ci].toFixed(1)})`);
      if (cursor) cursor.style.opacity = String(intro);
      const v = `+${Math.round((1 - (ys[ci] - CY) / CH) * 40 + 4)}%`;
      if (tip && v !== lastTip) {
        lastTip = v;
        tip.textContent = v;
      }

      for (let b = 0; b < BARS; b++) {
        const h = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(clock * 1.4 + b * 0.9)) * (0.7 + 0.3 * Math.sin(b * 2.3));
        bars[b].style.transform = `scaleY(${(h * intro).toFixed(3)})`;
      }
      for (let k = 0; k < kpis.length; k++) {
        const f = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(clock * 0.8 + k * 2));
        kpis[k].style.transform = `scaleX(${(f * intro).toFixed(3)})`;
      }
      if (ring) ring.style.strokeDashoffset = String(100 - (62 + 18 * Math.sin(clock * 0.7)) * intro);
    });
  }, []);

  return (
    <svg ref={ref} viewBox="0 0 400 250" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="sa-db-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3ef2c4" stopOpacity=".32" />
          <stop offset="1" stopColor="#3ef2c4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sa-db-line" x1="0" x2="1">
          <stop offset="0" stopColor="#3ef2c4" />
          <stop offset="1" stopColor="#b9ff4b" />
        </linearGradient>
        <clipPath id="sa-db-clip">
          <rect data-clip x={CX - 1} y={CY - 10} width="0" height={CH + 12} />
        </clipPath>
      </defs>

      {/* window */}
      <rect x="40" y="34" width="346" height="196" rx="12" fill="#09110d" fillOpacity=".72" stroke="rgb(190 255 215 / .22)" />
      <path d="M40 58h346" stroke="rgb(190 255 215 / .14)" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={56 + i * 10} cy="46" r="2.6" fill="rgb(190 255 215 / .25)" />
      ))}
      <rect x="150" y="40" width="130" height="12" rx="6" fill="rgb(190 255 215 / .06)" />
      <text x="160" y="49" fill="#5b6760" fontSize="7" fontFamily="var(--font-mono)">
        app.seunegocio.com.br
      </text>

      {/* sidebar */}
      <path d="M118 58v172" stroke="rgb(190 255 215 / .1)" />
      <rect x="52" y="72" width="54" height="14" rx="4" fill="rgb(185 255 75 / .14)" />
      <rect x="58" y="77" width="30" height="4" rx="2" fill="#b9ff4b" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="58" y={98 + i * 18} width={22 + ((i * 13) % 20)} height="4" rx="2" fill="rgb(190 255 215 / .18)" />
      ))}
      <circle cx="68" cy="210" r="6" fill="none" stroke="rgb(190 255 215 / .25)" />
      <rect x="80" y="207" width="26" height="4" rx="2" fill="rgb(190 255 215 / .14)" />

      {/* kpis */}
      {[0, 1, 2].map((k) => (
        <g key={k} transform={`translate(${132 + k * 82} 70)`}>
          <rect width="72" height="42" rx="7" fill="rgb(190 255 215 / .035)" stroke="rgb(190 255 215 / .12)" />
          <rect x="9" y="9" width="26" height="4" rx="2" fill="rgb(190 255 215 / .22)" />
          <rect x="9" y="19" width="30" height="7" rx="2" fill="#eef4ee" opacity=".8" />
          <rect x="9" y="32" width="54" height="3" rx="1.5" fill="rgb(190 255 215 / .1)" />
          <rect
            data-kpi
            x="9"
            y="32"
            width="54"
            height="3"
            rx="1.5"
            fill={k === 1 ? "#3ef2c4" : "#b9ff4b"}
            style={{ transformBox: "fill-box", transformOrigin: "left", transform: "scaleX(.6)" }}
          />
        </g>
      ))}

      {/* line chart */}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${CX} ${CY + (CH / 3) * i + 4}h${CW}`} stroke="rgb(190 255 215 / .07)" strokeDasharray="2 4" />
      ))}
      <g clipPath="url(#sa-db-clip)">
        <path data-area fill="url(#sa-db-area)" />
        <path data-line fill="none" stroke="url(#sa-db-line)" strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      <g data-cursor style={{ opacity: 0 }}>
        <path d="M0 0V60" stroke="rgb(185 255 75 / .35)" strokeDasharray="2 3" />
        <circle r="7" fill="#b9ff4b" opacity=".2" />
        <circle r="3.2" fill="#09110d" stroke="#b9ff4b" strokeWidth="1.6" />
        <rect x="-19" y="-27" width="38" height="16" rx="8" fill="#b9ff4b" />
        <text data-tip x="0" y="-16" textAnchor="middle" fill="#061006" fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          +24%
        </text>
      </g>

      {/* bars + donut */}
      <g transform="translate(132 214)">
        {Array.from({ length: BARS }, (_, b) => (
          <rect
            key={b}
            data-bar
            x={b * 11}
            y="-26"
            width="6"
            height="26"
            rx="2"
            fill={b === 4 ? "#b9ff4b" : "rgb(62 242 196 / .55)"}
            style={{ transformBox: "fill-box", transformOrigin: "bottom", transform: "scaleY(.5)" }}
          />
        ))}
      </g>
      <g transform="translate(232 201)">
        <rect x="0" y="-8" width="40" height="4" rx="2" fill="rgb(190 255 215 / .2)" />
        <rect x="0" y="2" width="60" height="4" rx="2" fill="rgb(190 255 215 / .1)" />
        <rect x="0" y="12" width="48" height="4" rx="2" fill="rgb(190 255 215 / .1)" />
      </g>
      <g transform="translate(352 200) rotate(-90)">
        <circle r="13" fill="none" stroke="rgb(190 255 215 / .12)" strokeWidth="4" />
        <circle
          data-ring
          r="13"
          fill="none"
          stroke="#b9ff4b"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100 100"
          style={{ strokeDashoffset: 40 }}
        />
      </g>
    </svg>
  );
}
