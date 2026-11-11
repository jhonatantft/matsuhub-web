import { AURORA, AURORA_NAV } from "@/content/aurora";
import { cn } from "@/lib/cn";

/**
 * Brand pieces of the fictional "Aurora" site. Quiet luxury: serif wordmark, hairlines, air.
 * They size themselves with container queries (`@xl:` = the box is ≥ 576 px wide), so they
 * work inside the homepage's small browser window and on a full page alike — the nearest
 * ancestor with `@container` decides.
 */

/** Sunrise-over-the-sea mark and the wordmark. */
export function AuroraLogo({ className, place = true }: { className?: string; place?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-au-ink @xl:gap-3", className)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
        <rect x="0.5" y="0.5" width="23" height="23" stroke="var(--color-au-gold)" strokeOpacity="0.7" />
        <path d="M6 14.5a6 6 0 0 1 12 0" stroke="var(--color-au-gold)" strokeWidth="1.1" />
        <path d="M4 14.5h16M7 17.5h10" stroke="var(--color-au-ink)" strokeOpacity="0.85" strokeWidth="1.1" />
      </svg>
      <span className="font-aurora text-[13px] leading-none tracking-[0.34em] uppercase @xl:text-[14px]">
        {AURORA.short}
      </span>
      {place && (
        <span className="hidden border-l border-au-line pl-3 text-[9px] leading-none font-medium tracking-[0.26em] text-au-mute uppercase @2xl:inline">
          {AURORA.location}
        </span>
      )}
    </span>
  );
}

/**
 * The site's top bar as a still: logo, three nav labels and the "Agendar visita" pill.
 * Purely presentational (no links) — the homepage showcase uses it to make the window read
 * as a real site. The full demo page brings its own navigation.
 */
export function AuroraTopBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 bg-gradient-to-b from-au-bg/75 via-au-bg/30 to-transparent px-4 pt-3.5 pb-8 @xl:px-6 @xl:pt-5",
        className,
      )}
    >
      <AuroraLogo />
      <span className="flex items-center gap-5 text-[9.5px] leading-none font-medium tracking-[0.24em] text-au-ink/85 uppercase">
        {AURORA_NAV.map((item) => (
          <span key={item} className="hidden @2xl:inline">
            {item}
          </span>
        ))}
        <span className="hidden bg-au-ink px-3.5 py-2.5 text-au-bg @xl:inline">Agendar visita</span>
        <span aria-hidden className="grid gap-[5px] @xl:hidden">
          <i className="block h-px w-5 bg-au-ink" />
          <i className="block h-px w-5 bg-au-ink" />
        </span>
      </span>
    </div>
  );
}

/** Small-caps line used above titles ("18º andar · Residência A"). */
export function AuroraEyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("block text-[9.5px] leading-none font-semibold tracking-[0.26em] text-au-gold uppercase", className)}>
      {children}
    </span>
  );
}
