import { cn } from "@/lib/cn";
import { dict, type Lang } from "@/lib/i18n";
import { clamp, easeOutCubic, seg } from "@/lib/math";
import { BrowserFrame } from "../BrowserFrame";
import { MiniPage } from "../MiniPage";

const SPARK = [18, 22, 19, 26, 24, 30, 27, 33, 31, 38, 35, 41, 44, 40, 47, 52];
const SPARK_D = SPARK.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (SPARK.length - 1)) * 100} ${60 - v}`).join(" ");

/** Changelog versions; their descriptions are process.evolve.log / .next in the dictionary. */
const LOG = ["v1.4", "v1.5"] as const;
const NEW = "v1.6";

/** The product live: a small monitoring panel and one improvement shipping after launch. */
export function Evolve({ t, lang = "pt" }: { t: number; lang?: Lang }) {
  const d = dict(lang).process.evolve;
  const enter = easeOutCubic(seg(t, 0, 0.6));
  const panel = easeOutCubic(seg(t, 0.4, 1.1));
  const spark = seg(t, 0.6, 3.4);
  const talks = 37 + Math.floor(seg(t, 0.8, 8.4) * 15);
  const ship = easeOutCubic(seg(t, 4.4, 5.0));
  const replies = seg(t, 5.2, 6.0);
  const glow = replies > 0 ? 1 - seg(t, 6.0, 7.6) : 0;

  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col items-center justify-center p-3.5 pt-9 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-0 md:p-8 lg:px-10"
    >
      <div className="relative w-full max-w-[250px] self-start md:max-w-none md:self-auto" style={{ opacity: enter, transform: `translateY(${(1 - enter) * 12}px)` }}>
        <span className="absolute -top-7 left-0 z-30 flex items-center gap-1.5 rounded-full border border-acc/50 bg-[#0b1408] px-2 py-0.5 font-mono text-[9.5px] tracking-[0.08em] text-acc uppercase">
          <i className="h-1.5 w-1.5 animate-blink rounded-full bg-acc motion-reduce:animate-none" /> {d.live}
        </span>
        <BrowserFrame
          url={d.url}
          flash={ship > 0 ? 1 - seg(t, 4.6, 5.8) : 0}
        >
          <MiniPage lang={lang} s={{ wipe: 1, widget: 1, cards: 1, cta: 1, whats: 1, replies }}>
            {glow > 0 && (
              <div
                className="pointer-events-none absolute rounded-[2cqw] border border-acc shadow-[0_0_24px_rgb(185_255_75/0.6)]"
                style={{ right: "12%", bottom: "10%", width: "36%", height: "24%", opacity: glow }}
              />
            )}
          </MiniPage>
        </BrowserFrame>
      </div>

      <div
        className="relative z-10 w-full overflow-hidden rounded-[14px] border border-line-2 bg-[#08100c]/95 shadow-[0_30px_70px_-30px_rgb(0_0_0/0.95),0_0_50px_-20px_rgb(62_242_196/0.35)] backdrop-blur-md -mt-10 ml-auto max-w-[300px] md:mt-0 md:-ml-6 md:max-w-none"
        style={{ opacity: panel, transform: `translateY(${(1 - panel) * 14}px)` }}
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-2 md:px-4">
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-mute uppercase md:text-[10px]">{d.panel}</p>
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-acc md:text-[10px]">
            <i className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)]" /> {d.online}
          </span>
        </div>

        <div className="grid grid-cols-3 border-b border-line md:grid-cols-1">
          {/* uptime */}
          <div className="border-r border-line px-3 py-2 md:border-r-0 md:border-b md:px-4 md:py-2.5">
            <p className="font-mono text-[8.5px] tracking-[0.12em] text-dim uppercase md:text-[9.5px]">{d.uptime}</p>
            <div className="mt-1.5 flex h-4 items-end gap-[2px]">
              {Array.from({ length: 24 }, (_, i) => (
                <i
                  key={i}
                  className={cn("h-full flex-1 rounded-[1px] bg-acc/70", i >= 12 && "hidden md:block", i === 23 && "animate-blink motion-reduce:animate-none")}
                  style={{ opacity: clamp(panel * 1.4 - i * 0.02) }}
                />
              ))}
            </div>
          </div>
          {/* visits */}
          <div className="border-r border-line px-3 py-2 md:border-r-0 md:border-b md:px-4 md:py-2.5">
            <p className="font-mono text-[8.5px] tracking-[0.12em] text-dim uppercase md:text-[9.5px]">{d.visits}</p>
            <svg viewBox="0 0 100 46" preserveAspectRatio="none" className="mt-1 h-5 w-full overflow-visible md:h-7">
              <path d={`${SPARK_D} L100 46 L0 46Z`} fill="rgb(62 242 196 / 0.12)" style={{ opacity: spark }} />
              <path
                d={SPARK_D}
                fill="none"
                stroke="var(--color-acc-2)"
                strokeWidth="1.6"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - spark}
              />
            </svg>
          </div>
          {/* agent conversations */}
          <div className="px-3 py-2 md:px-4 md:py-2.5">
            <p className="font-mono text-[8.5px] tracking-[0.12em] text-dim uppercase md:text-[9.5px]"><span className="md:hidden">{d.chatsShort}</span>
              <span className="hidden md:inline">{d.chats}</span>
            </p>
            <p className="mt-1 flex items-baseline gap-1.5 font-display text-[17px] leading-none font-semibold text-ink tabular-nums md:text-[22px]">
              <span key={talks} className="pr-tick inline-block">
                {talks}
              </span>
              <span className="font-mono text-[9px] font-normal text-acc-2">{d.today}</span>
            </p>
          </div>
        </div>

        {/* changelog */}
        <div className="px-3 py-2 md:px-4 md:py-3">
          <p className="font-mono text-[8.5px] tracking-[0.12em] text-dim uppercase md:text-[9.5px]">{d.shipped}</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            <li
              className="flex items-center gap-2 rounded-[8px] border border-acc/40 bg-acc/[0.07] px-2 py-1 text-[11px] text-ink md:text-[12px]"
              style={{ opacity: ship, transform: `translateY(${(1 - ship) * -8}px)` }}
            >
              <span className="font-mono text-[10px] text-acc">{NEW}</span>
              <span className="min-w-0 flex-1 truncate">{d.next}</span>
              <span className="shrink-0 rounded-full bg-acc px-1.5 py-px font-mono text-[9px] font-semibold text-[#061006]">{d.online}</span>
            </li>
            {LOG.map((v, i) => ({ v, t: d.log[i] }))
              .reverse()
              .map((l) => (
              <li
                key={l.v}
                className={cn("flex items-center gap-2 px-2 py-0.5 text-[11px] text-mute md:text-[12px]", "hidden md:flex")}
                style={{ transform: `translateY(${(ship - 1) * 26}px)` }}
              >
                <span className="font-mono text-[10px] text-dim">{l.v}</span>
                <span className="truncate">{l.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
