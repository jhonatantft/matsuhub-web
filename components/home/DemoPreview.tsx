"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DEMOS } from "@/content/site";
import { dict, fill, type Lang } from "@/lib/i18n";

/** One demo in one language (the server resolves the copy, so only that language reaches the client). */
export type DemoCardData = Pick<(typeof DEMOS)[number], "href" | "preview"> & { segment: string; name: string; blurb: string; alt: string };
type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

const REDUCE = "(prefers-reduced-motion: reduce)";
/** Height of the browser-like strip above the recording (px). */
const STRIP = 28;
/** The cards start one after another, not in sync. */
const STAGGER_MS = 1000;

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

/**
 * One homepage demo card: the whole card is a link to the demo, its media a looping screen
 * recording of the real demo site in use, framed as a browser window. The video loads and plays
 * only while the card is near the viewport and the tab is visible; under reduced motion or data
 * saving it stays on its poster and a small "▶ ver prévia" control (outside the link) plays it.
 */
export function DemoCard({ demo, index, lang = "pt" }: { demo: DemoCardData; index: number; lang?: Lang }) {
  const d = dict(lang).demoCard;
  const name = demo.name;
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const auto = useSyncExternalStore(subscribe, canAutoplay, () => true);
  const [wanted, setWanted] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    if (!video || !root) return;
    video.muted = true;
    let onScreen = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sync = () => {
      clearTimeout(timer);
      if ((auto || wanted) && onScreen && !document.hidden) {
        const delay = auto && !startedRef.current ? index * STAGGER_MS : 0;
        timer = setTimeout(() => {
          startedRef.current = true;
          video.play().catch(() => {});
        }, delay);
      } else if (!video.paused) video.pause();
    };
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        sync();
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(root);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearTimeout(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.pause();
    };
  }, [auto, wanted, index]);

  return (
    <div ref={rootRef} className="group relative h-full">
      <Link
        href={demo.href}
        className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-panel,20px)] border border-line-2 bg-bg-2/90 xl:flex-row transition-[border-color,translate,box-shadow] duration-500 ease-soft group-hover:-translate-y-1.5 group-hover:border-acc group-hover:shadow-[0_40px_90px_-40px_rgb(185_255_75/0.55)] focus-visible:border-acc"
      >
        <span className="sr-only">{demo.alt}. </span>
        <span aria-hidden className="block bg-bg-3 xl:w-[58%] xl:shrink-0 xl:self-start xl:border-r xl:border-line">
          <span
            className="flex items-center gap-3 border-b border-line bg-[#0a0d0c] px-3"
            style={{ height: STRIP }}
          >
            <span className="flex shrink-0 gap-[5px]">
              <i className="h-[7px] w-[7px] rounded-full bg-line-2" />
              <i className="h-[7px] w-[7px] rounded-full bg-line-2" />
              <i className="h-[7px] w-[7px] rounded-full bg-line-2" />
            </span>
            <span className="min-w-0 truncate rounded-full bg-bg-3 px-2.5 py-[3px] font-mono text-[10px] leading-none text-mute">
              {demo.preview.domain}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[9.5px] leading-none font-medium tracking-[0.14em] whitespace-nowrap text-acc uppercase">
              <i className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)] motion-safe:animate-pulse" />
              {d.live}
            </span>
          </span>
          <span className="relative block aspect-[16/10] overflow-hidden">
            <video
              ref={videoRef}
              src={demo.preview.src}
              poster={demo.preview.poster}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              disableRemotePlayback
              tabIndex={-1}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-bg-2/60 via-transparent via-30% to-transparent" />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col p-4 md:p-6 xl:p-5 2xl:p-6">
          <span className="flex items-center gap-2 font-mono text-[10.5px] font-medium tracking-[0.14em] text-acc uppercase">
            <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)]" />
            {demo.segment}
          </span>
          <span className="mt-2 font-display text-[clamp(17px,1.7vw,24px)] leading-tight font-semibold tracking-[-0.02em] md:mt-3 xl:text-[clamp(17px,1.45vw,22px)]">
            {name}
          </span>
          <span className="mt-2 text-[13.5px] leading-snug text-mute md:text-[15px] md:leading-relaxed xl:text-[14px] xl:leading-snug 2xl:text-[15px]">{demo.blurb}</span>
          <span className="mt-auto pt-4 md:pt-6 xl:pt-4">
            <span className="btn btn-primary btn-sm w-full transition-shadow group-hover:shadow-[0_0_40px_2px_rgb(185_255_75/0.45)] md:py-3 md:text-[14px]">
              {d.open}
              <span aria-hidden className="transition-transform duration-300 ease-soft group-hover:translate-x-1">
                →
              </span>
            </span>
          </span>
        </span>
      </Link>
      {!auto && (
        <button
          type="button"
          onClick={() => setWanted(!playing)}
          aria-pressed={playing}
          aria-label={fill(playing ? d.pauseLabel : d.playLabel, { name })}
          style={{ top: STRIP + 12 }}
          className="absolute left-3 rounded-full border border-acc/50 bg-[#050807]/85 px-3 py-2 font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-acc uppercase backdrop-blur-md transition-[translate,border-color] duration-500 ease-soft group-hover:-translate-y-1.5 hover:border-acc focus-visible:outline-acc"
        >
          {playing ? d.pause : d.play}
        </button>
      )}
    </div>
  );
}
