import { quality, maxDpr, reducedMotion, type Quality } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { clamp, damp, easeInOutCubic, easeOutCubic, lerp, seg } from "@/lib/math";
import { onFrame } from "@/lib/ticker";
import type { EloRoomId } from "@/content/clinica";
import {
  DOOR,
  DOORWAY,
  FLOOR_ENTRANCE,
  ROOM_BOX,
  ROOM_IDS,
  imageOfScene,
  leavesOf,
  roomAt,
  viewScene,
  type SceneId,
} from "./data";
import type { Texture } from "three";
import type { EloGl } from "./gl";

/**
 * The Elo tour engine: cameras, cuts, picture loading, hit testing and the frame loop. Plain
 * TypeScript (no React, no three.js import — gl.ts is loaded on demand). ClinicTour owns the
 * logical state and calls these methods from its handlers; the engine only draws.
 *
 * Camera model (same as the Maré tour): a scene shows one picture. Its camera says which picture
 * point (cx, cy, image fractions) sits on which screen point (fx, fy, viewport fractions) at zoom
 * z, relative to the scene's base fit (cover for photos, "contain inside the UI" for the floor).
 */

type Cam = { cx: number; cy: number; z: number; fx: number; fy: number };
type Ease = (t: number) => number;
type Tween = { from: Cam; to: Cam; t0: number; dur: number; ease: Ease };
type Side = { scene: SceneId; cam: Cam; tween: Tween | null; disp: Cam; k: number; aspect: number };
type CutSpec = {
  to: SceneId;
  dur: number;
  mix: [number, number];
  power: number;
  fromCam: Cam;
  fromWin: [number, number];
  toStart: Cam;
  toEnd: Cam;
  toWin: [number, number];
  /** Picture point of the outgoing side the camera goes through (tracked every frame); else screen centre. */
  pivot: { u: number; v: number } | null;
  then?: () => void;
};
type Cut = CutSpec & { t0: number };
type Pic = { status: 0 | 1 | 2 | 3; fade: number; url: string; width: number; tex: Texture | null };

const easeIn: Ease = (t) => {
  t = clamp(t);
  return t * t * t;
};

const copyCam = (c: Cam, out: Cam) => {
  out.cx = c.cx;
  out.cy = c.cy;
  out.z = c.z;
  out.fx = c.fx;
  out.fy = c.fy;
  return out;
};
const cam = (cx: number, cy: number, z: number, fx = 0.5, fy = 0.5): Cam => ({ cx, cy, z, fx, fy });

/**
 * Keep the picture covering the viewport (or inside it, when it is smaller). `slack` (a share of
 * the viewport) lets an edge come in: the floor's backdrop is linen, so a room near the edge can
 * still be brought to the focus point.
 */
function clampAxis(c: number, f: number, span: number, slack = 0) {
  const a = f * span;
  const b = 1 - (1 - f) * span;
  return clamp(c, Math.min(a, b) - slack * span, Math.max(a, b) + slack * span);
}

export type EngineMode = "boot" | "gl" | "img";
export type Box = { x: number; y: number; w: number; h: number };

export type EngineOptions = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Fallback layers (no WebGL): side A and side B of a cut, and the outline layer of the floor. */
  imgA: HTMLImageElement;
  imgB: HTMLImageElement;
  outlines: SVGSVGElement;
  initial: "facade" | "floor";
  /** WebGL drew its first picture (or the fallback took over). */
  onReady: (mode: EngineMode) => void;
  /** Runs inside the frame, right before drawing: position overlays with projectRoom(). */
  onFrame?: (engine: EloEngine, dt: number) => void;
};

export type EloEngine = ReturnType<typeof createEloEngine>;

