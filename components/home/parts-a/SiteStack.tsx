"use client";

import { useEffect, useRef } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { startLive } from "./live";

const CSS = `
.sa-ss{position:absolute;inset:0;display:grid;place-items:center;perspective:900px;perspective-origin:50% 30%}
.sa-ss-obj{--gap:22px;position:relative;width:200px;height:140px;transform-style:preserve-3d;transform:rotateX(58deg) rotateZ(-32deg)}
.sa-ss-l{position:absolute;inset:0;border-radius:10px;transform-style:preserve-3d;backface-visibility:visible}
.sa-ss-l[data-i="0"]{transform:translateZ(calc(var(--gap)*-1));border:1px solid rgb(62 242 196/.4);
  background:linear-gradient(rgb(62 242 196/.16) 1px,transparent 1px) 0 0/20px 20px,linear-gradient(90deg,rgb(62 242 196/.16) 1px,transparent 1px) 0 0/20px 20px,rgb(6 22 18/.75);
  box-shadow:0 0 50px rgb(62 242 196/.18)}
.sa-ss-l[data-i="1"]{transform:translateZ(0);border:1px solid rgb(190 255 215/.32);background:rgb(10 18 14/.92);padding:10px;
  display:grid;grid-template-rows:6px 46px 1fr;gap:8px}
.sa-ss-l[data-i="2"]{transform:translateZ(var(--gap));border:1px solid rgb(185 255 75/.55);background:rgb(185 255 75/.035);
  box-shadow:0 0 40px rgb(185 255 75/.12) inset}
.sa-ss-edge{position:absolute;inset:0;border-radius:10px;transform:translateZ(-3px);background:rgb(0 0 0/.6);border:1px solid rgb(190 255 215/.12)}
.sa-ss-shadow{position:absolute;inset:-10%;border-radius:50%;transform:translateZ(calc(var(--gap)*-2.4));
  background:radial-gradient(closest-side,rgb(62 242 196/.22),transparent);filter:blur(10px)}
.sa-ss-post{position:absolute;width:1px;height:100px;transform-origin:top;background:linear-gradient(rgb(185 255 75/.5),rgb(62 242 196/.15));
  transform:translateZ(calc(var(--gap)*-1)) rotateX(90deg) scaleY(var(--k,.44))}
`;

/** Sites: a web page exploded into floating 3D layers (grid, layout, interface) that slowly turns. */
export function SiteStack({ lang = "pt" }: { lang?: Lang }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const obj = root?.querySelector<HTMLElement>("[data-obj]");
    if (!root || !obj) return;
    return startLive(
      root,
      ({ clock, energy, intro }) => {
        const gap = 6 + intro * 16 + energy * 16;
        const rz = -32 + Math.sin(clock * 0.35) * 26 + clock * 9;
        const rx = 58 + Math.sin(clock * 0.5) * 4;
        const bob = Math.sin(clock * 1.1) * 4;
        obj.style.setProperty("--gap", `${gap.toFixed(2)}px`);
        obj.style.setProperty("--k", ((gap * 2) / 100).toFixed(3));
        obj.style.transform = `translateY(${bob.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateZ(${(rz % 360).toFixed(2)}deg)`;
      },
      { still: 1.2 },
    );
  }, []);

  return (
    <div ref={ref} className="sa-ss" aria-hidden>
      <style href="sa-site-stack" precedence="default">
        {CSS}
      </style>
      <div data-obj className="sa-ss-obj">
        <div className="sa-ss-shadow" />
        {(
          [
            [0, 0],
            [200, 0],
            [0, 140],
            [200, 140],
          ] as const
        ).map(([x, y]) => (
          <span key={`${x}-${y}`} className="sa-ss-post" style={{ left: x, top: y }} />
        ))}
        <div className="sa-ss-l" data-i="0" />
        <div className="sa-ss-l" data-i="1">
          <div className="sa-ss-edge" />
          <div className="flex items-center justify-between">
            <span className="h-1.5 w-8 rounded-full bg-ink/60" />
            <span className="flex gap-1.5">
              <span className="h-1 w-4 rounded-full bg-ink/25" />
              <span className="h-1 w-4 rounded-full bg-ink/25" />
              <span className="h-1 w-4 rounded-full bg-ink/25" />
            </span>
          </div>
          <div className="rounded-md bg-[linear-gradient(120deg,rgb(62_242_196/.35),rgb(185_255_75/.18)_60%,transparent)] p-2">
            <span className="block h-2 w-20 rounded-full bg-ink/80" />
            <span className="mt-1.5 block h-1 w-14 rounded-full bg-ink/35" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <span className="rounded bg-ink/10" />
            <span className="rounded bg-ink/10" />
            <span className="rounded bg-ink/10" />
          </div>
        </div>
        <div className="sa-ss-l" data-i="2">
          <span className="absolute top-[74px] left-[12px] rounded-full bg-acc px-2.5 py-1 font-mono text-[7px] font-bold text-[#061006] shadow-[0_0_24px_rgb(185_255_75/.7)]">
            {dict(lang).serviceViz.siteCta}
          </span>
          <svg className="absolute top-[84px] left-[66px] h-4 w-4" viewBox="0 0 16 16">
            <path d="M2 1l11 6-5 1.5L6 14Z" fill="#eef4ee" stroke="#050807" strokeWidth=".8" />
          </svg>
          <span className="absolute top-[14px] right-[12px] rounded-full border border-acc/60 px-1.5 py-0.5 font-mono text-[7px] text-acc">
            3D
          </span>
          <span className="absolute right-[12px] bottom-[12px] h-6 w-6 rounded-full border border-acc-2/70 shadow-[0_0_16px_rgb(62_242_196/.5)]" />
        </div>
      </div>
    </div>
  );
}
