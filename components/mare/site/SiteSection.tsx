import { cn } from "@/lib/cn";

/** Outer box of every Maré content section: rhythm, gutter, anchor offset under the fixed bars. */
export function SiteSection({
  id,
  className,
  inner,
  children,
}: {
  id?: string;
  className?: string;
  inner?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("relative scroll-mt-[calc(var(--demo-bar-h,0px)+60px)] px-[var(--pad)] py-[clamp(88px,10vw,150px)]", className)}>
      <div className={cn("mx-auto w-full max-w-[1320px]", inner)}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-center gap-3 text-[10.5px] font-semibold tracking-[0.3em] text-ma-ember uppercase", className)}>
      <i aria-hidden className="h-px w-8 bg-ma-ember/70" />
      {children}
    </span>
  );
}

/** Eyebrow + Cormorant title + lead. */
export function SiteHeading({
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
    <header className={cn("max-w-[640px]", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className="mt-6 font-mare text-[clamp(40px,5vw,72px)] leading-[0.98] font-light tracking-[-0.01em] text-ma-ink text-balance [&_em]:text-ma-ember [&_em]:italic"
      >
        {title}
      </h2>
      {lead && <p className="mt-6 max-w-[520px] text-[15.5px] leading-relaxed text-ma-mute">{lead}</p>}
    </header>
  );
}

/** "MARÉ" wordmark with a small tide line. */
export function MareWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-ma-ink", className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden className="shrink-0">
        <circle cx="11" cy="9" r="4.2" stroke="var(--color-ma-ember)" strokeWidth="1.1" />
        <path d="M2 15.5c2.2-1.6 4.3-1.6 6.5 0s4.3 1.6 6.5 0 4.3-1.6 5 0" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.1" />
        <path d="M4 19c1.8-1.1 3.6-1.1 5.4 0s3.6 1.1 5.4 0" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.1" />
      </svg>
      <span className="font-mare text-[19px] leading-none font-medium tracking-[0.38em]">MARÉ</span>
    </span>
  );
}