export function createEloEngine(options: EngineOptions) {
  const { root, canvas, imgA, imgB, outlines } = options;
  let mode: EngineMode = "boot";
  let gl: EloGl | null = null;
  let dead = false;
  let q: Quality = "mid";
  let dpr = 1;
  let W = 1;
  let H = 1;
  let narrow = false;
  let motion = true;
  let clock = 0;
  let readySent = false;
  const debug = labParam("hot") === 1;
  const aborter = new AbortController();

  /* ───────────── Layout ───────────── */

  const INSETS_NARROW = { top: 72, bottom: 128, side: 0 } as const;
  const INSETS_WIDE = { top: 96, bottom: 112, side: 48 } as const;
  const insets = () => (narrow ? INSETS_NARROW : INSETS_WIDE);

  /** CSS px per picture width at zoom 1. */
  function baseK(scene: SceneId, aspect: number) {
    if (scene !== "floor") return Math.max(W, H / aspect);
    const { top, bottom, side } = insets();
    if (narrow) return Math.min(W * 3, (H - top - bottom) / aspect);
    return Math.min(W - side * 2, (H - top - bottom) / aspect);
  }

  function baseCam(scene: SceneId): Cam {
    if (scene === "floor") {
      const { top, bottom } = insets();
      return cam(0.5, 0.515, 1, 0.5, (top + (H - top - bottom) / 2) / H);
    }
    if (scene === "facade") {
      // keep the entrance (far left) in frame whatever the aspect
      const img = imageOfScene("facade");
      const k = baseK("facade", img.height / img.width);
      return cam(Math.min(0.5, 0.045 + (0.5 * W) / k), 0.5, 1);
    }
    return cam(0.5, 0.5, 1);
  }

  const fullRes = (scene: SceneId) => q === "high" || (q === "mid" && scene === "floor") || W * dpr > 1800;
  const texWidth = (scene: SceneId) => (fullRes(scene) ? imageOfScene(scene).width : 1600);

  function focusCam(id: EloRoomId): Cam {
    const b = ROOM_BOX[id];
    const img = imageOfScene("floor");
    const aspect = img.height / img.width;
    const k0 = baseK("floor", aspect);
    const { top, bottom } = insets();
    const availW = narrow ? W : W * 0.56;
    const availH = narrow ? H * 0.4 : H - top - bottom;
    const fill = narrow ? 0.8 : 0.62;
    let z = Math.min((availW * fill) / (2 * b.hw * k0), (availH * fill) / (2 * b.hh * aspect * k0));
    z = clamp(z, narrow ? 1 : 1.2, Math.max(1.2, (1.35 * texWidth("floor")) / k0));
    if (narrow) return cam(b.x, b.y, z, 0.5, (top + availH / 2) / H);
    return cam(b.x, b.y, z, 0.35, (top + availH / 2) / H);
  }

  /* ───────────── Sides ───────────── */

  function makeSide(scene: SceneId, c: Cam): Side {
    const img = imageOfScene(scene);
    return { scene, cam: { ...c }, tween: null, disp: { ...c }, k: 1, aspect: img.height / img.width };
  }

  let A: Side = makeSide(options.initial, cam(0.5, 0.5, 1));
  let B: Side | null = null;
  let cut: Cut | null = null;
  let pending: CutSpec | null = null;
  let afterCut: { at: number; fn: () => void } | null = null;
  const pivot = { x: 0.5, y: 0.5 };
  let mix = 0;

  function tweenTo(side: Side, to: Cam, dur: number, ease: Ease = easeInOutCubic, delay = 0) {
    if (!motion || dur <= 0) {
      side.tween = null;
      copyCam(to, side.cam);
      return;
    }
    side.tween = { from: { ...side.cam }, to: { ...to }, t0: clock + delay, dur, ease };
  }

  /** Zoom about a fixed point: the centre moves with 1/z, so zooming in pans first and zooming out pans last. */
  function evalTween(side: Side) {
    const tw = side.tween;
    if (!tw) return;
    const e = tw.ease(seg(clock, tw.t0, tw.t0 + tw.dur));
    const { from, to } = tw;
    const z = Math.exp(lerp(Math.log(from.z), Math.log(to.z), e));
    const w = Math.abs(to.z - from.z) > 0.03 ? (1 / z - 1 / from.z) / (1 / to.z - 1 / from.z) : e;
    side.cam.z = z;
    side.cam.cx = lerp(from.cx, to.cx, w);
    side.cam.cy = lerp(from.cy, to.cy, w);
    side.cam.fx = lerp(from.fx, to.fx, w);
    side.cam.fy = lerp(from.fy, to.fy, w);
    if (clock >= tw.t0 + tw.dur) side.tween = null;
  }

  /** Displayed camera: tween + clamp, and its scale. */
  function settleSide(side: Side) {
    evalTween(side);
    const k = baseK(side.scene, side.aspect) * side.cam.z;
    side.k = k;
    const d = copyCam(side.cam, side.disp);
    const slack = side.scene === "floor" ? 0.3 : 0;
    d.cx = clampAxis(d.cx, d.fx, W / k, slack);
    d.cy = clampAxis(d.cy, d.fy, H / (k * side.aspect), slack);
  }

  /* ───────────── Pictures (keyed by file: the four consultation rooms share one) ───────────── */

  const pics = new Map<string, Pic>();
  let loading = 0;
  const queue: SceneId[] = [];
  // per-scene lookups, cached so the frame loop does not search the content arrays
  const keys = new Map<SceneId, string>();
  const leaves = new Map<SceneId, readonly number[] | null>();

  const picOf = (scene: SceneId) => {
    let key = keys.get(scene);
    if (key === undefined) {
      key = imageOfScene(scene).src;
      keys.set(scene, key);
    }
    let p = pics.get(key);
    if (!p) {
      p = { status: 0, fade: 0, url: "", width: 1, tex: null };
      pics.set(key, p);
    }
    return p;
  };
  const settled = (scene: SceneId) => picOf(scene).status >= 2;

  function request(scene: SceneId, front = false) {
    const pic = picOf(scene);
    if (pic.status !== 0 || dead) return;
    if (mode === "boot" || loading >= 2) {
      const at = queue.indexOf(scene);
      if (at === -1) {
        if (front) queue.unshift(scene);
        else queue.push(scene);
      } else if (front) {
        queue.splice(at, 1);
        queue.unshift(scene);
      }
      return;
    }
    pic.status = 1;
    const img = imageOfScene(scene);
    pic.url = fullRes(scene) ? img.src : img.small;
    loading++;
    const done = (ok: boolean) => {
      loading--;
      if (dead) return;
      pic.status = ok ? 2 : 3;
      pump();
    };
    if (mode === "gl" && typeof createImageBitmap === "function") {
      fetch(pic.url, { signal: aborter.signal })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.blob();
        })
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          if (dead) return bitmap.close();
          pic.width = bitmap.width;
          if (gl) pic.tex = gl.upload(bitmap);
          else bitmap.close();
          done(true);
        })
        .catch(() => done(false));
    } else {
      const el = new Image();
      el.decoding = "async";
      el.onload = () => {
        pic.width = el.naturalWidth;
        if (mode === "gl" && gl && !dead) pic.tex = gl.upload(el);
        done(true);
      };
      el.onerror = () => done(false);
      el.src = pic.url;
    }
  }

  function pump() {
    while (queue.length && loading < 2 && mode !== "boot") request(queue.shift()!);
  }

  /** Fetch ahead: the other main picture, then every room photo (shown on demand). */
  function preloadAll() {
    request(A.scene === "facade" ? "floor" : "facade");
    for (const id of ROOM_IDS) request(viewScene(id));
  }

  /* ───────────── Overlay state (room outlines, door) ───────────── */

  const hovTarget = ROOM_IDS.map(() => 0);
  const hovNow = ROOM_IDS.map(() => 0);
  const selTarget = ROOM_IDS.map(() => 0);
  const selNow = ROOM_IDS.map(() => 0);
  let selAny = 0;
  let doorTarget = 0;
  let doorNow = 0;

  /* ───────────── Frame ───────────── */

  function sideUniforms(side: Side, which: "A" | "B") {
    if (!gl) return;
    const u = gl.uniforms;
    const d = side.disp;
    const k = side.k;
    const ka = k * side.aspect;
    const pic = picOf(side.scene);
    const xf = which === "A" ? u.uXfA.value : u.uXfB.value;
    xf.set(W / k, H / ka, d.cx - (d.fx * W) / k, d.cy - (d.fy * H) / ka);
    (which === "A" ? u.uPxA.value : u.uPxB.value).set(k, ka);
    const lod = Math.max(0, Math.log2(pic.width / (k * dpr)));
    const kind = side.scene === "floor" ? 1 : side.scene === "facade" ? 2 : 0;
    const tex = pic.tex ?? gl.blank;
    let leaf = leaves.get(side.scene);
    if (leaf === undefined) {
      leaf = leavesOf(side.scene);
      leaves.set(side.scene, leaf);
    }
    const lv = which === "A" ? u.uLeafA.value : u.uLeafB.value;
    if (leaf) lv.set(leaf[0], leaf[1], leaf[2], leaf[3]);
    else lv.set(0, 0, 0, 0);
    if (which === "A") {
      u.tA.value = tex;
      u.uLodA.value = lod;
      u.uKindA.value = kind;
      u.uFadeA.value = pic.fade;
    } else {
      u.tB.value = tex;
      u.uLodB.value = lod;
      u.uKindB.value = kind;
      u.uFadeB.value = pic.fade;
    }
  }

  const imgState = { a: "", b: "", svg: "" };
  function imgLayer(el: HTMLImageElement, side: Side | null, opacity: number, key: "a" | "b") {
    if (!side) {
      if (imgState[key] !== "off") {
        imgState[key] = "off";
        el.style.opacity = "0";
      }
      return;
    }
    const pic = picOf(side.scene);
    if (pic.status === 2 && el.dataset.src !== pic.url) {
      el.dataset.src = pic.url;
      el.src = pic.url;
      imgState[key] = "";
    }
    const d = side.disp;
    const k = side.k;
    const x = d.fx * W - d.cx * k;
    const y = d.fy * H - d.cy * k * side.aspect;
    const sig = `${x.toFixed(1)},${y.toFixed(1)},${k.toFixed(1)},${opacity.toFixed(3)},${pic.status}`;
    if (imgState[key] === sig) return;
    imgState[key] = sig;
    el.style.width = `${k}px`;
    el.style.height = `${k * side.aspect}px`;
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
    el.style.opacity = String(opacity * (pic.status === 2 ? 1 : 0));
  }

  /** Fallback outlines (no WebGL): an SVG in picture fractions laid over the floor. */
  function svgLayer() {
    const on = mode === "img" && A.scene === "floor" && !cut;
    if (!on) {
      if (imgState.svg !== "off") {
        imgState.svg = "off";
        outlines.style.display = "none";
      }
      return;
    }
    const d = A.disp;
    const k = A.k;
    const x = d.fx * W - d.cx * k;
    const y = d.fy * H - d.cy * k * A.aspect;
    const sig = `${x.toFixed(1)},${y.toFixed(1)},${k.toFixed(1)}`;
    if (imgState.svg === sig) return;
    imgState.svg = sig;
    outlines.style.display = "block";
    outlines.style.width = `${k}px`;
    outlines.style.height = `${k * A.aspect}px`;
    outlines.style.transform = `translate3d(${x}px,${y}px,0)`;
  }

  function beginCut(spec: CutSpec) {
    pending = null;
    const dur = motion ? spec.dur : 0;
    cut = { ...spec, dur, t0: clock };
    const fromDur = dur * (spec.fromWin[1] - spec.fromWin[0]);
    tweenTo(A, spec.fromCam, fromDur, easeIn, dur * spec.fromWin[0]);
    B = makeSide(spec.to, spec.toStart);
    tweenTo(B, spec.toEnd, dur * (spec.toWin[1] - spec.toWin[0]), easeOutCubic, dur * spec.toWin[0]);
  }

  function fadeIn(this: number, pic: Pic) {
    if (pic.status === 2 && pic.fade < 1) pic.fade = motion ? Math.min(1, pic.fade + this / 0.45) : 1;
  }

  function frame(time: number, dt: number) {
    clock += dt;
    pics.forEach(fadeIn, dt);

    if (pending && settled(pending.to)) beginCut(pending);
    settleSide(A);
    mix = 0;
    if (cut && B) {
      settleSide(B);
      const p = seg(clock, cut.t0 + cut.dur * cut.mix[0], cut.t0 + cut.dur * cut.mix[1]);
      mix = cut.dur <= 0 ? 1 : easeInOutCubic(p);
      if (cut.pivot) {
        const d = A.disp;
        pivot.x = clamp(d.fx + ((cut.pivot.u - d.cx) * A.k) / W, 0.1, 0.9);
        pivot.y = clamp(d.fy + ((cut.pivot.v - d.cy) * A.k * A.aspect) / H, 0.1, 0.9);
      } else {
        pivot.x = 0.5;
        pivot.y = 0.5;
      }
      if (clock >= cut.t0 + cut.dur) {
        const then = cut.then;
        A = B;
        B = null;
        cut = null;
        mix = 0;
        settleSide(A);
        then?.();
      }
    }
    if (afterCut && clock >= afterCut.at) {
      const fn = afterCut.fn;
      afterCut = null;
      fn();
    }

    selAny = 0;
    for (let i = 0; i < hovNow.length; i++) {
      hovNow[i] = damp(hovNow[i], hovTarget[i], 14, dt);
      selNow[i] = damp(selNow[i], selTarget[i], 8, dt);
      if (hovNow[i] < 0.002 && !hovTarget[i]) hovNow[i] = 0;
      if (selNow[i] < 0.002 && !selTarget[i]) selNow[i] = 0;
      selAny = Math.max(selAny, selNow[i]);
    }
    doorNow = damp(doorNow, doorTarget, 9, dt);

    options.onFrame?.(api, dt);

    if (mode === "gl" && gl) {
      const u = gl.uniforms;
      u.uTime.value = time;
      u.uMotion.value = motion ? 1 : 0;
      sideUniforms(A, "A");
      if (B) sideUniforms(B, "B");
      u.uMix.value = mix;
      u.uPivot.value.set(pivot.x, pivot.y);
      u.uPower.value = cut ? cut.power : 0;
      for (let i = 0; i < hovNow.length; i++) {
        u.uHovW.value[i] = hovNow[i];
        u.uSelW.value[i] = selNow[i];
      }
      u.uSelAny.value = selAny;
      u.uDoorA.value = doorNow;
      u.uDebug.value = debug ? 1 : 0;
      gl.render();
      if (!readySent && picOf(A.scene).fade >= 1) {
        readySent = true;
        options.onReady("gl");
      }
    } else if (mode === "img") {
      imgLayer(imgA, A, 1, "a");
      imgLayer(imgB, B, mix, "b");
      svgLayer();
      if (!readySent && picOf(A.scene).status >= 2) {
        readySent = true;
        options.onReady("img");
      }
    }
  }

  /* ───────────── Size, visibility, boot ───────────── */

  function measure() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    narrow = W < 768; // matches the @3xl container breakpoint of ClinicTour
    gl?.resize(W, H, dpr);
  }

  let unsub: (() => void) | null = null;
  function setVisible(v: boolean) {
    if (v && !unsub && !dead) unsub = onFrame(frame);
    if (!v && unsub) {
      unsub();
      unsub = null;
    }
  }

  const ro = new ResizeObserver(() => measure());
  ro.observe(root);
  let intersecting = true;
  const io = new IntersectionObserver(
    (entries) => {
      intersecting = entries[entries.length - 1].isIntersecting;
      setVisible(intersecting && !document.hidden);
    },
    { rootMargin: "120px" },
  );
  io.observe(root);
  const onVisibility = () => setVisible(!document.hidden && intersecting);
  document.addEventListener("visibilitychange", onVisibility);

  function fallback() {
    mode = "img";
    canvas.style.display = "none";
    imgA.style.display = "block";
    imgB.style.display = "block";
    for (const pic of pics.values()) if (pic.status === 1) pic.status = 0; // fetches in flight may be lost
    pump();
    request(A.scene, true);
    if (B) request(B.scene, true);
  }

  function boot() {
    q = quality();
    dpr = maxDpr(q);
    motion = !reducedMotion();
    measure();
    A = makeSide(options.initial, baseCam(options.initial));
    request(options.initial, true);
    if (labParam("gl") === 0) {
      fallback(); // lab: /lab/clinica?gl=0 shows the <img> fallback
      return;
    }
    import("./gl")
      .then(({ createEloGl }) => {
        if (dead) return;
        try {
          gl = createEloGl(canvas, {
            taps: q === "high" ? 10 : q === "mid" ? 8 : 6,
            onContextLost: () => {
              gl = null;
              fallback();
            },
          });
          mode = "gl";
          gl.resize(W, H, dpr);
        } catch {
          fallback();
          return;
        }
        pump();
        request(options.initial, true);
      })
      .catch(() => {
        if (!dead) fallback();
      });
  }

  /* ───────────── Public API ───────────── */

  function start(spec: CutSpec) {
    if (cut) {
      // finish the running cut at once before starting another
      A = B ?? A;
      B = null;
      const then = cut.then;
      cut = null;
      then?.();
    }
    afterCut = null;
    if (spec.to === A.scene && spec.to !== "floor") {
      spec.then?.();
      return;
    }
    request(spec.to, true);
    if (settled(spec.to)) beginCut(spec);
    else pending = spec;
  }

  const api = {
    get mode() {
      return mode;
    },
    get scene() {
      return A.scene;
    },
    get busy() {
      return cut !== null || pending !== null;
    },
    get narrow() {
      return narrow;
    },
    get size() {
      return { width: W, height: H };
    },
    get motion() {
      return motion;
    },
    /** Screen px (relative to the root) of a picture point on the scene on stage. */
    project(u: number, v: number, out: { x: number; y: number }) {
      const d = A.disp;
      out.x = d.fx * W + (u - d.cx) * A.k;
      out.y = d.fy * H + (v - d.cy) * A.k * A.aspect;
      return out;
    },
    /** Screen box (px) of a room's outline on the floor. */
    projectRoom(id: EloRoomId, out: Box) {
      const b = ROOM_BOX[id];
      const d = A.disp;
      out.w = b.hw * 2 * A.k;
      out.h = b.hh * 2 * A.k * A.aspect;
      out.x = d.fx * W + (b.x - b.hw - d.cx) * A.k;
      out.y = d.fy * H + (b.y - b.hh - d.cy) * A.k * A.aspect;
      return out;
    },
    /** Screen box (px) of the facade door. */
    projectDoor(out: Box) {
      const d = A.disp;
      out.w = DOOR.hw * 2 * A.k;
      out.h = DOOR.hh * 2 * A.k * A.aspect;
      out.x = d.fx * W + (DOOR.x - DOOR.hw - d.cx) * A.k;
      out.y = d.fy * H + (DOOR.y - DOOR.hh - d.cy) * A.k * A.aspect;
      return out;
    },
    /** Picture point under a screen point (px relative to the root). */
    unproject(x: number, y: number) {
      const d = A.disp;
      return { u: d.cx + (x - d.fx * W) / A.k, v: d.cy + (y - d.fy * H) / (A.k * A.aspect) };
    },
    hit(x: number, y: number): EloRoomId | null {
      if (A.scene !== "floor" || cut) return null;
      const { u, v } = api.unproject(x, y);
      return roomAt(u, v);
    },
    setHover(id: EloRoomId | null) {
      for (let i = 0; i < ROOM_IDS.length; i++) hovTarget[i] = ROOM_IDS[i] === id ? 1 : 0;
      if (id) request(viewScene(id), true);
    },
    setSelected(id: EloRoomId | null) {
      for (let i = 0; i < ROOM_IDS.length; i++) selTarget[i] = ROOM_IDS[i] === id ? 1 : 0;
      if (id) request(viewScene(id), true);
    },
    setDoorHover(on: boolean) {
      doorTarget = on ? 1 : 0;
    },
    /** Camera onto a room of the floor (or back to the whole floor). */
    focus(id: EloRoomId | null, dur = 0.9) {
      if (A.scene !== "floor" || cut) return;
      afterCut = null;
      tweenTo(A, id ? focusCam(id) : baseCam("floor"), dur);
    },
    /** Drag the floor by screen px. */
    pan(dx: number, dy: number) {
      if (A.scene !== "floor" || cut) return;
      A.tween = null;
      afterCut = null;
      const d = A.disp;
      A.cam.cx = d.cx - dx / A.k;
      A.cam.cy = d.cy - dy / (A.k * A.aspect);
      A.cam.fx = d.fx;
      A.cam.fy = d.fy;
    },
    /** Facade → floor: push through the door, dissolve into the cut-away at its entrance, then pull back (or onto `room`). */
    enter(room: EloRoomId | null, then?: () => void) {
      start({
        to: "floor",
        dur: 2.0,
        mix: [0.3, 0.84],
        power: 1,
        fromCam: cam(DOORWAY.x, DOORWAY.y, 2.6),
        fromWin: [0, 0.78],
        toStart: cam(FLOOR_ENTRANCE[0], FLOOR_ENTRANCE[1], 2.6),
        toEnd: room ? focusCam(room) : baseCam("floor"),
        toWin: [0.32, 1],
        pivot: { u: DOORWAY.x, v: DOORWAY.y },
        then,
      });
    },
    /** Floor → facade: step back out through the door. */
    exit(then?: () => void) {
      const c = A.disp;
      start({
        to: "facade",
        dur: 1.4,
        mix: [0.1, 0.8],
        power: 0.6,
        fromCam: { ...c, z: c.z * 0.82 },
        fromWin: [0, 0.8],
        toStart: cam(DOORWAY.x, DOORWAY.y, 2.1),
        toEnd: baseCam("facade"),
        toWin: [0.12, 1],
        pivot: null,
        then,
      });
    },
    /** Floor (zoomed on `room`) → the room's photo, going in through the room itself. */
    toView(room: EloRoomId, then?: () => void) {
      const b = ROOM_BOX[room];
      const c = A.disp;
      const pv = { x: 0.5, y: 0.5 };
      if (A.scene === "floor") {
        api.project(b.x, b.y, pv);
        pv.x /= W;
        pv.y /= H;
      }
      start({
        to: viewScene(room),
        dur: 1.5,
        mix: [0.2, 0.8],
        power: 0.9,
        fromCam: A.scene === "floor" ? cam(b.x, b.y, c.z * 1.8, c.fx, c.fy) : { ...c, z: c.z * 1.4 },
        fromWin: [0, 0.72],
        toStart: cam(0.5, 0.56, 1.32, clamp(pv.x, 0.2, 0.8), clamp(pv.y, 0.2, 0.8)),
        toEnd: baseCam(viewScene(room)),
        toWin: [0.22, 1],
        pivot: A.scene === "floor" ? { u: b.x, v: b.y } : null,
        then,
      });
    },
    /** Room photo → another room's photo: a short push dissolve. */
    switchView(room: EloRoomId, then?: () => void) {
      const c = A.disp;
      start({
        to: viewScene(room),
        dur: 0.85,
        mix: [0.08, 0.86],
        power: 0.45,
        fromCam: { ...c, z: c.z * 1.16 },
        fromWin: [0, 0.8],
        toStart: cam(0.5, 0.5, 1.12),
        toEnd: baseCam(viewScene(room)),
        toWin: [0.12, 1],
        pivot: null,
        then,
      });
    },
    /**
     * Room photo (or facade) → floor, landing zoomed on `room`. `easeOut`: then glide back out to
     * the whole floor (the "Voltar à planta" move).
     */
    toFloor(room: EloRoomId | null, easeOut: boolean, then?: () => void) {
      if (A.scene === "facade") return api.enter(room, then);
      const c = A.disp;
      const land = room ? focusCam(room) : baseCam("floor");
      start({
        to: "floor",
        dur: 1.25,
        mix: [0.14, 0.8],
        power: 0.8,
        fromCam: { ...c, z: c.z * 1.25 },
        fromWin: [0, 0.75],
        toStart: { ...land, z: land.z * 1.45 },
        toEnd: land,
        toWin: [0.18, 1],
        pivot: null,
        then: () => {
          if (easeOut && room) {
            afterCut = { at: clock + (motion ? 0.35 : 0), fn: () => tweenTo(A, baseCam("floor"), 1.1, easeInOutCubic) };
          }
          then?.();
        },
      });
    },
    dispose() {
      dead = true;
      aborter.abort();
      unsub?.();
      unsub = null;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl?.dispose();
      gl = null;
      pics.clear();
    },
    preloadAll,
    /** Debug/lab: screen px of a room's centre (or of the door on the facade). */
    roomCenter(id: EloRoomId) {
      const b = ROOM_BOX[id];
      return api.project(b.x, b.y, { x: 0, y: 0 });
    },
    doorCenter() {
      return api.project(DOOR.x, DOOR.y, { x: 0, y: 0 });
    },
  };

  boot();
  return api;
}
