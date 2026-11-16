import { useId } from "react";
import { cn } from "@/lib/cn";
import { MarkSvg } from "@/components/ui/logo-mark";

/** The mark alone: light arms, gradient core. Sized by the caller (default 26px). */
export function LogoMark({ className, size = 26 }: { className?: string; size?: number }) {
  return <MarkSvg size={size} gradientId={`mh-core-${useId()}`} className={cn("text-ink", className)} />;
}

/** MatsuHub logo: the Pinwheel mark plus the wordmark, "hub" in the lime-to-mint gradient. */
export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-display text-[15px] font-semibold", className)}>
      <LogoMark />
      {wordmark && (
        <span>
          matsu<span className="bg-linear-to-r from-acc to-acc-2 bg-clip-text text-transparent">hub</span>
        </span>
      )}
    </span>
  );
}
