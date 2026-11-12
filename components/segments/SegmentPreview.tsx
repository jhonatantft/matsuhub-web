"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

const REDUCE = "(prefers-reduced-motion: reduce)";
/** Height of the browser-like strip above the recording (px). */
const STRIP = 30;

const connection = () => (navigator as Navigator & { connection?: Connection }).connection;

/** Autoplay only without reduced motion and when the connection does not ask to save data. */
function canAutoplay() {
  if (window.matchMedia(REDUCE).matches) return false;
  const c = connection();
  return !(c?.saveData || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g");
}
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(REDUCE);
  const c = connection();
  mq.addEventListener("change", onChange);
  c?.addEventListener?.("change", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    c?.removeEventListener?.("change", onChange);
  };
}

export type SegmentPreviewProps = {
  href: string;
  domain: string;
  brand: string;
  /** null when the file is not there (yet): poster only, or the branded fallback panel. */
  video: string | null;
  poster: string | null;
  labels: { live: string; play: string; pause: string; playLabel: string; pauseLabel: string; link: string; fallback: string };
  className?: string;
};

/**
 * The demo's looping screen recording in a browser window, as a link to the demo (same logic as
 * the homepage DemoCard): it plays only while on screen and the tab is visible; under reduced
 * motion or data saving it stays on its poster with a "▶ ver prévia" control. Without a
 * recording it shows the poster, and without a poster a branded gradient panel.
 */
export function SegmentPreview({ href, domain, brand, video, poster, labels, className }: SegmentPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const auto = useSyncExternalStore(subscribe, canAutoplay, () => true);
  const [wanted, setWanted] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    el.muted = true;
    let onScreen = false;
    const sync = () => {
      if ((auto || wanted) && onScreen && !document.hidden) el.play().catch(() => {});
      else if (!el.paused) el.pause();
    };
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        sync();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(root);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.pause();
    };
  }, [auto, wanted]);

  return (
    <div ref={rootRef} className={cn("group relative", className)}>
      <Link
        href={href}
        aria-label={labels.link}
        className="relative block overflow-hidden rounded-[var(--radius-panel)] border border-line-2 bg-bg-2 shadow-[0_60px_140px_-70px_rgb(185_255_75/0.55)] transition-[border-color,translate,box-shadow] duration-500 ease-soft group-hover:-translate-y-1 group-hover:border-acc/70 focus-visible:border-acc"
      >
        <span aria-hidden className="flex items-center gap-3 border-b border-line bg-[#0a0d0c] px-3.5" style={{ height: STRIP }}>
          <span className="flex shrink-0 gap-[5px]">
            <i className="h-[7px] w-[7px] rounded-full bg-line-2" />
            <i className="h-[7px] w-[7px] rounded-full bg-line-2" />
            <i className="h-[7px] w-[7px] rounded-full bg-line-2" />
          </span>
          <span className="min-w-0 truncate rounded-full bg-bg-3 px-2.5 py-[3px] font-mono text-[10px] leading-none text-mute">{domain}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[9.5px] leading-none font-medium tracking-[0.14em] whitespace-nowrap text-acc uppercase">
            <i className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)] motion-safe:animate-pulse" />
            {labels.live}
          </span>
        </span>
        <span aria-hidden className="relative block aspect-[16/10] overflow-hidden bg-bg-3">
          {video ? (
            <video
              ref={videoRef}
              src={video}
              poster={poster ?? undefined}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              disableRemotePlayback
              tabIndex={-1}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.03]"
            />
          ) : poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- a fixed-size poster frame; next/image adds nothing here
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.03]" />
          ) : (
            <FallbackPanel brand={brand} label={labels.fallback} />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-bg/40 via-transparent via-30% to-transparent" />
        </span>
      </Link>
      {video && !auto && (
        <button
          type="button"
          onClick={() => setWanted(!playing)}
          aria-pressed={playing}
          aria-label={playing ? labels.pauseLabel : labels.playLabel}
          style={{ top: STRIP + 12 }}
          className="absolute left-3 rounded-full border border-acc/50 bg-[#050807]/85 px-3 py-2 font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-acc uppercase backdrop-blur-md transition-[translate,border-color] duration-500 ease-soft group-hover:-translate-y-1 hover:border-acc focus-visible:outline-acc"
        >
          {playing ? labels.pause : labels.play}
        </button>
      )}
    </div>
  );
}

/** Stand-in while a demo has no recording or poster yet: the brand on a holographic gradient. */
function FallbackPanel({ brand, label }: { brand: string; label: string }) {
  return (
    <span className="absolute inset-0 grid place-items-center overflow-hidden bg-[radial-gradient(70%_80%_at_70%_30%,rgb(185_255_75/0.20),transparent_60%),radial-gradient(60%_70%_at_20%_90%,rgb(62_242_196/0.18),transparent_65%),linear-gradient(160deg,#0b1310,#050807)]">
      <span className="absolute inset-0 bg-[linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:40px_40px] opacity-60 [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]" />
      <span className="relative text-center">
        <span className="block font-display text-[clamp(44px,7vw,96px)] leading-none font-extrabold tracking-[-0.05em] text-ink">{brand}</span>
        <span className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-acc uppercase">
          <i className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)]" />
          {label}
        </span>
      </span>
    </span>
  );
}
