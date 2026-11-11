import { AuroraEyebrow } from "../AuroraChrome";
import { cn } from "@/lib/cn";

/** Outer box of every content section: Aurora rhythm, page gutter, anchor offset under the fixed header. */
export function SiteSection({
  id,
  className,
  inner,
  children,
}: {
  id: string;
  className?: string;
  inner?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("relative scroll-mt-[calc(var(--demo-bar-h,0px)+64px)] px-[var(--pad)] py-[clamp(88px,10vw,150px)]", className)}>
      <div className={cn("mx-auto w-full max-w-[1320px]", inner)}>{children}</div>
    </section>
  );
}

/** Eyebrow + serif title + lead, with the thin gold rule. */
export function SiteHeading({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("max-w-[640px]", className)}>
      <span className="flex items-center gap-4">
        <i aria-hidden className="h-px w-10 bg-au-gold/70" />
        <AuroraEyebrow>{eyebrow}</AuroraEyebrow>
      </span>
      <h2 className="mt-6 font-aurora text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-light tracking-[-0.01em] text-au-ink text-balance">
        {title}
      </h2>
      {lead && <p className="mt-5 max-w-[520px] text-[15.5px] leading-relaxed text-au-mute">{lead}</p>}
    </header>
  );
}
