import { cn } from "@/lib/cn";
import { dict, type Lang } from "@/lib/i18n";
import { clamp, easeOutCubic, seg } from "@/lib/math";
import { typed } from "../timeline";

/** Who speaks and when; the words come from the dictionary (process.discovery.chat), in order. */
const CHAT = [
  { who: "client", at: 0.5 },
  { who: "us", at: 1.6 },
  { who: "client", at: 2.7 },
  { who: "us", at: 3.8 },
] as const;

/** When each brief row writes itself (process.discovery.rows). */
const BRIEF = [
  { a: 2.2, b: 3.4 },
  { a: 3.4, b: 4.5 },
  { a: 4.5, b: 6.0 },
] as const;

function Dots() {
  return (
    <span className="inline-flex gap-[3px] py-1">
      {[0, 1, 2].map((i) => (
        <i key={i} className="h-[5px] w-[5px] animate-blink rounded-full bg-current motion-reduce:animate-none" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  );
}

/** A short conversation that turns into a one-page brief writing itself. */
export function Discovery({ t, lang = "pt" }: { t: number; lang?: Lang }) {
  const d = dict(lang).process.discovery;
  const card = easeOutCubic(seg(t, 1.2, 2.0));
  const stamp = easeOutCubic(seg(t, 6.2, 6.8));
  const writing = BRIEF.findIndex((r) => t >= r.a && t < r.b);

  return (
    <div className="absolute inset-0 grid grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] items-center gap-3 p-3.5 sm:gap-8 sm:p-8 lg:p-10">
      {/* conversation */}
      <div
        className="flex h-full flex-col justify-end gap-2 overflow-hidden pt-6 [mask-image:linear-gradient(transparent,#000_14%)] sm:h-auto sm:justify-center sm:gap-2.5 sm:overflow-visible sm:pt-0 sm:[mask-image:none]"
        aria-hidden
      >
        <p className="mb-0.5 hidden items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-dim uppercase sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-acc-2" /> {d.conversation}
        </p>
        {CHAT.map((m, i) => {
          const typing = t >= m.at - 0.55 && t < m.at;
          const p = easeOutCubic(seg(t, m.at, m.at + 0.35));
          if (!typing && p <= 0) return null;
          const us = m.who === "us";
          return (
            <div key={i} className={cn("flex shrink-0", us ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[92%] rounded-[14px] px-2.5 py-1.5 text-[11px] leading-snug sm:px-3.5 sm:py-2 sm:text-[13px]",
                  us
                    ? "rounded-bl-[4px] border border-acc/25 bg-acc/[0.08] text-ink"
                    : "rounded-br-[4px] border border-line-2 bg-white/[0.06] text-ink/90",
                )}
                style={typing ? undefined : { opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}
              >
                {typing ? (
                  <span className={us ? "text-acc" : "text-mute"}>
                    <Dots />
                  </span>
                ) : (
                  <>
                    <b className={cn("mb-0.5 block font-mono text-[8.5px] font-medium tracking-[0.1em] uppercase sm:text-[9px]", us ? "text-acc" : "text-mute")}>
                      {us ? d.us : d.them}
                    </b>
                    {d.chat[i]}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* brief writing itself */}
      <div
        aria-hidden
        className="relative rounded-[14px] border border-line-2 bg-[linear-gradient(180deg,rgb(255_255_255/0.07),rgb(255_255_255/0.02))] p-3 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] sm:p-5"
        style={{ opacity: card, transform: `translateY(${(1 - card) * 14}px) rotate(${(1 - card) * 2}deg)` }}
      >
        <div className="flex items-center justify-between border-b border-line pb-2 sm:pb-3">
          <p className="font-display text-[12px] font-semibold tracking-[-0.01em] sm:text-[15px]">{d.brief}</p>
          <span className="font-mono text-[9px] tracking-[0.1em] text-dim uppercase sm:text-[10px]">{d.onePage}</span>
        </div>
        <dl className="mt-2 flex flex-col gap-2 sm:mt-3 sm:gap-3">
          {BRIEF.map((r, i) => {
            const p = seg(t, r.a, r.b);
            const row = d.rows[i];
            return (
              <div key={i} className="min-h-[3.4em]">
                <dt className={cn("font-mono text-[8.5px] tracking-[0.12em] uppercase sm:text-[10px]", p > 0 ? "text-acc" : "text-dim")}>{row.k}</dt>
                <dd className="mt-0.5 text-[10.5px] leading-snug text-ink sm:text-[13px]">
                  {typed(row.v, p)}
                  {writing === i && <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] bg-acc" />}
                  {p <= 0 && <span className="block h-[0.55em] w-[70%] translate-y-1 rounded-full bg-white/[0.06]" />}
                </dd>
              </div>
            );
          })}
        </dl>
        <div
          className="absolute -right-2 -bottom-3 flex items-center gap-1.5 rounded-full border border-acc/50 bg-[#0b1408] px-2.5 py-1 font-mono text-[9.5px] text-acc shadow-[0_0_24px_-4px_rgb(185_255_75/0.6)] sm:-right-3 sm:text-[10.5px]"
          style={{ opacity: stamp, transform: `scale(${1.4 - 0.4 * stamp}) rotate(-4deg)` }}
        >
          {d.ready}
        </div>
      </div>

      {/* flow from talk to page */}
      <svg aria-hidden className="pointer-events-none absolute top-1/2 left-[47%] hidden h-6 w-10 -translate-x-1/2 -translate-y-1/2 sm:block" viewBox="0 0 40 24" style={{ opacity: clamp(card) }}>
        <path d="M2 12h30m-6-6 6 6-6 6" fill="none" stroke="var(--color-acc)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 4" />
      </svg>
    </div>
  );
}
