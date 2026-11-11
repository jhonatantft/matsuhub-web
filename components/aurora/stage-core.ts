import { AURORA_FEATURED, AURORA_MEDIA } from "@/content/aurora";
import { findTransition } from "@/content/aurora-video";
import { maxDpr, quality, reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { clamp, damp, easeInOutCubic, lerp, seg, smoothstep } from "@/lib/math";
import { onFrame } from "@/lib/ticker";
import type { Texture } from "three";
import type { AuroraGl } from "./stage-gl";
import { createClipLayer, type ClipAsset, type ClipLayer } from "./stage-video";
import {
  AURORA_VIEWS,
  depthOf,
  EXTERIOR_PRESET,
  FACADE,
  floorAtPoint,
  floorBand,
  framingOf,
  imageOf,
  isExterior,
  roomOf,
  sceneOf,
  type AuroraScene,
  type AuroraView,
  type Box,
  type Point,
} from "./views";

/**
 * The engine behind <AuroraStage>: state, camera ("cover" maths, Ken Burns, parallax, zoom),
 * cuts, lazy textures, pointer → floor picking, and the two renderers (WebGL, or plain
 * <img> layers when WebGL is unavailable). No React in here.
 */

const IW = AURORA_MEDIA.width;
const IH = AURORA_MEDIA.height;
const CUT_SECONDS = 1.15;
/** Clips (content/aurora-video.ts): frame rate, how long to wait for one, cross-fade at each end. */
const CLIP_FPS = 24;
const CLIP_WAIT = 1.5;
const CLIP_FADE = 0.2;

export type AuroraStageState = {
  /** The picture on stage — or the one being cut to while `mix` < 1. */
  view: AuroraView;
  /** The picture being left during a cut, otherwise null. */
  from: AuroraView | null;
  /** Progress of the cut `from` → `view`, 0..1 (1 = settled). */
  mix: number;
  /** Exterior only: 0 = blueprint, 1 = photo; in between a scan line builds the tower bottom-up. */
  build: number;
  /** Exterior only: 0 = day, 1 = blue hour with the lights on. */
  dusk: number;
  /** Exterior only: highlighted floor, 1..21 (fractions slide between floors), or null for none. */
  floor: number | null;
  /** Strength of the floor highlight, 0..1. */
  glow: number;
  /** Extra zoom on the current picture (1 = fitted). Resets to 1 when the picture changes. */
  zoom: number;
  /** Image point (fractions) that stays put while zooming. */
  focus: Point;
  /** Camera offset inside the cropped-away margin, −1..1 per axis. Resets with the picture. */
  pan: Point;
  /**
   * 0..1: how far the camera travels to put `focus` on `aimAt` (0 = zoom in place about `focus`,
   * 1 = `focus` sits exactly on `aimAt`). Lets code fly the camera *to* a floor or a room
   * instead of only zooming about it. Resets with the picture.
   */
  aim: number;
  /** Where `focus` lands when `aim` is 1, as fractions of the stage box (0.5, 0.5 = middle). */
  aimAt: Point;
};

export type AuroraStagePatch = Partial<Omit<AuroraStageState, "focus" | "pan" | "aimAt">> & {
  focus?: Point;
  pan?: Point;
  aimAt?: Point;
};

export type AuroraInsets = { top?: number; right?: number; bottom?: number; left?: number };

/** A camera for one picture, as in `set()`: zoom about `focus`, `pan` −1..1. Missing = fitted. */
export type AuroraCamera = { zoom?: number; focus?: Point; pan?: Point; aim?: number; aimAt?: Point };

export type AuroraGoToOptions = {
  duration?: number;
  immediate?: boolean;
  /**
   * Play the filmed camera move when one exists between the two pictures (default true). It
   * falls back to the shader cut on reduced motion, save-data, low-tier devices, or when the
   * clip is not playable within ~1.5 s.
   */
  clip?: boolean;
};

export type AuroraStageHandle = {
  /**
   * Apply values immediately (no animation) — call it every frame from a scroll timeline.
   * `{ view }` alone jumps to that picture; `{ view, from, mix }` shows a cut at `mix` (scrubbing).
   * Switching to an exterior view applies its build/dusk preset unless the patch sets them.
   */
  set(patch: AuroraStagePatch): void;
  /**
   * Animate to a picture: a ~1.1 s cinematic cut between scenes, or a build/dusk tween between
   * exterior views. Safe to call at any time — a cut in flight is reversed or chained.
   */
  goTo(view: AuroraView, options?: AuroraGoToOptions): void;
  /**
   * Start downloading the clip `goTo(to)` would play from `from` (call it when that move becomes
   * likely). Returns false when there is no clip for that pair or clips are off on this device.
   */
  primeClip(from: AuroraView, to: AuroraView): boolean;
  /**
   * Scroll-scrubbing: show the clip between `from` and `to` at `progress` (0..1), seeking only
   * when the frame changes, with short fades into the stills at both ends. The picture under it
   * switches from `from` to `to` halfway; the clip is framed by each end's camera. Call it every
   * frame (from onFrame) while inside the move; the clip hides on the first frame it is not
   * called. Returns false (and starts the download) when the clip cannot be shown yet — keep
   * your shader path for that case.
   */
  scrub(from: AuroraView, to: AuroraView, progress: number, cameras?: { from?: AuroraCamera; to?: AuroraCamera }): boolean;
  /** Image point (fractions of the current picture) → CSS px inside the stage. */
  project(point: Point, out?: Point): Point;
  /** CSS px inside the stage → image point (fractions of the current picture). */
  unproject(px: Point, out?: Point): Point;
  /** Floor under a stage position (CSS px), or null. Exterior only. */
  floorAt(px: Point): number | null;
  /** Bounding box of a floor band in CSS px inside the stage. */
  floorBox(floor: number, out?: Box): Box;
  /** True once the picture(s) a view needs are decoded and uploaded. */
  loaded(view: AuroraView): boolean;
  /** Start fetching pictures ahead of time (they are otherwise fetched in order, when near the viewport). */
  preload(views: readonly AuroraView[]): void;
  readonly state: Readonly<AuroraStageState>;
  readonly size: Readonly<{ width: number; height: number }>;
  /** True while a cut is running or waiting for its picture. */
  readonly cutting: boolean;
  /** True while a clip is on screen (played by goTo, or scrubbed this frame). */
  readonly clipping: boolean;
};

/** Latest props of <AuroraStage>, read by the engine every frame (so callbacks never go stale). */
export type AuroraStageLive = {
  interactive: boolean;
  padding?: Partial<Record<AuroraScene, AuroraInsets>>;
  preload?: readonly AuroraView[];
  onFloorHover?: (floor: number | null) => void;
  onFloorSelect?: (floor: number, info: { pointerType: string }) => void;
  onViewChange?: (view: AuroraView, previous: AuroraView) => void;
  onSettle?: (view: AuroraView) => void;
  onResize?: (width: number, height: number) => void;
  onFrame?: (stage: AuroraStageHandle, time: number, dt: number) => void;
  /** Let goTo play the filmed transitions (default true). */
  clips?: boolean;
  /** A clip played by goTo starts (`true`) or has handed over to its still (`false`). */
  onClip?: (playing: boolean, from: AuroraView, to: AuroraView) => void;
};

export type AuroraStageCore = AuroraStageHandle & { destroy(): void };

type Cam = { zoom: number; fx: number; fy: number; px: number; py: number; aim: number; tx: number; ty: number };
const newCam = (): Cam => ({ zoom: 1, fx: 0.5, fy: 0.5, px: 0, py: 0, aim: 0, tx: 0.5, ty: 0.5 });
function copyCam(out: Cam, c: Cam) {
  out.zoom = c.zoom;
  out.fx = c.fx;
  out.fy = c.fy;
  out.px = c.px;
  out.py = c.py;
  out.aim = c.aim;
  out.tx = c.tx;
  out.ty = c.ty;
}
type Xf = { ax: number; ay: number; bx: number; by: number; s: number };
type Slot = {
  url: string;
  /** 0 idle, 1 loading, 2 ready, 3 failed */
  status: 0 | 1 | 2 | 3;
  fade: number;
  texture: Texture | null;
  width: number;
};
type Cut = {
  from: AuroraView;
  to: AuroraView;
  t: number;
  duration: number;
  manual: boolean;
  pivotX: number;
  pivotY: number;
  power: number;
};
type Dial = { a: number; b: number; t: number; duration: number } | null;
type ClipRun = {
  from: AuroraView;
  to: AuroraView;
  asset: ClipAsset;
  /** Shown instead of `asset` until it has seeked (after a mid-clip reversal). */
  prev: ClipAsset | null;
  duration: number;
  /** wait: downloading · in: fading over the still · play · out: fading into the destination still */
  phase: "wait" | "in" | "play" | "out";
  t: number;
  /** Fallback cut length if the clip never plays. */
  cut: number;
  last: number;
  stuck: number;
  failed: boolean;
  /** goTo() asked for another picture meanwhile: go there once this clip has landed. */
  next: AuroraView | null;
};
type Scrub = { asset: ClipAsset; from: AuroraView; to: AuroraView; p: number; q: number; camA: Cam; camB: Cam };

const SCENE_PHASE: Record<string, number> = { exterior: 0, plan: 1.7, living: 3.1, suite: 4.4, bath: 5.2, varanda: 0.9 };

export const DEFAULT_STAGE_STATE: AuroraStageState = {
  view: "dusk",
  from: null,
  mix: 1,
  build: 1,
  dusk: 1,
  floor: null,
  glow: 1,
  zoom: 1,
  focus: { x: 0.5, y: 0.5 },
  pan: { x: 0, y: 0 },
  aim: 0,
  aimAt: { x: 0.5, y: 0.5 },
};

export function createAuroraStage(
  wrap: HTMLElement,
  layer: HTMLElement,
  live: { current: AuroraStageLive },
  initial?: AuroraStagePatch,
): AuroraStageCore {
  const still = reducedMotion();
  const motion = still ? 0 : 1;
  const tier = quality();
  const noGl = labParam("nogl") !== null;
  const debugFloors = labParam("floors") !== null;

  const state: AuroraStageState = {
    ...DEFAULT_STAGE_STATE,
    focus: { x: 0.5, y: 0.5 },
    pan: { x: 0, y: 0 },
    aimAt: { x: 0.5, y: 0.5 },
  };
  const size = { width: 0, height: 0 };

  /* ───────────── DOM ───────────── */
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .7s cubic-bezier(.2,.8,.2,1)";
  layer.appendChild(canvas);

  /* ───────────── Pictures ───────────── */
  let small = true;
  const slots = new Map<AuroraView, Slot>();
  const slotList: Slot[] = [];
  for (const view of AURORA_VIEWS) {
    const slot: Slot = { url: "", status: 0, fade: 0, texture: null, width: IW };
    slots.set(view, slot);
    slotList.push(slot);
  }
  const aborter = new AbortController();
  let loading = 0;
  let gl: AuroraGl | null = null;
  let mode: "boot" | "gl" | "img" = "boot";
  let dead = false;

  const slotOf = (view: AuroraView) => slots.get(view)!;
  const isReady = (view: AuroraView) => slotOf(view).status === 2;

  function request(view: AuroraView) {
    const slot = slotOf(view);
    if (slot.status !== 0 || mode === "boot") return;
    slot.status = 1;
    slot.url = small ? imageOf(view).small : imageOf(view).src;
    const extend = framingOf(sceneOf(view)).safe !== undefined; // flat background: stretch it, never mirror
    loading++;
    const done = (ok: boolean) => {
      loading--;
      if (!dead) slot.status = ok ? 2 : 3;
    };
    if (mode === "gl" && typeof createImageBitmap === "function") {
      fetch(slot.url, { signal: aborter.signal })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.blob();
        })
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          if (dead) return bitmap.close();
          slot.width = bitmap.width;
          if (gl) slot.texture = gl.upload(bitmap, extend);
          else bitmap.close(); // WebGL went away meanwhile: the <img> layers reuse the cached file
          done(true);
        })
        .catch(() => done(false));
    } else {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (dead) return;
        slot.width = img.naturalWidth;
        if (mode === "gl" && gl) slot.texture = gl.upload(img, extend);
        done(true);
      };
      img.onerror = () => done(false);
      img.src = slot.url;
    }
  }

  /** Pictures a view needs right now (the exterior needs up to three, depending on its dials). */
  function needs(view: AuroraView, fn: (key: AuroraView) => void) {
    if (!isExterior(view)) return fn(view);
    if (state.build < 0.999) fn("blueprint");
    if (state.build > 0.001) {
      if (state.dusk < 0.999) fn("day");
      if (state.dusk > 0.001) fn("dusk");
    }
  }
  /** Loaded — or failed, which must not dead-end the tour: the scene then shows its navy background. */
  const isSettled = (view: AuroraView) => slotOf(view).status >= 2;
  function viewReady(view: AuroraView) {
    if (!isExterior(view)) return isSettled(view);
    const preset = EXTERIOR_PRESET[view];
    if (preset.build < 1 && !isSettled("blueprint")) return false;
    if (preset.build > 0 && !isSettled(preset.dusk > 0 ? "dusk" : "day")) return false;
    return true;
  }
  function requestView(view: AuroraView) {
    if (!isExterior(view)) return request(view);
    const preset = EXTERIOR_PRESET[view];
    if (preset.build < 1) request("blueprint");
    if (preset.build > 0) request(preset.dusk > 0 ? "dusk" : "day");
  }

  /* ───────────── Camera ───────────── */
  const cam: Cam = newCam();
  const camFrom: Cam = newCam();
  const camRest: Cam = newCam();
  const camSwap: Cam = newCam();
  const xfView: Xf = { ax: 1, ay: 1, bx: 0, by: 0, s: 1 };
  const xfOther: Xf = { ax: 1, ay: 1, bx: 0, by: 0, s: 1 };
  const xfTmp: Xf = { ax: 1, ay: 1, bx: 0, by: 0, s: 1 };
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  let now = 0;
  let camDirty = true;

  function computeXf(out: Xf, scene: AuroraScene, c: Cam, time: number) {
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    const frame = framingOf(scene);
    const pad = live.current.padding?.[scene];
    const pl = pad?.left ?? 0;
    const pt = pad?.top ?? 0;
    const aw = Math.max(1, w - pl - (pad?.right ?? 0));
    const ah = Math.max(1, h - pt - (pad?.bottom ?? 0));

    let s = Math.max(w / IW, h / IH); // cover
    if (frame.safe) {
      const fit = Math.min(aw / ((frame.safe[2] - frame.safe[0]) * IW), ah / ((frame.safe[3] - frame.safe[1]) * IH));
      if (fit < s) s = fit;
    }
    const phase = SCENE_PHASE[scene] ?? 0;
    s *= 1 + motion * (0.016 + 0.012 * Math.sin(time * 0.21 + phase)); // slow breathing

    // Fitted camera: the framing's focus point sits in the middle of the free area.
    let cx = frame.fx * IW - (pl + aw / 2 - w / 2) / s;
    let cy = frame.fy * IH - (pt + ah / 2 - h / 2) / s;
    const slackX = Math.max(0, IW - w / s) / 2;
    const slackY = Math.max(0, IH - h / s) / 2;
    cx += c.px * slackX + motion * Math.sin(time * 0.13 + phase * 1.7) * 0.0035 * IW;
    cy += c.py * slackY + motion * Math.cos(time * 0.17 + phase) * 0.0025 * IH;

    // Zoom about the focus point: it keeps its place on screen.
    if (c.zoom !== 1) {
      const fx = c.fx * IW;
      const fy = c.fy * IH;
      cx = fx - (fx - cx) / c.zoom;
      cy = fy - (fy - cy) / c.zoom;
      s *= c.zoom;
    }
    // Fly towards the focus: it slides from where the zoom left it to `aimAt` on screen.
    if (c.aim > 0) {
      const k = Math.min(1, c.aim);
      cx += (c.fx * IW - (c.tx - 0.5) * (w / s) - cx) * k;
      cy += (c.fy * IH - (c.ty - 0.5) * (h / s) - cy) * k;
    }
    cx += par.x / s;
    cy += par.y / s;

    // Photographs must always cover the canvas; the plan floats on its flat background.
    if (!frame.safe) {
      const hw = w / (2 * s);
      const hh = h / (2 * s);
      cx = hw * 2 >= IW ? IW / 2 : clamp(cx, hw, IW - hw);
      cy = hh * 2 >= IH ? IH / 2 : clamp(cy, hh, IH - hh);
    }
    out.s = s;
    out.ax = w / (s * IW);
    out.ay = h / (s * IH);
    out.bx = (cx - w / (2 * s)) / IW;
    out.by = (cy - h / (2 * s)) / IH;
  }

  function syncCam() {
    cam.zoom = state.zoom;
    cam.fx = state.focus.x;
    cam.fy = state.focus.y;
    cam.px = state.pan.x;
    cam.py = state.pan.y;
    cam.aim = state.aim;
    cam.tx = state.aimAt.x;
    cam.ty = state.aimAt.y;
  }
  function camToState(c: Cam) {
    state.zoom = c.zoom;
    state.focus.x = c.fx;
    state.focus.y = c.fy;
    state.pan.x = c.px;
    state.pan.y = c.py;
    state.aim = c.aim;
    state.aimAt.x = c.tx;
    state.aimAt.y = c.ty;
  }
  function viewXf(): Xf {
    if (camDirty) {
      syncCam();
      computeXf(xfView, sceneOf(state.view), cam, now);
      camDirty = false;
    }
    return xfView;
  }
  function resetCam() {
    state.zoom = 1;
    state.pan.x = 0;
    state.pan.y = 0;
    state.aim = 0;
  }

  /* ───────────── Cuts and dials ───────────── */
  let cut: Cut | null = null;
  let pending: AuroraView | null = null;
  let pendingDuration = CUT_SECONDS;
  let dialBuild: Dial = null;
  let dialDusk: Dial = null;
  let lastFloor: number = AURORA_FEATURED.floor;
  const tmpPoint = { x: 0, y: 0 };
  const tmpBand = { top: 0, bottom: 0 };

  function emitChange(view: AuroraView, previous: AuroraView) {
    if (view !== previous) live.current.onViewChange?.(view, previous);
  }

  /** Screen point (0..1) the camera flies through when cutting between two pictures, and how hard. */
  function aimCut(c: Cut) {
    const deeper = depthOf(c.to) >= depthOf(c.from);
    const outer = deeper ? c.from : c.to;
    const inner = deeper ? c.to : c.from;
    c.power = 1;
    c.pivotX = 0.5;
    c.pivotY = 0.5;
    if (depthOf(outer) === depthOf(inner)) {
      c.power = 0.62;
      return;
    }
    if (isExterior(outer)) {
      floorBand(state.floor ?? lastFloor, tmpBand);
      tmpPoint.x = (FACADE.left + FACADE.right) / 2;
      tmpPoint.y = (tmpBand.top + tmpBand.bottom) / 2;
    } else {
      const room = roomOf(inner);
      tmpPoint.x = room ? room.plan.x : 0.5;
      tmpPoint.y = room ? room.plan.y : 0.5;
    }
    // The outer picture uses the camera it has (when leaving it) or will have (when returning to it).
    computeXf(xfTmp, sceneOf(outer), deeper ? camFrom : camRest, now);
    c.pivotX = clamp((tmpPoint.x - xfTmp.bx) / xfTmp.ax, 0.14, 0.86);
    c.pivotY = clamp((tmpPoint.y - xfTmp.by) / xfTmp.ay, 0.14, 0.86);
  }

  function applyPreset(view: AuroraView) {
    if (!isExterior(view)) return;
    state.build = EXTERIOR_PRESET[view].build;
    state.dusk = EXTERIOR_PRESET[view].dusk;
    dialBuild = dialDusk = null;
  }

  function startCut(to: AuroraView, duration: number, manual: boolean, from: AuroraView = state.view) {
    syncCam();
    copyCam(camFrom, cam);
    const previous = state.view;
    cut = { from, to, t: 0, duration, manual, pivotX: 0.5, pivotY: 0.5, power: 1 };
    aimCut(cut);
    state.from = from;
    state.view = to;
    state.mix = 0;
    resetCam();
    camDirty = true;
    emitChange(to, previous);
  }

  function settle() {
    const view = state.view;
    cut = null;
    state.from = null;
    state.mix = 1;
    camDirty = true;
    live.current.onSettle?.(view);
  }

  function tryPending() {
    if (pending === null || cut) return;
    if (mode === "boot") return;
    const to = pending;
    requestView(to);
    if (!viewReady(to)) {
      wrap.dataset.loading = "true";
      return;
    }
    delete wrap.dataset.loading;
    pending = null;
    if (sceneOf(to) === sceneOf(state.view)) return;
    if (still || pendingDuration <= 0) {
      const previous = state.view;
      applyPreset(to);
      state.view = to;
      resetCam();
      camDirty = true;
      emitChange(to, previous);
      live.current.onSettle?.(to);
      return;
    }
    applyPreset(to);
    startCut(to, pendingDuration, false);
  }

  function tweenDials(view: AuroraView, duration: number) {
    if (!isExterior(view)) return;
    const preset = EXTERIOR_PRESET[view];
    if (still) return applyPreset(view);
    if (state.build !== preset.build) dialBuild = { a: state.build, b: preset.build, t: 0, duration: duration * 1.25 };
    if (state.dusk !== preset.dusk) dialDusk = { a: state.dusk, b: preset.dusk, t: 0, duration };
  }

  function goTo(view: AuroraView, options?: AuroraGoToOptions) {
    if (options?.immediate) return set({ view });
    const duration = options?.duration ?? CUT_SECONDS;
    if (run) {
      if (view === run.to) return;
      if (run.phase === "wait") {
        run = null;
        delete wrap.dataset.loading;
      } else {
        if (view === run.from && reverseRun()) return;
        run.next = view;
        if (run.phase !== "out") {
          dropHold();
          run.phase = "out";
          run.t = 0;
        }
        return;
      }
    }
    if (options?.clip !== false && !cut && mode !== "boot" && sceneOf(view) !== sceneOf(state.view)) {
      const asset = clipAsset(state.view, view);
      if (asset) {
        pending = null;
        run = {
          from: state.view,
          to: view,
          asset,
          prev: null,
          duration: findTransition(state.view, view)!.clip.duration,
          phase: "wait",
          t: 0,
          cut: duration,
          last: -1,
          stuck: 0,
          failed: false,
          next: null,
        };
        requestView(view);
        return;
      }
    }
    if (cut && !cut.manual) {
      if (sceneOf(view) === sceneOf(cut.to)) {
        pending = null;
        if (isExterior(view) && view !== state.view) {
          const previous = state.view;
          state.view = cut.to = view;
          tweenDials(view, 1.4);
          emitChange(view, previous);
        }
        return;
      }
      if (sceneOf(view) === sceneOf(cut.from)) {
        // Changed our mind mid-cut: play it backwards from where it is.
        const previous = state.view;
        const back = cut.from;
        cut.from = cut.to;
        cut.to = back;
        cut.t = 1 - cut.t;
        // the returning picture gets its camera back, the leaving one keeps the current one
        syncCam();
        copyCam(camSwap, camFrom);
        copyCam(camFrom, cam);
        camToState(camSwap);
        state.from = cut.from;
        state.view = back;
        state.mix = cut.t;
        pending = null;
        camDirty = true;
        emitChange(back, previous);
        return;
      }
      pending = view;
      pendingDuration = duration;
      return;
    }
    if (sceneOf(view) === sceneOf(state.view)) {
      pending = null;
      delete wrap.dataset.loading;
      const previous = state.view;
      state.view = view;
      if (cut) {
        cut = null;
        state.from = null;
        state.mix = 1;
      }
      requestView(view);
      tweenDials(view, options?.duration ?? 1.4);
      emitChange(view, previous);
      return;
    }
    pending = view;
    pendingDuration = duration;
    requestView(view);
  }

  function set(patch: AuroraStagePatch) {
    if (patch.view !== undefined) {
      abortRun();
      const view = patch.view;
      const from = patch.from ?? null;
      const scrub = from !== null && patch.mix !== undefined && patch.mix < 1 && sceneOf(from) !== sceneOf(view);
      if (scrub) {
        if (!cut || !cut.manual || cut.from !== from || cut.to !== view) {
          pending = null;
          applyPreset(view);
          startCut(view, 1, true, from);
        }
        cut!.t = clamp(patch.mix!);
        state.mix = cut!.t;
      } else {
        const previous = state.view;
        const changedScene = sceneOf(view) !== sceneOf(previous);
        if (changedScene || cut) {
          cut = null;
          state.from = null;
          state.mix = 1;
          if (changedScene) resetCam();
        }
        pending = null;
        delete wrap.dataset.loading;
        if (view !== previous && isExterior(view)) {
          if (patch.build === undefined) {
            state.build = EXTERIOR_PRESET[view].build;
            dialBuild = null;
          }
          if (patch.dusk === undefined) {
            state.dusk = EXTERIOR_PRESET[view].dusk;
            dialDusk = null;
          }
        }
        state.view = view;
        emitChange(view, previous);
      }
    }
    if (patch.build !== undefined) {
      state.build = clamp(patch.build);
      dialBuild = null;
    }
    if (patch.dusk !== undefined) {
      state.dusk = clamp(patch.dusk);
      dialDusk = null;
    }
    if (patch.floor !== undefined) state.floor = patch.floor;
    if (patch.glow !== undefined) state.glow = clamp(patch.glow);
    if (patch.zoom !== undefined) state.zoom = Math.max(0.5, patch.zoom);
    if (patch.focus) {
      state.focus.x = patch.focus.x;
      state.focus.y = patch.focus.y;
    }
    if (patch.pan) {
      state.pan.x = clamp(patch.pan.x, -1, 1);
      state.pan.y = clamp(patch.pan.y, -1, 1);
    }
    if (patch.aim !== undefined) state.aim = clamp(patch.aim);
    if (patch.aimAt) {
      state.aimAt.x = patch.aimAt.x;
      state.aimAt.y = patch.aimAt.y;
    }
    camDirty = true;
  }

  /* ───────────── Clips: filmed camera moves between stills ───────────── */
  let clips: ClipLayer | null = null;
  let run: ClipRun | null = null;
  let scrubbed: Scrub | null = null;
  const scrubState: Scrub = {
    asset: null as unknown as ClipAsset,
    from: "dusk",
    to: "plan",
    p: 0,
    q: 0,
    camA: newCam(),
    camB: newCam(),
  };
  const xfClipA: Xf = { ax: 1, ay: 1, bx: 0, by: 0, s: 1 };
  const xfClipB: Xf = { ax: 1, ay: 1, bx: 0, by: 0, s: 1 };
  const xfClip: Xf = { ax: 1, ay: 1, bx: 0, by: 0, s: 1 };
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

  const clipsAllowed = () => !still && !saveData && tier !== "low" && !dead && typeof HTMLVideoElement !== "undefined";

  /** The file that films `from` → `to` (the reversed file when going back), or null. */
  function clipAsset(from: AuroraView, to: AuroraView, forwardOnly = false): ClipAsset | null {
    if (!clipsAllowed()) return null;
    const found = findTransition(from, to);
    if (!found) return null;
    // phones and small stages get the 960 px files
    const box = size.width > 0 ? size : wrap.getBoundingClientRect();
    const lite = window.innerWidth < 760 || Math.max(box.width, (box.height * IW) / IH) <= 900;
    const back = found.backwards && !forwardOnly;
    const url = back ? (lite ? found.clip.reverseSmall : found.clip.reverse) : lite ? found.clip.small : found.clip.src;
    if (!clips) clips = createClipLayer(layer, AURORA_MEDIA.planBackground);
    const asset = clips.get(url);
    return asset.status === 3 ? null : asset;
  }

  function primeClip(from: AuroraView, to: AuroraView) {
    if (live.current.clips === false) return false;
    return clipAsset(from, to) !== null;
  }

  /** The canvas held `from` (a cut frozen at 0) while the clip faded in: show the destination now. */
  function dropHold() {
    if (!run || !cut) return;
    cut = null;
    state.from = run.from;
    camDirty = true;
  }

  function abortRun() {
    if (!run) return;
    const r = run;
    run = null;
    delete wrap.dataset.loading;
    if (r.phase === "wait") return;
    clips?.hide();
    if (cut && cut.manual) {
      cut = null;
      state.from = null;
      state.mix = 1;
    }
    live.current.onClip?.(false, r.from, r.to);
  }

  /** Changed our mind mid-clip: continue from the same frame in the reversed file. */
  function reverseRun() {
    const r = run;
    if (!r || r.phase === "out") return false;
    const found = findTransition(r.to, r.from);
    if (!found) return false;
    const other = clipAsset(r.to, r.from);
    if (!other || other.status !== 2) return false;
    const at = r.asset.video.currentTime;
    other.video.currentTime = Math.max(0, r.duration - at);
    other.video.play().catch(() => {
      if (run) run.failed = true;
    });
    r.asset.video.pause();
    r.prev = r.asset;
    r.asset = other;
    dropHold();
    // the returning picture gets its camera back, the leaving one keeps the current one
    syncCam();
    copyCam(camSwap, camFrom);
    copyCam(camFrom, cam);
    camToState(camSwap);
    const previous = state.view;
    const back = r.from;
    r.from = r.to;
    r.to = back;
    applyPreset(back);
    state.view = back;
    state.from = r.from;
    state.mix = 0;
    r.phase = "play";
    r.t = 0;
    r.last = -1;
    r.stuck = 0;
    r.next = null;
    camDirty = true;
    requestView(back);
    emitChange(back, previous);
    live.current.onClip?.(true, r.from, r.to);
    return true;
  }

  /** Advance a clip started by goTo (frame loop, before the overlays run). */
  function stepRun(dt: number) {
    const r = run;
    if (!r) return;
    r.t += dt;
    if (r.phase === "wait") {
      requestView(r.to);
      if (r.asset.status === 3 || r.t > CLIP_WAIT || live.current.clips === false) {
        // not playable in time: the shader cut takes over
        run = null;
        pending = r.to;
        pendingDuration = r.cut;
        return;
      }
      if (r.asset.status !== 2 || mode === "boot") {
        wrap.dataset.loading = "true";
        return;
      }
      delete wrap.dataset.loading;
      applyPreset(r.to);
      startCut(r.to, 1, true, r.from); // a cut frozen at 0: the canvas keeps `from` under the fade-in
      state.mix = 0;
      r.phase = "in";
      r.t = 0;
      const video = r.asset.video;
      r.asset.frame = -1;
      if (video.currentTime !== 0) video.currentTime = 0;
      video.play().catch(() => {
        if (run) run.failed = true;
      });
      live.current.onClip?.(true, r.from, r.to);
      return;
    }
    const video = r.asset.video;
    const progress = clamp(video.currentTime / r.duration);
    if (r.phase !== "out") state.mix = progress;
    if (r.phase === "in" && r.t >= CLIP_FADE) {
      dropHold();
      r.phase = "play";
    }
    if (r.phase === "in" || r.phase === "play") {
      if (video.currentTime === r.last) r.stuck += dt;
      else r.stuck = 0;
      r.last = video.currentTime;
      const ended = video.ended || video.currentTime >= r.duration - 0.5 / CLIP_FPS;
      if ((ended && viewReady(r.to)) || r.failed || r.stuck > 2.5) {
        dropHold();
        r.phase = "out";
        r.t = 0;
      }
      return;
    }
    if (r.phase === "out" && r.t >= CLIP_FADE) {
      run = null;
      clips?.hide();
      video.pause();
      state.from = null;
      state.mix = 1;
      camDirty = true;
      live.current.onClip?.(false, r.from, r.to);
      live.current.onSettle?.(r.to);
      if (r.next !== null && r.next !== r.to) goTo(r.next);
    }
  }

  function camOf(out: Cam, c: AuroraCamera | undefined) {
    out.zoom = Math.max(0.5, c?.zoom ?? 1);
    out.fx = c?.focus?.x ?? 0.5;
    out.fy = c?.focus?.y ?? 0.5;
    out.px = clamp(c?.pan?.x ?? 0, -1, 1);
    out.py = clamp(c?.pan?.y ?? 0, -1, 1);
    out.aim = clamp(c?.aim ?? 0);
    out.tx = c?.aimAt?.x ?? 0.5;
    out.ty = c?.aimAt?.y ?? 0.5;
  }

  function scrub(
    from: AuroraView,
    to: AuroraView,
    progress: number,
    cameras?: { from?: AuroraCamera; to?: AuroraCamera },
  ) {
    const asset = clipAsset(from, to, true);
    if (!asset || asset.status !== 2 || mode === "boot") return false;
    abortRun();
    const p = clamp(progress);
    const found = findTransition(from, to)!;
    const target = p < 0.5 ? from : to;
    if (state.view !== target || cut) set({ view: target });
    const sc = scrubState;
    sc.asset = asset;
    sc.from = from;
    sc.to = to;
    sc.p = p;
    sc.q = found.backwards ? 1 - p : p;
    camOf(sc.camA, cameras?.from);
    camOf(sc.camB, cameras?.to);
    scrubbed = sc;
    // seek only when the frame changes, and never on top of a seek in flight
    const frames = Math.round(found.clip.duration * CLIP_FPS);
    const frame = Math.round(sc.q * (frames - 1));
    const video = asset.video;
    if (!video.paused) video.pause();
    if (frame !== asset.frame && !video.seeking) {
      asset.frame = frame;
      video.currentTime = (frame + 0.5) / CLIP_FPS;
    }
    return true;
  }

  /**
   * Framing of the film at `progress`: each end's camera, eased from one to the other. A floating
   * picture (the plan, fitted inside the free area) only shows its flat background around it near
   * its own end of the film; the rest of the move is full-frame, so it is zoomed to cover the stage.
   */
  function clipXf(from: AuroraView, to: AuroraView, a: Xf, b: Xf, progress: number) {
    const k = smoothstep(progress);
    xfClip.ax = lerp(a.ax, b.ax, k);
    xfClip.ay = lerp(a.ay, b.ay, k);
    xfClip.bx = lerp(a.bx, b.bx, k);
    xfClip.by = lerp(a.by, b.by, k);
    let cover = 1;
    if (framingOf(sceneOf(from)).safe) cover = Math.min(cover, smoothstep(seg(progress, 0.04, 0.24)));
    if (framingOf(sceneOf(to)).safe) cover = Math.min(cover, 1 - smoothstep(seg(progress, 0.56, 0.84)));
    if (cover > 0) {
      let ax = xfClip.ax;
      let ay = xfClip.ay;
      const over = Math.max(ax, ay);
      let bx = xfClip.bx;
      let by = xfClip.by;
      if (over > 1) {
        const cx = bx + ax / 2;
        const cy = by + ay / 2;
        ax /= over;
        ay /= over;
        bx = cx - ax / 2;
        by = cy - ay / 2;
      }
      bx = clamp(bx, 0, 1 - ax);
      by = clamp(by, 0, 1 - ay);
      xfClip.ax = lerp(xfClip.ax, ax, cover);
      xfClip.ay = lerp(xfClip.ay, ay, cover);
      xfClip.bx = lerp(xfClip.bx, bx, cover);
      xfClip.by = lerp(xfClip.by, by, cover);
    }
    return xfClip;
  }

  /** Place (or hide) the clip layer for this frame. Returns true when it covers the stage. */
  function renderClip(): boolean {
    if (!clips) return false;
    const r = run;
    if (r && r.phase !== "wait") {
      const asset = r.prev && (r.asset.video.seeking || r.asset.video.readyState < 2) ? r.prev : r.asset;
      if (asset === r.asset && r.prev) r.prev = null;
      const progress = clamp(asset.video.currentTime / r.duration);
      computeXf(xfClipA, sceneOf(r.from), camFrom, now);
      const xf = clipXf(r.from, r.to, xfClipA, viewXf(), progress);
      const alpha = r.phase === "in" ? clamp(r.t / CLIP_FADE) : r.phase === "out" ? 1 - clamp(r.t / CLIP_FADE) : 1;
      clips.show(asset, xf, size.width, size.height, alpha);
      return alpha >= 1;
    }
    const sc = scrubbed;
    if (sc) {
      computeXf(xfClipA, sceneOf(sc.from), sc.camA, now);
      computeXf(xfClipB, sceneOf(sc.to), sc.camB, now);
      const xf = clipXf(sc.from, sc.to, xfClipA, xfClipB, sc.p);
      const alpha = smoothstep(seg(sc.p, 0, 0.035)) * (1 - smoothstep(seg(sc.p, 0.965, 1)));
      clips.show(sc.asset, xf, size.width, size.height, alpha);
      return alpha >= 1;
    }
    if (clips.active || clips.opacity > 0) clips.hide();
    return false;
  }

  /* ───────────── Geometry for overlays ───────────── */
  function project(point: Point, out: Point = { x: 0, y: 0 }) {
    const xf = viewXf();
    out.x = ((point.x - xf.bx) / xf.ax) * size.width;
    out.y = ((point.y - xf.by) / xf.ay) * size.height;
    return out;
  }
  function unproject(px: Point, out: Point = { x: 0, y: 0 }) {
    const xf = viewXf();
    out.x = (px.x / Math.max(1, size.width)) * xf.ax + xf.bx;
    out.y = (px.y / Math.max(1, size.height)) * xf.ay + xf.by;
    return out;
  }
  const hit = { x: 0, y: 0 };
  function floorAt(px: Point) {
    if (!isExterior(state.view)) return null;
    unproject(px, hit);
    return floorAtPoint(hit.x, hit.y);
  }
  const boxBand = { top: 0, bottom: 0 };
  function floorBox(floor: number, out: Box = { x: 0, y: 0, w: 0, h: 0 }) {
    const xf = viewXf();
    floorBand(floor, boxBand);
    out.x = ((FACADE.left - xf.bx) / xf.ax) * size.width;
    out.y = ((boxBand.top - xf.by) / xf.ay) * size.height;
    out.w = ((FACADE.right - FACADE.left) / xf.ax) * size.width;
    out.h = ((boxBand.bottom - boxBand.top) / xf.ay) * size.height;
    return out;
  }

  const handle: AuroraStageCore = {
    set,
    goTo,
    project,
    unproject,
    floorAt,
    floorBox,
    loaded: viewReady,
    preload(views) {
      for (const view of views) requestView(view);
    },
    primeClip,
    scrub,
    state,
    size,
    get cutting() {
      return cut !== null || pending !== null || run !== null;
    },
    get clipping() {
      return (run !== null && run.phase !== "wait") || scrubbed !== null;
    },
    destroy,
  };

  /* ───────────── Initial state ───────────── */
  if (initial) {
    if (initial.view && isExterior(initial.view)) applyPreset(initial.view);
    set(initial);
  }
  let bandFloor = state.floor ?? lastFloor;
  let bandAlpha = 0;
  let shownBuild = state.build;
  let shownDusk = state.dusk;
  let painted = false;

  /* ───────────── Pointer: parallax and floor picking ───────────── */
  const pointer = { x: 0, y: 0, inside: false, dirty: false, type: "mouse" };
  let hover: number | null = null;

  const canPick = () =>
    live.current.interactive && isExterior(state.view) && !cut && !run && pending === null && state.build > 0.98;

  function setHover(floor: number | null) {
    if (floor === hover) return;
    hover = floor;
    wrap.style.cursor = floor === null ? "" : "pointer";
    live.current.onFloorHover?.(floor);
  }
  function locate(event: PointerEvent | MouseEvent) {
    const rect = wrap.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  }
  const onMove = (event: PointerEvent) => {
    locate(event);
    pointer.inside = true;
    pointer.dirty = true;
    pointer.type = event.pointerType || "mouse";
  };
  const onLeave = () => {
    pointer.inside = false;
    pointer.dirty = true;
  };
  const onClick = (event: MouseEvent) => {
    if (!canPick()) return;
    if ((event.target as Element).closest("a,button,input,select,textarea,[role='button'],[data-au-ui]")) return;
    locate(event);
    const floor = floorAt(pointer);
    if (floor === null) return;
    live.current.onFloorSelect?.(floor, { pointerType: pointer.type });
  };
  wrap.addEventListener("pointermove", onMove, { passive: true });
  wrap.addEventListener("pointerdown", onMove, { passive: true });
  wrap.addEventListener("pointerleave", onLeave, { passive: true });
  wrap.addEventListener("click", onClick);

  /* ───────────── Size and visibility ───────────── */
  let dpr = 1;
  const resizer = new ResizeObserver((entries) => {
    const rect = entries[0].contentRect;
    if (rect.width === size.width && rect.height === size.height) return;
    size.width = rect.width;
    size.height = rect.height;
    dpr = maxDpr(tier);
    gl?.resize(size.width, size.height, dpr);
    camDirty = true;
    live.current.onResize?.(size.width, size.height);
    // resizing clears the canvas: draw again now instead of flashing until the next frame
    if (mode === "gl" && visible && painted && size.width >= 2) renderGl(now, 0);
  });
  resizer.observe(wrap);

  let near = false;
  let visible = false;
  const nearWatcher = new IntersectionObserver(
    ([entry]) => {
      near = entry.isIntersecting;
      if (near) boot();
    },
    { rootMargin: "150% 0px" },
  );
  const viewWatcher = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: "8% 0px" });
  nearWatcher.observe(wrap);
  viewWatcher.observe(wrap);

  /* ───────────── Boot: WebGL, or plain images ───────────── */
  let booting = false;
  let fallback: Fallback | null = null;

  async function boot() {
    if (booting || dead) return;
    booting = true;
    const rect = wrap.getBoundingClientRect();
    if (!size.width) {
      size.width = rect.width;
      size.height = rect.height;
    }
    dpr = maxDpr(tier);
    // The -1600 variants are enough until the picture is drawn ~15 % larger than they are.
    small = tier === "low" || Math.max(size.width, (size.height * IW) / IH) * dpr <= 1840;
    let made: AuroraGl | null = null;
    if (!noGl) {
      try {
        const { createAuroraGl } = await import("./stage-gl");
        if (dead) return;
        made = createAuroraGl(canvas, {
          taps: tier === "high" ? 10 : tier === "mid" ? 8 : 6,
          debugFloors,
          lines: FACADE.lines,
          facade: [FACADE.left, FACADE.top, FACADE.right, FACADE.bottom],
          background: [0.00075, 0.00186, 0.0104],
          onContextLost: toImages,
        });
      } catch {
        made = null;
      }
    }
    if (dead) return made?.dispose();
    if (made) {
      gl = made;
      gl.resize(size.width, size.height, dpr);
      gl.uniforms.uMotion.value = motion;
      mode = "gl";
    } else {
      toImages();
    }
  }

  /** WebGL missing or lost: keep the experience with stacked <img> layers and opacity fades. */
  function toImages() {
    if (dead || mode === "img") return;
    if (gl) {
      for (const slot of slotList) slot.texture = null;
      const old = gl;
      gl = null;
      queueMicrotask(() => old.dispose());
    }
    canvas.style.display = "none";
    fallback = createFallback(layer);
    mode = "img";
  }

  /* ───────────── Frame ───────────── */
  function stepDial(dial: Dial, dt: number): Dial {
    if (!dial) return null;
    dial.t += dt / dial.duration;
    return dial;
  }

  const off = onFrame((time, dt) => {
    now = time;

    if (pointer.dirty) {
      pointer.dirty = false;
      if (pointer.inside && size.width > 0) {
        par.tx = -(pointer.x / size.width - 0.5) * 12 * motion;
        par.ty = -(pointer.y / size.height - 0.5) * 9 * motion;
      } else {
        par.tx = par.ty = 0;
      }
      setHover(pointer.inside && canPick() ? floorAt(pointer) : null);
    } else if (hover !== null && !canPick()) {
      setHover(null);
    }
    par.x = damp(par.x, par.tx, 3.5, dt);
    par.y = damp(par.y, par.ty, 3.5, dt);

    // exterior tweens (day ⇄ dusk, blueprint ⇄ photo) wait for the picture they reveal
    const dialsReady = viewReady(state.view);
    if (dialsReady) dialBuild = stepDial(dialBuild, dt);
    if (dialBuild) {
      state.build = lerp(dialBuild.a, dialBuild.b, easeInOutCubic(dialBuild.t));
      if (dialBuild.t >= 1) dialBuild = null;
    }
    if (dialsReady) dialDusk = stepDial(dialDusk, dt);
    if (dialDusk) {
      state.dusk = lerp(dialDusk.a, dialDusk.b, easeInOutCubic(dialDusk.t));
      if (dialDusk.t >= 1) dialDusk = null;
    }

    if (cut && !cut.manual) {
      cut.t += (dt / cut.duration) * (pending !== null ? 1.8 : 1);
      if (cut.t >= 1) settle();
      else state.mix = cut.t;
    }
    stepRun(dt);
    tryPending();
    camDirty = true;

    scrubbed = null;
    live.current.onFrame?.(handle, time, dt);

    if (state.floor !== null) {
      lastFloor = state.floor;
      bandFloor = bandAlpha < 0.02 ? state.floor : damp(bandFloor, state.floor, 20, dt);
    }
    bandAlpha = damp(bandAlpha, state.floor !== null ? state.glow : 0, 11, dt);

    if (mode === "boot" || document.hidden || size.width < 2) return;
    // the window moved to a screen with another pixel ratio: the ResizeObserver does not see that
    if (gl && maxDpr(tier) !== dpr) {
      dpr = maxDpr(tier);
      gl.resize(size.width, size.height, dpr);
    }
    if (near || visible) pump(dt); // pictures arrive before the stage scrolls into view
    if (!visible) return;
    // under an opaque clip the picture is not drawn (it is still stepped, so it is right on the way out)
    const covered = renderClip() && painted;
    if (mode === "gl") {
      if (covered) stepShown(dt);
      else renderGl(time, dt);
    } else renderImages(dt);
  });

  /** Fetch what is on stage first, then the rest of the tour one picture at a time. */
  function pump(dt: number) {
    needs(state.view, request);
    if (state.from) needs(state.from, request);
    if (loading === 0) {
      const order = live.current.preload ?? AURORA_VIEWS;
      for (const view of order) {
        if (slotOf(view).status === 0) {
          request(view);
          break;
        }
      }
    }
    for (let i = 0; i < slotList.length; i++) {
      const slot = slotList[i];
      if (slot.status === 2 && slot.fade < 1) slot.fade = Math.min(1, slot.fade + dt * 2.6);
    }
  }

  /** Dials as drawn: they wait for their pictures, then catch up smoothly. */
  function stepShown(dt: number) {
    const wantDusk = isReady("dusk") || !isReady("day") ? state.dusk : 0;
    const photo = wantDusk >= 0.999 ? isReady("dusk") : wantDusk <= 0.001 ? isReady("day") : isReady("day") && isReady("dusk");
    const wantBuild = photo || !isReady("blueprint") ? state.build : 0;
    shownBuild = painted ? damp(shownBuild, wantBuild, 26, dt) : wantBuild;
    shownDusk = painted ? damp(shownDusk, wantDusk, 26, dt) : wantDusk;
    if (Math.abs(shownBuild - wantBuild) < 0.0006) shownBuild = wantBuild;
    if (Math.abs(shownDusk - wantDusk) < 0.0006) shownDusk = wantDusk;
  }
  function exteriorFade() {
    let fade = 1;
    if (shownBuild < 0.999) fade = Math.min(fade, slotOf("blueprint").fade);
    if (shownBuild > 0.001) {
      if (shownDusk < 0.999) fade = Math.min(fade, slotOf("day").fade);
      if (shownDusk > 0.001) fade = Math.min(fade, slotOf("dusk").fade);
    }
    return fade;
  }
  const fadeOf = (view: AuroraView) => (isExterior(view) ? exteriorFade() : slotOf(view).fade);
  const lodOf = (view: AuroraView, xf: Xf) => {
    const width = slotOf(isExterior(view) ? (shownBuild < 0.5 ? "blueprint" : shownDusk > 0.5 ? "dusk" : "day") : view).width;
    return Math.max(0, Math.log2(width / (IW * xf.s * dpr)) - 0.45);
  };

  function renderGl(time: number, dt: number) {
    if (!gl) return;
    const u = gl.uniforms;
    stepShown(dt);

    // Shader side A is always the outer picture, so a pull-out is the push-in played backwards.
    const to = state.view;
    const from = cut ? cut.from : to;
    const reverse = cut !== null && depthOf(cut.to) < depthOf(cut.from);
    const a = reverse ? to : from;
    const b = reverse ? from : to;
    const xfTo = viewXf();
    if (cut) computeXf(xfOther, sceneOf(from), camFrom, time);
    const xfA = cut ? (reverse ? xfTo : xfOther) : xfTo;
    const xfB = cut ? (reverse ? xfOther : xfTo) : xfTo;

    u.uTime.value = time;
    u.uMix.value = cut ? (reverse ? 1 - cut.t : cut.t) : 0;
    u.uPivot.value.set(cut ? cut.pivotX : 0.5, cut ? cut.pivotY : 0.5);
    u.uPower.value = cut ? cut.power : 1;
    u.uXfFrom.value.set(xfA.ax, xfA.ay, xfA.bx, xfA.by);
    u.uXfTo.value.set(xfB.ax, xfB.ay, xfB.bx, xfB.by);
    u.uFromExt.value = isExterior(a) ? 1 : 0;
    u.uToExt.value = isExterior(b) ? 1 : 0;
    u.uFadeFrom.value = fadeOf(a);
    u.uFadeTo.value = fadeOf(b);
    u.uLodFrom.value = lodOf(a, xfA);
    u.uLodTo.value = lodOf(b, xfB);
    u.tFrom.value = (isExterior(a) ? null : slotOf(a).texture) ?? gl.blank;
    u.tTo.value = (isExterior(b) ? null : slotOf(b).texture) ?? gl.blank;
    u.tBlue.value = slotOf("blueprint").texture ?? gl.blank;
    u.tDay.value = slotOf("day").texture ?? gl.blank;
    u.tDusk.value = slotOf("dusk").texture ?? gl.blank;
    u.uBuild.value = shownBuild;
    u.uDusk.value = shownDusk;

    const ext = isExterior(a) ? xfA : isExterior(b) ? xfB : null;
    if (ext) {
      floorBand(bandFloor, tmpBand);
      u.uBand.value.set(FACADE.left, tmpBand.top, FACADE.right, tmpBand.bottom);
      u.uBandA.value = bandAlpha;
      u.uExtPx.value.set(IW * ext.s, IH * ext.s);
    }
    gl.render();

    if (!painted && fadeOf(to) > 0) {
      painted = true;
      canvas.style.opacity = "1";
      wrap.dataset.ready = "true";
    }
  }

  /* ───────────── Fallback renderer ───────────── */
  type Fallback = {
    root: HTMLDivElement;
    ext: HTMLDivElement;
    blue: HTMLImageElement;
    day: HTMLImageElement;
    dusk: HTMLImageElement;
    band: HTMLDivElement;
    shots: [HTMLImageElement, HTMLImageElement];
    held: [AuroraView | null, AuroraView | null];
  };

  function createFallback(parent: HTMLElement): Fallback {
    const root = document.createElement("div");
    root.style.cssText = "position:absolute;inset:0;overflow:hidden;z-index:0"; // own stacking context: stays under the clip layer
    const picture = () => {
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.style.cssText = `position:absolute;left:0;top:0;width:${IW}px;height:${IH}px;max-width:none;transform-origin:0 0;opacity:0;will-change:transform,opacity`;
      return img;
    };
    const ext = document.createElement("div");
    ext.style.cssText = `position:absolute;left:0;top:0;width:${IW}px;height:${IH}px;transform-origin:0 0;opacity:0;will-change:transform,opacity`;
    const blue = picture();
    const day = picture();
    const dusk = picture();
    const band = document.createElement("div");
    band.style.cssText =
      "position:absolute;opacity:0;background:rgb(245 240 230 / .2);box-shadow:0 0 0 2px rgb(245 240 230 / .85),0 0 26px 4px rgb(231 197 138 / .45)";
    ext.append(blue, day, dusk, band);
    const shots: [HTMLImageElement, HTMLImageElement] = [picture(), picture()];
    root.append(ext, shots[0], shots[1]);
    parent.insertBefore(root, canvas.nextSibling); // under the clip layer, if there is one
    return { root, ext, blue, day, dusk, band, shots, held: [null, null] };
  }

  function place(el: HTMLElement, xf: Xf, opacity: number, z: number) {
    const k = size.width / xf.ax / IW;
    el.style.transform = `translate3d(${(-xf.bx / xf.ax) * size.width}px,${(-xf.by / xf.ay) * size.height}px,0) scale(${k})`;
    el.style.opacity = String(opacity);
    el.style.zIndex = String(z);
  }

  function renderImages(dt: number) {
    const f = fallback;
    if (!f) return;
    stepShown(dt);
    const to = state.view;
    const from = cut ? cut.from : null;
    const xfTo = viewXf();
    if (cut && from) computeXf(xfOther, sceneOf(from), camFrom, now);
    const mix = cut ? smoothstep(cut.t) : 1;

    // exterior layers share one transform; the dials become opacities
    const extXf = isExterior(to) ? xfTo : from && isExterior(from) ? xfOther : null;
    if (extXf) {
      for (const [img, key] of [
        [f.blue, "blueprint"],
        [f.day, "day"],
        [f.dusk, "dusk"],
      ] as const) {
        const slot = slotOf(key);
        if (slot.status === 2 && !img.src) img.src = slot.url;
      }
      f.blue.style.opacity = "1";
      f.day.style.opacity = String(shownBuild);
      f.dusk.style.opacity = String(shownBuild * shownDusk);
      floorBand(bandFloor, tmpBand);
      f.band.style.left = `${FACADE.left * IW}px`;
      f.band.style.top = `${tmpBand.top * IH}px`;
      f.band.style.width = `${(FACADE.right - FACADE.left) * IW}px`;
      f.band.style.height = `${(tmpBand.bottom - tmpBand.top) * IH}px`;
      f.band.style.opacity = String(bandAlpha);
      place(f.ext, extXf, (isExterior(to) ? mix : 1) * exteriorFade(), isExterior(to) ? 2 : 1);
    } else {
      f.ext.style.opacity = "0";
    }

    // two generic layers hold the plan / rooms
    for (let i = 0; i < 2; i++) {
      const held = f.held[i];
      if (held !== null && held !== to && held !== from) {
        f.held[i] = null;
        f.shots[i].style.opacity = "0";
      }
    }
    for (const view of [from, to]) {
      if (view === null || isExterior(view)) continue;
      let index = f.held.indexOf(view);
      if (index === -1) {
        index = f.held[0] === null ? 0 : 1;
        f.held[index] = view;
        f.shots[index].removeAttribute("src");
      }
      const slot = slotOf(view);
      const img = f.shots[index];
      if (slot.status === 2 && img.getAttribute("src") !== slot.url) img.src = slot.url;
      img.style.boxShadow = view === "plan" ? `0 0 0 ${IW}px ${AURORA_MEDIA.planBackground}` : "";
      const incoming = view === to;
      place(img, incoming ? xfTo : xfOther, (incoming ? mix : 1) * slot.fade, incoming ? 2 : 1);
    }

    if (!painted && fadeOf(to) > 0) {
      painted = true;
      wrap.dataset.ready = "true";
    }
  }

  /* ───────────── Teardown ───────────── */
  function destroy() {
    dead = true;
    off();
    aborter.abort();
    resizer.disconnect();
    nearWatcher.disconnect();
    viewWatcher.disconnect();
    wrap.removeEventListener("pointermove", onMove);
    wrap.removeEventListener("pointerdown", onMove);
    wrap.removeEventListener("pointerleave", onLeave);
    wrap.removeEventListener("click", onClick);
    wrap.style.cursor = "";
    delete wrap.dataset.loading;
    delete wrap.dataset.ready;
    gl?.dispose();
    gl = null;
    for (const slot of slotList) slot.texture = null;
    run = null;
    scrubbed = null;
    clips?.destroy();
    clips = null;
    fallback?.root.remove();
    canvas.remove();
  }

  return handle;
}
