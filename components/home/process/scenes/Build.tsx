import { PROCESS } from "@/content/site";
import { cn } from "@/lib/cn";
import { dict, fill, t as tr, type Lang } from "@/lib/i18n";
import { easeInOutCubic, seg } from "@/lib/math";
import { BrowserFrame } from "../BrowserFrame";
import { MiniPage, SPOTS } from "../MiniPage";
import { CommentPin, Toast } from "../Overlays";
import { CYCLE, FIX, LOOP_AT, loopStep, typed } from "../timeline";

/** Where the client's two comments land; their words are process.build.notes in the dictionary. */
const NOTES = [
  { spot: SPOTS.cta, side: "right", up: true },
  { spot: SPOTS.nav, side: "left", up: false },
] as const;
/** Steps where the client takes part. */
const CLIENT = new Set([1, 2]);

/** The state of the whole loop at time t (0..16): two cycles of construir → mostrar → ouvir → ajustar. */
function derive(t: number) {
  const k = t < CYCLE ? 0 : 1;
  const local = t - k * CYCLE;
  const { step, p } = loopStep(local);
  const published = [FIX.publish, CYCLE + FIX.publish];
  const shown = [LOOP_AT[1], CYCLE + LOOP_AT[1]];
  let version = 1;
  let changedAt = -1;
  for (let i = 0; i < 2; i++) {
    if (t >= shown[i]) [version, changedAt] = [2 + 2 * i, shown[i]];
    if (t >= published[i]) [version, changedAt] = [3 + 2 * i, published[i]];
  }
  const cycle = 1 + published.filter((x) => t >= x).length;
  const toast =
    t < CYCLE + LOOP_AT[1]
      ? seg(t, published[0], published[0] + 0.4) * (1 - seg(t, CYCLE + 1.1, CYCLE + 1.5))
      : seg(t, published[1], published[1] + 0.4);
  const toastVersion = t >= published[1] ? 5 : 3;
  return {
    k,
    local,
    step,
    p,
    version,
    flash: changedAt >= 0 ? 1 - seg(t, changedAt, changedAt + 1.1) : 0,
    cycle,
    toast,
    toastVersion,
    page: {
      wipe: 1,
      widget: k === 0 ? seg(local, 0.3, 1.5) : 1,
      cards: k === 0 ? 0 : seg(local, 0.3, 1.6),
      cta: k === 0 ? seg(local, FIX.start, FIX.end) : 1,
      whats: k === 1 ? seg(local, FIX.start, FIX.end) : 0,
      replies: 0,
    },
    build: step === 0 ? seg(local, 0.1, LOOP_AT[1] - 0.1) : 0,
  };
}

/** Pulse angle (deg, clockwise from top): each step runs from its node to the next. */
const angleOf = (step: number, p: number) => (step + easeInOutCubic(p)) * 90;

function Ring({ step, p, cycle, lang }: { step: number; p: number; cycle: number; lang: Lang }) {
  const d = dict(lang).process;
  const a = angleOf(step, p);
  const r = 41;
  const rad = ((a - 90) * Math.PI) / 180;
  const px = 50 + r * Math.cos(rad);
  const py = 50 + r * Math.sin(rad);
  const circ = 2 * Math.PI * r;
  const nodes = [
    [50, 9],
    [91, 50],
    [50, 91],
    [9, 50],
  ];
  return (
    <div className="relative aspect-square w-full max-w-[250px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="pr-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-acc)" />
            <stop offset="1" stopColor="var(--color-acc-2)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line-2)" strokeWidth="0.6" />
        <circle cx="50" cy="50" r={r + 5} fill="none" stroke="var(--color-line)" strokeWidth="0.3" strokeDasharray="0.6 1.6" />
        {/* trail: from the current step's node to the pulse */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#pr-arc)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray={`${(circ * (a - step * 90 + 1)) / 360} ${circ}`}
          transform={`rotate(${step * 90 - 90} 50 50)`}
          style={{ filter: "drop-shadow(0 0 2px rgb(185 255 75 / .8))" }}
        />
        {/* direction chevrons between nodes */}
        {[45, 135, 225, 315].map((d) => (
          <path key={d} d="M-1.6 -2 L1.2 0 L-1.6 2" fill="none" stroke="var(--color-mute)" strokeWidth="0.6" strokeLinecap="round" transform={`rotate(${d - 90} 50 50) translate(${50 + r} 50) rotate(90)`} />
        ))}
        <circle cx={px} cy={py} r="5" fill="rgb(185 255 75 / 0.18)" />
        <circle cx={px} cy={py} r="2" fill="#f4ffe0" style={{ filter: "drop-shadow(0 0 3px var(--color-acc))" }} />
      </svg>

      {tr(PROCESS.loop, lang).map((label, i) => {
        const on = i === step;
        return (
          <span
            key={label}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-300",
              on ? "border-acc bg-acc text-[#061006] shadow-[0_0_24px_-2px_rgb(185_255_75/0.7)]" : "border-line-2 bg-bg text-mute",
            )}
            style={{ left: `${nodes[i][0]}%`, top: `${nodes[i][1]}%` }}
          >
            {label}
            {CLIENT.has(i) && (
              <span className={cn("grid h-3.5 w-3.5 place-items-center rounded-full text-[7.5px] font-bold", on ? "bg-[#061006] text-acc" : "bg-[#7c5cff] text-white")} title={d.withYou}>
                {d.youInitial}
              </span>
            )}
          </span>
        );
      })}

      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-dim uppercase">{d.cycle}</p>
          <p key={cycle} className="pr-tick font-display text-[44px] leading-none font-semibold text-ink tabular-nums">
            {cycle}
          </p>
          <p className="mt-1 font-mono text-[10px] text-acc-2">{d.withYou}</p>
        </div>
      </div>
    </div>
  );
}

