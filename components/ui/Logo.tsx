import { cn } from "@/lib/cn";

/** MatsuHub mark (placeholder): a hub node inside a pine-shaped triangle, plus the wordmark. */
export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-display text-[15px] font-semibold", className)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3 3 20h18L12 3Zm0 11-9 6m9-6 9 6m-9-6V3" stroke="var(--color-acc)" strokeWidth="1.5" />
        <circle cx="12" cy="14" r="2.2" fill="var(--color-acc)" />
      </svg>
      {wordmark && (
        <span>
          matsu<span className="text-acc">hub</span>
        </span>
      )}
    </span>
  );
}
