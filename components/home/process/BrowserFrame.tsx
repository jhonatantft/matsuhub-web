import { cn } from "@/lib/cn";

type Props = {
  url: string;
  /** Small status on the right of the address bar. */
  status?: React.ReactNode;
  /** 0..1 build progress drawn as a thin bar under the chrome (hidden at 0 or 1). */
  progress?: number;
  /** Highlight the address (a new link was just sent). */
  flash?: number;
  className?: string;
  children: React.ReactNode;
};

/** A small browser window. The page area is a 16:10 container, so children can size with cqw / %. */
export function BrowserFrame({ url, status, progress = 0, flash = 0, className, children }: Props) {
  const building = progress > 0 && progress < 1;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[12px] border border-line-2 bg-[#0b100e] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9),0_0_0_1px_rgb(0_0_0/0.4),0_0_60px_-20px_rgb(62_242_196/0.25)]",
        className,
      )}
    >
      <div className="relative flex h-7 items-center gap-2 border-b border-line bg-[#0f1613] px-2.5">
        <span aria-hidden className="flex gap-1">
          <i className="h-[7px] w-[7px] rounded-full bg-[#ff7a6b]/70" />
          <i className="h-[7px] w-[7px] rounded-full bg-[#ffd08a]/70" />
          <i className="h-[7px] w-[7px] rounded-full bg-acc/60" />
        </span>
        <span
          className="relative flex h-[18px] min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-full border border-line bg-black/40 px-2 font-mono text-[10px] text-mute"
          style={{ borderColor: flash > 0 ? `rgb(185 255 75 / ${0.15 + 0.6 * flash})` : undefined }}
        >
          <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 shrink-0 text-acc-2" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
            <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
          </svg>
          <span className="truncate" style={{ color: flash > 0 ? `rgb(238 244 238 / ${0.6 + 0.4 * flash})` : undefined }}>
            {url}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-acc/20"
            style={{ opacity: flash * 0.8 }}
          />
        </span>
        {status && <span className="hidden shrink-0 sm:inline-flex">{status}</span>}
        <span
          aria-hidden
          className="absolute bottom-[-1px] left-0 h-[2px] w-full origin-left bg-[linear-gradient(90deg,var(--color-acc),var(--color-acc-2))] shadow-[0_0_10px_var(--color-acc)]"
          style={{ transform: `scaleX(${building ? progress : 0})`, opacity: building ? 1 : 0 }}
        />
      </div>
      <div className="@container relative aspect-[16/10] w-full overflow-hidden">{children}</div>
    </div>
  );
}
