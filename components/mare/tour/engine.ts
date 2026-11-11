import { quality, maxDpr, reducedMotion, type Quality } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { clamp, damp, easeInOutCubic, easeOutCubic, lerp, seg } from "@/lib/math";
import { onFrame } from "@/lib/ticker";
import type { MareZoneId } from "@/content/mare";
import {
  DOOR,
  DOORWAY,
  ITEMS,
  SALON_ENTRANCE,
  TABLE_IDS,
  imageOfScene,
  isZoneItem,
  shapeOf,
  viewScene,
  zoneOfItem,
  type ItemId,
  type SceneId,
  type Shape,
} from "./data";
import type { Texture } from "three";
import type { MareGl } from "./gl";

/**
 * The Maré tour engine: cameras, cuts, picture loading, hit testing and the frame loop. Plain
 * TypeScript (no React, no three.js import — gl.ts is loaded on demand). SalonTour owns the
 * logical state and calls these methods from its handlers; the engine only draws.
 *
 * Camera model: a scene shows one picture. Its camera says which picture point (cx, cy, image
 * fractions) sits on which screen point (fx, fy, viewport fractions) at zoom z, relative to the
 * scene's base fit (cover for photos, "contain inside the UI" for the cut-away).
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

/** Keep the picture covering the viewport (or inside it, when it is smaller). */
function clampAxis(c: number, f: number, span: number) {
  const a = f * span;
  const b = 1 - (1 - f) * span;
  return clamp(c, Math.min(a, b), Math.max(a, b));
}

export type EngineMode = "boot" | "gl" | "img";

export type EngineOptions = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Fallback layers (no WebGL): side A and side B of a cut. */
  imgA: HTMLImageElement;
  imgB: HTMLImageElement;
  initial: SceneId;
  /** WebGL drew its first picture (or the fallback took over). */
  onReady: (mode: EngineMode) => void;
  /** Runs inside the frame, right before drawing: position overlays with project(). */
  onFrame?: (engine: MareEngine) => void;
};

export type MareEngine = ReturnType<typeof createMareEngine>;

