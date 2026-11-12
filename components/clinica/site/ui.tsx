import { cn } from "@/lib/cn";

/** Shared look of the Elo site: calm, light, large readable type (Lexend for headings and UI). */

export const BTN =
  "inline-flex items-center justify-center gap-2.5 rounded-full bg-el-acc px-6 py-3.5 font-elo text-[15px] leading-none font-medium text-white transition-[background-color,opacity] duration-300 hover:bg-[#0b4642] disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2.5 rounded-full border border-el-ink/15 bg-el-bg-2 px-5 py-3.5 font-elo text-[15px] leading-none text-el-ink transition-[border-color,color] duration-300 hover:border-el-acc hover:text-el-acc";
export const LINK =
  "font-elo text-el-acc underline decoration-el-acc/35 underline-offset-[5px] transition-colors hover:decoration-el-acc";

/** Outer box of every Elo content section: rhythm, gutter, anchor offset under the fixed bars. */
export function EloSection({
  id,
  className,
  inner,
  labelledBy,
  children,
}: {
  id?: string;
  className?: string;
  inner?: string;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("relative scroll-mt-[calc(var(--demo-bar-h,0px)+64px)] px-[var(--pad)] py-[clamp(72px,9vw,128px)]", className)}
    >
      <div className={cn("mx-auto w-full max-w-[1240px]", inner)}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 font-elo text-[13px] font-medium tracking-[0.16em] text-el-acc uppercase", className)}>
      <i aria-hidden className="h-2 w-2 rounded-full bg-el-acc-2" />
      {children}
    </span>
  );
}

/** Eyebrow + Lexend title + lead. */
export function EloHeading({
  eyebrow,
  title,
  lead,
  className,
  id,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <header className={cn("max-w-[680px]", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className="mt-5 font-elo text-[clamp(32px,4.2vw,54px)] leading-[1.08] font-medium tracking-[-0.025em] text-balance text-el-ink [&_em]:text-el-acc [&_em]:not-italic"
      >
        {title}
      </h2>
      {lead && <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-el-mute">{lead}</p>}
    </header>
  );
}

/** "ELO" wordmark: two linked rings (an "elo" is a chain link) and the name. */
export function EloWordmark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", light ? "text-white" : "text-el-ink", className)}>
      <svg width="30" height="20" viewBox="0 0 30 20" fill="none" aria-hidden className="shrink-0">
        <circle cx="10" cy="10" r="7" stroke={light ? "currentColor" : "var(--color-el-acc)"} strokeWidth="2.2" />
        <circle cx="20" cy="10" r="7" stroke="var(--color-el-acc-2)" strokeWidth="2.2" />
      </svg>
      <span className="font-elo text-[19px] leading-none font-semibold tracking-[0.3em]">ELO</span>
    </span>
  );
}

/** Small round tag ("teleconsulta", "só presencial"…). */
export function Tag({ children, tone = "line", className }: { children: React.ReactNode; tone?: "line" | "acc" | "clay"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-elo text-[12.5px] leading-none whitespace-nowrap",
        tone === "line" && "border border-el-ink/12 text-el-mute",
        tone === "acc" && "bg-el-acc/[0.09] text-el-acc",
        tone === "clay" && "bg-el-acc-2/[0.16] text-[#8a4426]",
        className,
      )}
    >
      {children}
    </span>
  );
}
