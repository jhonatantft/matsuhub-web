import { AURORA_MEDIA } from "@/content/aurora";

/**
 * The <video> layer of <AuroraStage>: the AI-generated camera moves between stills
 * (content/aurora-video.ts). It sits above the canvas and below the overlays, in the stills'
 * own image space (the clips are the stills' frames resized to 16:9, so they are stretched back
 * to the stills' box — `object-fit: fill` inside a box of the stills' aspect), and is placed with
 * the same transform the stage uses for its pictures. Files are fetched whole into a blob URL
 * before use, so scrubbing never waits on the network. No React in here.
 */

const IW = AURORA_MEDIA.width;
const IH = AURORA_MEDIA.height;

export type ClipAsset = {
  url: string;
  /** 0 idle, 1 loading, 2 ready (first frame decodable), 3 failed */
  status: 0 | 1 | 2 | 3;
  video: HTMLVideoElement;
  blob: string | null;
  /** Last frame asked for while scrubbing (−1 = none). */
  frame: number;
};

/** Camera transform in image fractions, as used by the stage (see `computeXf` in stage-core). */
export type ClipXf = { ax: number; ay: number; bx: number; by: number };

export type ClipLayer = {
  /** The asset for a file, created (and its download started) on first use. */
  get(url: string): ClipAsset;
  /** Show `asset` (hiding any other) at `opacity`, placed by `xf` in a stage of `width × height`. */
  show(asset: ClipAsset, xf: ClipXf, width: number, height: number, opacity: number): void;
  hide(): void;
  readonly active: ClipAsset | null;
  readonly opacity: number;
  destroy(): void;
};

export function createClipLayer(parent: HTMLElement, background: string): ClipLayer {
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0;visibility:hidden;background:${background}`;
  parent.appendChild(root);

  const aborter = new AbortController();
  const assets = new Map<string, ClipAsset>();
  let active: ClipAsset | null = null;
  let opacity = 0;
  let dead = false;

  function get(url: string): ClipAsset {
    const known = assets.get(url);
    if (known) return known;
    const video = document.createElement("video");
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.disablePictureInPicture = true;
    video.preload = "auto";
    video.style.cssText = `position:absolute;left:0;top:0;width:${IW}px;height:${IH}px;max-width:none;object-fit:fill;transform-origin:0 0;display:none`;
    root.appendChild(video);
    const asset: ClipAsset = { url, status: 1, video, blob: null, frame: -1 };
    assets.set(url, asset);

    const fail = () => {
      if (!dead) asset.status = 3;
    };
    video.addEventListener("loadeddata", () => {
      if (!dead && asset.status === 1) asset.status = 2;
    });
    video.addEventListener("error", fail);
    fetch(url, { signal: aborter.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then((blob) => {
        if (dead) return;
        asset.blob = URL.createObjectURL(blob);
        video.src = asset.blob;
        video.load();
      })
      .catch(fail);
    return asset;
  }

  function show(asset: ClipAsset, xf: ClipXf, width: number, height: number, alpha: number) {
    if (active !== asset) {
      if (active) active.video.style.display = "none";
      active = asset;
      asset.video.style.display = "block";
    }
    const k = width / xf.ax / IW;
    asset.video.style.transform = `translate3d(${(-xf.bx / xf.ax) * width}px,${(-xf.by / xf.ay) * height}px,0) scale(${k})`;
    if (alpha !== opacity) {
      opacity = alpha;
      root.style.opacity = String(alpha);
      root.style.visibility = alpha > 0 ? "visible" : "hidden";
    }
  }

  function hide() {
    if (opacity !== 0) {
      opacity = 0;
      root.style.opacity = "0";
      root.style.visibility = "hidden";
    }
    if (active) {
      active.video.style.display = "none";
      if (!active.video.paused) active.video.pause();
      active = null;
    }
  }

  function destroy() {
    dead = true;
    aborter.abort();
    for (const asset of assets.values()) {
      asset.video.pause();
      asset.video.removeAttribute("src");
      asset.video.load();
      if (asset.blob) URL.revokeObjectURL(asset.blob);
    }
    assets.clear();
    root.remove();
  }

  return {
    get,
    show,
    hide,
    get active() {
      return active;
    },
    get opacity() {
      return opacity;
    },
    destroy,
  };
}