export function createMareEngine(options: EngineOptions) {
  const { root, canvas, imgA, imgB } = options;
  let mode: EngineMode = "boot";
  let gl: MareGl | null = null;
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

  const insets = () =>
    narrow ? { top: 68, bottom: 156, side: 0 } : { top: 84, bottom: 112, side: 48 };

  /** Where a focused item sits on screen: left of its card on wide screens, above the sheet on phones. */
  const focusPoint = () => {
    if (narrow) return { fx: 0.5, fy: 0.3 };
    const { top, bottom } = insets();
    return { fx: 0.38, fy: (top + (H - top - bottom) / 2) / H };
  };

  /** CSS px per picture width at zoom 1. */
  function baseK(scene: SceneId, aspect: number) {
    if (scene !== "salon") return Math.max(W, H / aspect);
    const { top, bottom, side } = insets();
    const k = Math.min(W - side * 2, (H - top - bottom) / aspect);
    return narrow ? Math.min(W * 2.45, (H - top - bottom) / aspect) : k;
  }

  function baseCam(scene: SceneId): Cam {
    if (scene === "salon") {
      const { top, bottom } = insets();
      return cam(0.5, 0.515, 1, 0.5, (top + (H - top - bottom) / 2) / H);
    }
    if (scene === "facade") return cam(narrow ? 0.37 : 0.5, 0.5, 1);
    return cam(0.5, 0.5, 1);
  }

  const fullRes = (scene: SceneId) => q === "high" || (q === "mid" && scene === "salon") || W * dpr > 1800;
  const texWidth = (scene: SceneId) => (fullRes(scene) ? imageOfScene(scene).width : 1600);

  function focusCam(id: ItemId): Cam {
    const s = shapeOf(id);
    const img = imageOfScene("salon");
    const aspect = img.height / img.width;
    const k0 = baseK("salon", aspect);
    const { top, bottom } = insets();
    const availW = narrow ? W : W * 0.56;
    const availH = narrow ? H * 0.5 : H - top - bottom;
    const fill = isZoneItem(id) ? 0.8 : 0.5;
    let z = Math.min((availW * fill) / (2 * s.hw * k0), (availH * fill) / (2 * s.hh * aspect * k0));
    z = clamp(z, 1.25, Math.max(1.25, (1.35 * texWidth("salon")) / k0));
    const { fx, fy } = focusPoint();
    return cam(s.x, s.y, z, fx, fy);
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
    d.cx = clampAxis(d.cx, d.fx, W / k);
    d.cy = clampAxis(d.cy, d.fy, H / (k * side.aspect));
  }

  /* ───────────── Pictures ───────────── */

  const pics = new Map<SceneId, Pic>();
  let loading = 0;
  const queue: SceneId[] = [];

  const picOf = (scene: SceneId) => {
    let p = pics.get(scene);
    if (!p) {
      p = { status: 0, fade: 0, url: "", width: 1, tex: null };
      pics.set(scene, p);
    }
    return p;
  };
  const settled = (scene: SceneId) => picOf(scene).status >= 2;

  function request(scene: SceneId, front = false) {
    const pic = picOf(scene);
    if (pic.status !== 0 || dead) return;
    if (mode === "boot" || loading >= 2) {
      if (!queue.includes(scene)) {
        if (front) queue.unshift(scene);
        else queue.push(scene);
      } else if (front) {
        queue.splice(queue.indexOf(scene), 1);
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
    while (queue.length && loading < 2 && mode !== "boot") {
      const next = queue.shift()!;
      request(next);
    }
  }

  /** Fetch ahead: the other main picture, then every view (they are only shown on demand). */
  function preloadAll() {
    request(A.scene === "facade" ? "salon" : "facade");
    for (const id of ["janela", "salao", "balcao", "terraco", "bar", "adega"] as MareZoneId[]) request(viewScene(id));
  }

  /* ───────────── Overlay state (hover ring, selection, fits, door) ───────────── */

  const hov = { x: 0.5, y: 0.5, hw: 0.05, hh: 0.05, r: 1, a: 0, target: null as Shape | null };
  const sel = { x: 0.5, y: 0.5, hw: 0.05, hh: 0.05, r: 1, a: 0, target: null as Shape | null };
  const fitTarget = TABLE_IDS.map(() => 1);
  const fitNow = TABLE_IDS.map(() => 1);
  let doorTarget = 0;
  let doorNow = 0;

  function glide(o: typeof hov, dt: number, lambda: number) {
    const t = o.target;
    o.a = damp(o.a, t ? 1 : 0, lambda, dt);
    if (!t) return;
    if (o.a < 0.06) {
      o.x = t.x;
      o.y = t.y;
      o.hw = t.hw;
      o.hh = t.hh;
      o.r = t.round;
      return;
    }
    o.x = damp(o.x, t.x, lambda, dt);
    o.y = damp(o.y, t.y, lambda, dt);
    o.hw = damp(o.hw, t.hw, lambda, dt);
    o.hh = damp(o.hh, t.hh, lambda, dt);
    o.r = damp(o.r, t.round, lambda, dt);
  }

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
    const kind = side.scene === "salon" ? 1 : side.scene === "facade" ? 2 : 0;
    const tex = pic.tex ?? gl.blank;
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

  const imgState = { a: "", b: "" };
  function imgLayer(el: HTMLImageElement, side: Side | null, opacity: number, key: "a" | "b") {
    if (!side) {
      el.style.opacity = "0";
      return;
    }
    const pic = picOf(side.scene);
    if (pic.status === 2 && el.dataset.src !== pic.url) {
      el.dataset.src = pic.url;
      el.src = pic.url;
    }
    const d = side.disp;
    const k = side.k;
    const x = d.fx * W - d.cx * k;
    const y = d.fy * H - d.cy * k * side.aspect;
    const sig = `${x.toFixed(1)},${y.toFixed(1)},${k.toFixed(1)},${opacity.toFixed(3)}`;
    if (imgState[key] === sig) return;
    imgState[key] = sig;
    el.style.width = `${k}px`;
    el.style.height = `${k * side.aspect}px`;
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
    el.style.opacity = String(opacity * (pic.status === 2 ? 1 : 0));
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

  function frame(time: number, dt: number) {
    clock += dt;
    for (const pic of pics.values()) if (pic.status === 2 && pic.fade < 1) pic.fade = motion ? Math.min(1, pic.fade + dt / 0.45) : 1;

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
        then?.();
      }
    }
    if (afterCut && clock >= afterCut.at) {
      const fn = afterCut.fn;
      afterCut = null;
      fn();
    }

    glide(hov, dt, 13);
    glide(sel, dt, 9);
    for (let i = 0; i < fitNow.length; i++) fitNow[i] = damp(fitNow[i], fitTarget[i], 7, dt);
    doorNow = damp(doorNow, doorTarget, 9, dt);

    options.onFrame?.(api);

    if (mode === "gl" && gl) {
      const u = gl.uniforms;
      u.uTime.value = time;
      u.uMotion.value = motion ? 1 : 0;
      sideUniforms(A, "A");
      if (B) sideUniforms(B, "B");
      u.uMix.value = mix;
      u.uPivot.value.set(pivot.x, pivot.y);
      u.uPower.value = cut ? cut.power : 0;
      u.uHov.value.set(hov.x, hov.y, hov.hw, hov.hh);
      u.uHovR.value = hov.r;
      u.uHovA.value = hov.a;
      u.uSel.value.set(sel.x, sel.y, sel.hw, sel.hh);
      u.uSelR.value = sel.r;
      u.uSelA.value = sel.a;
      for (let i = 0; i < fitNow.length; i++) u.uFit.value[i] = fitNow[i];
      u.uFitA.value = 1;
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
    narrow = W < 760;
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
  const io = new IntersectionObserver((entries) => setVisible(entries[entries.length - 1].isIntersecting), {
    rootMargin: "120px",
  });
  io.observe(root);
  const onVisibility = () => setVisible(!document.hidden && isOnScreenNow());
  const isOnScreenNow = () => {
    const r = root.getBoundingClientRect();
    return r.bottom > -120 && r.top < window.innerHeight + 120;
  };
  document.addEventListener("visibilitychange", onVisibility);

  function fallback() {
    mode = "img";
    canvas.style.display = "none";
    imgA.style.display = "block";
    imgB.style.display = "block";
    for (const pic of pics.values()) if (pic.status === 1) pic.status = 0; // fetches in flight may be lost
    pump();
    for (const scene of pics.keys()) if (picOf(scene).status === 0) request(scene);
  }

  function boot() {
    q = quality();
    dpr = maxDpr(q);
    motion = !reducedMotion();
    measure();
    A = makeSide(options.initial, baseCam(options.initial));
    request(options.initial, true);
    if (labParam("gl") === 0) {
      fallback(); // lab: /lab/mare?gl=0 shows the <img> fallback
      return;
    }
    import("./gl")
      .then(({ createMareGl }) => {
        if (dead) return;
        try {
          gl = createMareGl(canvas, {
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
    get clock() {
      return clock;
    },
    /** Screen px (relative to the root) of a picture point on the scene on stage. */
    project(u: number, v: number, out: { x: number; y: number }) {
      const d = A.disp;
      out.x = d.fx * W + (u - d.cx) * A.k;
      out.y = d.fy * H + (v - d.cy) * A.k * A.aspect;
      return out;
    },
    /** Screen box (px) of a shape on the scene on stage. */
    projectShape(s: Shape, out: { x: number; y: number; w: number; h: number }) {
      const d = A.disp;
      out.w = s.hw * 2 * A.k;
      out.h = s.hh * 2 * A.k * A.aspect;
      out.x = d.fx * W + (s.x - s.hw - d.cx) * A.k;
      out.y = d.fy * H + (s.y - s.hh - d.cy) * A.k * A.aspect;
      return out;
    },
    /** Picture point under a screen point (px relative to the root). */
    unproject(x: number, y: number) {
      const d = A.disp;
      return { u: d.cx + (x - d.fx * W) / A.k, v: d.cy + (y - d.fy * H) / (A.k * A.aspect) };
    },
    hit(x: number, y: number): ItemId | null {
      if (A.scene !== "salon" || cut) return null;
      const { u, v } = api.unproject(x, y);
      for (const id of ITEMS) {
        const s = shapeOf(id);
        // rounded box test in picture fractions, with the corner rounding approximated
        const dx = Math.abs(u - s.x) / s.hw;
        const dy = Math.abs(v - s.y) / s.hh;
        if (dx > 1 || dy > 1) continue;
        if (s.round > 0.5 && dx * dx + dy * dy > 1.15) continue;
        return id;
      }
      return null;
    },
    hitDoor(x: number, y: number) {
      if (A.scene !== "facade" || cut) return false;
      const { u, v } = api.unproject(x, y);
      return Math.abs(u - DOOR.x) <= DOOR.hw && Math.abs(v - DOOR.y) <= DOOR.hh;
    },
    setHover(id: ItemId | null) {
      hov.target = id ? shapeOf(id) : null;
      if (id && !isZoneItem(id)) request(viewScene(zoneOfItem(id)), true);
    },
    setSelected(id: ItemId | null) {
      sel.target = id ? shapeOf(id) : null;
      if (id) request(viewScene(zoneOfItem(id)), true);
    },
    setFit(values: readonly number[]) {
      for (let i = 0; i < fitTarget.length; i++) fitTarget[i] = values[i] ?? 1;
    },
    setDoorHover(on: boolean) {
      doorTarget = on ? 1 : 0;
    },
    /** Camera onto an item of the cut-away (or back to the whole room). */
    focus(id: ItemId | null, dur = 0.9) {
      if (A.scene !== "salon" || cut) return;
      afterCut = null;
      tweenTo(A, id ? focusCam(id) : baseCam("salon"), dur);
    },
    /** Drag the cut-away by screen px. */
    pan(dx: number, dy: number) {
      if (A.scene !== "salon" || cut) return;
      A.tween = null;
      afterCut = null;
      const d = A.disp;
      A.cam.cx = d.cx - dx / A.k;
      A.cam.cy = d.cy - dy / (A.k * A.aspect);
      A.cam.fx = d.fx;
      A.cam.fy = d.fy;
    },
    /** Facade → salon: push through the doorway, dissolve into the cut-away, pull back to `item` (or the room). */
    enter(item: ItemId | null, then?: () => void) {
      const end = item ? focusCam(item) : baseCam("salon");
      const spec: CutSpec = {
        to: "salon",
        dur: 2.0,
        mix: [0.3, 0.84],
        power: 1,
        fromCam: cam(DOORWAY.x, DOORWAY.y, 2.7),
        fromWin: [0, 0.78],
        toStart: cam(SALON_ENTRANCE.x, SALON_ENTRANCE.y, 2.4),
        toEnd: end,
        toWin: [0.32, 1],
        pivot: { u: DOORWAY.x, v: DOORWAY.y },
        then,
      };
      start(spec);
    },
    /** Salon → facade: step back out through the door. */
    exit(then?: () => void) {
      const c = A.disp;
      start({
        to: "facade",
        dur: 1.4,
        mix: [0.1, 0.8],
        power: 0.6,
        fromCam: { ...c, z: c.z * 0.8 },
        fromWin: [0, 0.8],
        toStart: cam(DOORWAY.x, DOORWAY.y, 2.1),
        toEnd: baseCam("facade"),
        toWin: [0.12, 1],
        pivot: null,
        then,
      });
    },
    /** Salon (zoomed on `item`) → the zone's photo, "sitting down" through the table. */
    toView(zone: MareZoneId, item: ItemId | null, then?: () => void) {
      const s = item ? shapeOf(item) : null;
      const c = A.disp;
      const pv = { x: 0.5, y: 0.5 };
      if (s) {
        api.project(s.x, s.y, pv);
        pv.x /= W;
        pv.y /= H;
      }
      start({
        to: viewScene(zone),
        dur: 1.5,
        mix: [0.2, 0.8],
        power: 0.9,
        fromCam: s ? cam(s.x, s.y, c.z * 1.8, c.fx, c.fy) : { ...c, z: c.z * 1.6 },
        fromWin: [0, 0.72],
        toStart: cam(0.5, 0.56, 1.32, clamp(pv.x, 0.2, 0.8), clamp(pv.y, 0.2, 0.8)),
        toEnd: baseCam(viewScene(zone)),
        toWin: [0.22, 1],
        pivot: s ? { u: s.x, v: s.y } : null,
        then,
      });
    },
    /** View → another view: a short push dissolve. */
    switchView(zone: MareZoneId, then?: () => void) {
      const c = A.disp;
      start({
        to: viewScene(zone),
        dur: 0.85,
        mix: [0.08, 0.86],
        power: 0.45,
        fromCam: { ...c, z: c.z * 1.16 },
        fromWin: [0, 0.8],
        toStart: cam(0.5, 0.5, 1.12),
        toEnd: baseCam(viewScene(zone)),
        toWin: [0.12, 1],
        pivot: null,
        then,
      });
    },
    /**
     * View (or facade) → salon, landing zoomed on `item`. `easeOut`: then glide back out to the
     * whole room (the "Voltar ao salão" move).
     */
    toSalon(item: ItemId | null, easeOut: boolean, then?: () => void) {
      if (A.scene === "facade") return api.enter(item, then);
      const c = A.disp;
      const land = item ? focusCam(item) : baseCam("salon");
      start({
        to: "salon",
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
          if (easeOut && item) {
            afterCut = {
              at: clock + (motion ? 0.3 : 0),
              fn: () => tweenTo(A, baseCam("salon"), 1.1, easeInOutCubic),
            };
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
    /** Debug/lab: screen px of an item's centre. */
    itemCenter(id: ItemId) {
      const s = shapeOf(id);
      return api.project(s.x, s.y, { x: 0, y: 0 });
    },
  };

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
    if (spec.to === A.scene && spec.to !== "salon") {
      spec.then?.();
      return;
    }
    request(spec.to, true);
    if (settled(spec.to)) beginCut(spec);
    else pending = spec;
  }

  boot();
  return api;
}
