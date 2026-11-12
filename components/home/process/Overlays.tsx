import { cn } from "@/lib/cn";
import { clamp, easeOutCubic } from "@/lib/math";

/** Client comment pinned on the page: drops in, shows the note, turns into a check when resolved. */
export function CommentPin({
  x,
  y,
  drop,
  text,
  done,
  side = "right",
  up = false,
  labels,
}: {
  x: number;
  y: number;
  drop: number;
  text: string;
  done: number;
  side?: "left" | "right";
  /** Put the note above the pin (keeps what it points at visible). */
  up?: boolean;
  /** "ajuste feito ✓" / "você · comentário" and the client's initial on the pin. */
  labels: { fixed: string; comment: string; initial: string };
}) {
  if (drop <= 0) return null;
  const d = easeOutCubic(drop);
  const bounce = drop < 1 ? Math.sin(drop * Math.PI) * 6 : 0;
  const resolved = done >= 1;
  return (
    <div className="absolute z-10" style={{ left: `${x}%`, top: `${y}%`, opacity: clamp(drop * 3) }}>
      <div style={{ transform: `translateY(${(1 - d) * -26 - bounce}px)` }}>
        <span
          className={cn(
            "absolute -top-[13px] -left-[13px] grid h-[26px] w-[26px] place-items-center rounded-full rounded-bl-none border-2 font-mono text-[10px] font-bold transition-colors duration-300",
            resolved
              ? "border-acc bg-acc text-[#061006] shadow-[0_0_0_5px_rgb(185_255_75/0.18),0_0_22px_rgb(185_255_75/0.8)]"
              : "border-white bg-[#7c5cff] text-white shadow-[0_6px_16px_-4px_rgb(124_92_255/0.8)]",
          )}
        >
          {resolved ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3.5 8.5 3 3 6-7" />
            </svg>
          ) : (
            labels.initial
          )}
        </span>
        <div
          className={cn(
            "absolute w-[min(190px,46cqw)] rounded-[10px] border px-2.5 py-2 text-left shadow-[0_14px_30px_-12px_rgb(0_0_0/0.8)] backdrop-blur-md",
            side === "right" ? "left-[18px]" : "right-[18px]",
            up ? "bottom-[18px]" : "top-[8px]",
            resolved ? "border-acc/40 bg-[#0d1712]/95" : "border-[#7c5cff]/50 bg-[#110f1d]/95",
          )}
          style={{ opacity: clamp((drop - 0.35) * 2), transform: `translateY(${(1 - clamp((drop - 0.35) * 2)) * (up ? -6 : 6)}px)` }}
        >
          <p className="flex items-center justify-between gap-2 font-mono text-[9.5px] tracking-[0.08em] uppercase">
            <span className={resolved ? "text-acc" : "text-[#b6a6ff]"}>{resolved ? labels.fixed : labels.comment}</span>
          </p>
          <p className={cn("mt-1 min-h-[2.6em] text-[12px] leading-snug", resolved ? "text-mute" : "text-ink")}>{text}</p>
        </div>
      </div>
    </div>
  );
}

/** "Nova versão publicada" toast at the bottom of a window. */
export function Toast({ show, title, sub }: { show: number; title: string; sub: string }) {
  if (show <= 0) return null;
  const s = easeOutCubic(show);
  return (
    <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
      <div
        className="flex max-w-full items-center gap-2.5 rounded-full border border-acc/40 bg-[#07100b]/95 py-1.5 pr-3.5 pl-1.5 shadow-[0_12px_30px_-10px_rgb(0_0_0/0.9),0_0_30px_-8px_rgb(185_255_75/0.5)] backdrop-blur-md"
        style={{ opacity: clamp(show * 2), transform: `translateY(${(1 - s) * 16}px) scale(${0.94 + 0.06 * s})` }}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-acc text-[#061006]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M8 13V3.5M4 7l4-4 4 4" />
          </svg>
        </span>
        <span className="min-w-0 truncate text-[12px] font-semibold text-ink">
          {title} <span className="font-mono text-[10.5px] font-normal text-acc">{sub}</span>
        </span>
      </div>
    </div>
  );
}

/** A mouse cursor that moves between two points (in % of its box) and clicks. */
export function Cursor({ from, to, move, click }: { from: [number, number]; to: [number, number]; move: number; click: number }) {
  if (move <= 0) return null;
  const m = easeOutCubic(move);
  const x = from[0] + (to[0] - from[0]) * m;
  const y = from[1] + (to[1] - from[1]) * m;
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute top-0 left-0 h-full w-full" style={{ transform: `translate(${x}%, ${y}%)` }}>
        {click > 0 && click < 1 && (
          <span
            className="absolute -top-4 -left-4 h-8 w-8 rounded-full border-2 border-acc"
            style={{ opacity: 1 - click, transform: `scale(${0.3 + click * 1.2})` }}
          />
        )}
        <svg viewBox="0 0 20 20" className="absolute -top-0.5 -left-0.5 h-5 w-5 drop-shadow-[0_2px_4px_rgb(0_0_0/0.6)]">
          <path d="M3 2 16 9.5 10 11 7.5 17Z" fill="#fff" stroke="#111" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