/** Mobile: the loop as a strip under the window. */
function Strip({ step, cycle, lang }: { step: number; cycle: number; lang: Lang }) {
  return (
    <div className="flex w-full items-center gap-1.5">
      <span className="flex shrink-0 items-baseline gap-1 rounded-full border border-line-2 px-2 py-1 font-mono text-[10px] text-mute">
        {dict(lang).process.cycle} <b key={cycle} className="pr-tick inline-block font-display text-[13px] text-ink">{cycle}</b>
      </span>
      <ol className="flex min-w-0 flex-1 items-center justify-between rounded-full border border-line bg-black/30 p-0.5">
        {tr(PROCESS.loop, lang).map((label, i) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-1.5 py-1 font-mono text-[9.5px] transition-colors duration-300",
              i === step ? "bg-acc text-[#061006]" : "text-mute",
            )}
          >
            {label}
          </li>
        ))}
      </ol>
      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-acc motion-safe:animate-spin-slow" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M13 8a5 5 0 1 1-1.5-3.6M13 3v2.6h-2.6" />
      </svg>
    </div>
  );
}

/** The feedback loop: comment → change → check → new version, twice, with the cycle ring around it. */
export function Build({ t, lang = "pt" }: { t: number; lang?: Lang }) {
  const copy = dict(lang).process;
  const d = derive(t);
  const note = NOTES[d.k];
  const pinOut = d.k === 0 ? 1 - seg(d.local, 7.3, 7.9) : 1;
  const resolved = d.local >= FIX.check ? 1 : 0;
  const fixing = d.step === 3 && d.local < FIX.check;

  return (
    <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3.5 md:grid md:grid-cols-[minmax(0,230px)_minmax(0,1fr)] md:gap-8 md:p-8 lg:gap-12 lg:px-12">
      <div className="hidden justify-center md:flex">
        <Ring step={d.step} p={d.p} cycle={d.cycle} lang={lang} />
      </div>

      <div className="relative w-full max-w-[560px] justify-self-center">
        <BrowserFrame
          url={`${copy.prototype.url}${d.version}`}
          flash={d.flash}
          progress={d.build}
          status={
            <span className={cn("font-mono text-[9.5px] whitespace-nowrap", d.step === 2 ? "text-[#b6a6ff]" : "text-acc")}>
              ● {d.local >= FIX.publish ? copy.build.published : copy.build.status[d.step]}
            </span>
          }
        >
          <MiniPage s={d.page} lang={lang}>
            {fixing && (
              <div
                className="pointer-events-none absolute rounded-[1.4cqw] border border-dashed border-acc shadow-[0_0_20px_rgb(185_255_75/0.5)]"
                style={
                  d.k === 0
                    ? { left: "3.5%", top: "48%", width: "30%", height: "16%" }
                    : { left: "75%", top: "2.5%", width: "22%", height: "11%" }
                }
              />
            )}
            <div style={{ opacity: pinOut }}>
              <CommentPin
                x={note.spot.x}
                y={note.spot.y}
                side={note.side}
                up={note.up}
                drop={seg(d.local, 3.1, 3.6)}
                text={typed(copy.build.notes[d.k], seg(d.local, 3.5, 4.6))}
                done={resolved}
                labels={{ fixed: copy.build.fixed, comment: copy.build.comment, initial: copy.youInitial }}
              />
            </div>
            <Toast show={d.toast} title={fill(copy.build.toast, { n: String(d.toastVersion) })} sub={copy.build.toastSub} />
          </MiniPage>
        </BrowserFrame>
      </div>

      <div className="w-full max-w-[520px] md:hidden">
        <Strip step={d.step} cycle={d.cycle} lang={lang} />
      </div>
    </div>
  );
}
