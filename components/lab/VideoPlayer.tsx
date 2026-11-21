"use client";

import { useState } from "react";
import { youtubeThumb } from "@/content/lab/videos";

type Chapter = { t: string; s: number; title: string };

/**
 * A light YouTube player: only the thumbnail and a play button until someone clicks, then the
 * youtube-nocookie.com iframe (no YouTube script or cookie before that). Chapters, when given,
 * start the video at that point.
 */
export function VideoPlayer({
  youtubeId,
  title,
  playLabel,
  chapters,
  chaptersLabel,
  chaptersHint,
}: {
  youtubeId: string;
  title: string;
  playLabel: string;
  chapters?: readonly Chapter[];
  chaptersLabel?: string;
  chaptersHint?: string;
}) {
  // null = not started; a number = playing from that second (changing it reloads the iframe there)
  const [start, setStart] = useState<number | null>(null);
  const src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0${start ? `&start=${start}` : ""}`;

  return (
    <div>
      <div className="card relative aspect-video w-full overflow-hidden rounded-[18px] bg-black">
        {start === null ? (
          <button type="button" onClick={() => setStart(0)} className="group absolute inset-0 block h-full w-full cursor-pointer" aria-label={`${playLabel}: ${title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, shown once */}
            <img src={youtubeThumb(youtubeId)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(closest-side,transparent,rgb(5_8_7/0.55))]" />
            <span
              aria-hidden
              className="absolute top-1/2 left-1/2 grid h-[clamp(56px,8vw,80px)] w-[clamp(56px,8vw,80px)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-acc text-bg shadow-[0_0_40px_rgb(185_255_75/0.45)] transition-transform duration-300 group-hover:scale-110"
            >
              <svg viewBox="0 0 24 24" className="ml-1 h-[42%] w-[42%]" fill="currentColor">
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            </span>
          </button>
        ) : (
          <iframe
            key={start}
            src={src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </div>

      {chapters && chapters.length > 0 && (
        <div className="mt-6">
          <h3 className="label">{chaptersLabel}</h3>
          {chaptersHint && <p className="mt-2 text-[13.5px] text-dim">{chaptersHint}</p>}
          <ol className="mt-4 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {chapters.map((c) => (
              <li key={c.s}>
                <button
                  type="button"
                  onClick={() => setStart(c.s)}
                  className="group flex w-full items-baseline gap-3 border-b border-line py-2.5 text-left text-[14.5px] text-mute transition-colors hover:text-ink"
                >
                  <span className="font-mono text-[12px] text-acc tabular-nums">{c.t}</span>
                  <span>{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
