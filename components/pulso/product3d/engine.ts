/**
 * The Pulso One stage: renderer, studio light, camera, orbit, picking, explode, colourways and
 * the working layer. Plain three.js, driven only by lib/ticker. The React shell (ProductStage)
 * owns the DOM; it gives the engine a canvas, two overlay elements to position, and callbacks.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PULSO_ONE_COLORS } from "@/content/pulso";
import { onFrame } from "@/lib/ticker";
import { clamp, damp, easeInOutCubic } from "@/lib/math";
import { maxDpr, quality } from "@/lib/env";
import { buildProduct } from "./build";
import { createContactShadow, createWorkingFx } from "./fx";
import { CENTER_Y, DIM, INNER, PART_IDS, X, exploreYaw, explorePitch, extents, partOffset, swivelAt, type Extents, type Offset, type PartId } from "./model";

export type StageCallbacks = {
  /** Every frame the explode amount changes. */
  onExplode(value: number): void;
  /** The toggle's direction changed (true = heading apart / apart). */
  onOpen(open: boolean): void;
  onPart(id: PartId | null): void;
  onHover(id: PartId | null): void;
  onLost(): void;
};

export type StageOptions = {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  /** Positioned over the hovered part. */
  hoverEl: HTMLElement;
  /** Positioned over the focused part. */
  focusEl: HTMLElement;
  reduced: boolean;
  /** `?t=` is set: no auto-rotate, no float. */
  frozen: boolean;
  colorId?: string;
  cb: StageCallbacks;
};

export type Stage = ReturnType<typeof createStage>;

const ACCENT = new THREE.Color("#5b4bff");
const STEEL = new THREE.Color("#a7abb3");
const WHITE = new THREE.Color("#ffffff");
const FOV = 32;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

export function createStage(o: StageOptions) {
  const { canvas, host, cb } = o;
  const q = quality();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(maxDpr(q));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.035);
  room.dispose();
  pmrem.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.95;

  const key = new THREE.DirectionalLight("#ffffff", 1.1);
  key.position.set(-14, 26, 18);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#e9e6ff", 0.6);
  rim.position.set(20, 8, -16);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);

  /* -------- the product */
  const P = buildProduct();
  const stand = new THREE.Group();
  scene.add(stand);
  stand.add(P.root);
  P.root.position.y = -CENTER_Y;
  const floorY = -CENTER_Y - DIM.R - 2.8;
  const shadow = createContactShadow(46, 16, q === "low" ? 256 : 512);
  shadow.group.position.y = floorY;
  scene.add(shadow.group);
  const fx = createWorkingFx(P.cups, { noise: "#8a8f9c", anti: "#00c8f0" });
  const dots: THREE.Mesh[] = [];
  for (let i = 0; i < P.mics.length; i++) {
    const d = new THREE.Mesh(fx.dotGeo, fx.dotMat);
    d.renderOrder = 4;
    d.visible = false;
    P.mics[i].add(d);
    dots.push(d);
  }
  const noCast: THREE.Object3D[] = [...fx.roots, ...dots];
  P.root.traverse((ob) => {
    if (ob.userData.fx) noCast.push(ob);
  });

  /* -------- colourways */
  const cur = { body: new THREE.Color(), ring: new THREE.Color(), cushion: new THREE.Color(), band: new THREE.Color() };
  const from = { body: new THREE.Color(), ring: new THREE.Color(), cushion: new THREE.Color(), band: new THREE.Color() };
  const to = { body: new THREE.Color(), ring: new THREE.Color(), cushion: new THREE.Color(), band: new THREE.Color() };
  let colorT = 1;
    const pickColors = (id?: string) => PULSO_ONE_COLORS.find((c) => c.id === id) ?? PULSO_ONE_COLORS[0];
  const applyColors = () => {
    const f = P.finish;
    f.body.color.copy(cur.body).lerp(WHITE, 0.2);
    f.face.color.copy(cur.body).lerp(WHITE, 0.1);
    f.ring.color.copy(cur.ring);
    f.ring.emissive.copy(cur.ring);
    (f.halo.uniforms.uColor.value as THREE.Color).copy(cur.ring);
    f.cushion.color.copy(cur.cushion);
    f.cushion.sheenColor.copy(cur.cushion).lerp(WHITE, 0.3);
    f.pad.color.copy(cur.cushion);
    f.pad.sheenColor.copy(cur.cushion).lerp(WHITE, 0.3);
    f.scrim.color.copy(cur.cushion).multiplyScalar(0.55);
    f.scrim.sheenColor.copy(cur.cushion).multiplyScalar(0.8);
    f.band.color.copy(cur.band).multiplyScalar(0.78);
    f.arm.color.copy(cur.band).lerp(STEEL, 0.5).multiplyScalar(0.8);
    f.knob.color.copy(f.arm.color);
    f.block.color.copy(f.arm.color);
  };
  {
    const c = pickColors(o.colorId);
    cur.body.set(c.body);
    cur.ring.set(c.ring);
    cur.cushion.set(c.cushion);
    cur.band.set(c.band);
    applyColors();
  }
  // Ring and mic own their emissive; all others get the hover tint through emissive.
  const tintable = new Map<PartId, THREE.MeshStandardMaterial[]>();
  for (const id of PART_IDS)
    tintable.set(
      id,
      P.parts[id].mats.filter((m): m is THREE.MeshStandardMaterial => m !== P.finish.ring && m !== P.finish.mic && "emissive" in m),
    );

  /* -------- state */
  const S = {
    w: 1,
    h: 1,
    visible: false,
    explode: 0,
    exFrom: 0,
    exTo: 0,
    exT: 1,
    exDur: 0,
    lastExplode: -1,
    open: false,
    part: null as PartId | null,
    focusSide: 0,
    hover: null as PartId | null,
    hoverSide: 0,
    working: false,
    workAmt: 0,
    focusAmt: 0,
    yaw: 0,
    pitch: 0,
    yawVel: 0,
    idleSince: 0,
    now: 0,
    camDist: 60,
    hoverDirty: false,
    px: 0,
    py: 0,
    pointerIn: false,
  };
  const hl = new Map<PartId, number>(PART_IDS.map((id) => [id, 0]));
  const lastOpacity = new Map<PartId, number>(PART_IDS.map((id) => [id, 1]));
  const target = new THREE.Vector3();
  const goal = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const off: Offset = { x: 0, y: 0, r: 0 };
  const box: Extents = { x: 0, top: 0, bottom: 0 };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hits: THREE.Intersection[] = [];

  /* -------- layout */
  const layout = { offX: 0, offY: 0, availW: 1, availH: 1 };
  const resize = () => {
    const r = host.getBoundingClientRect();
    S.w = Math.max(1, Math.round(r.width));
    S.h = Math.max(1, Math.round(r.height));
    renderer.setSize(S.w, S.h, false);
    camera.aspect = S.w / S.h;
    // Leave room for the overlay UI: the parts list on the right (wide), the controls below.
    // Must match the CSS in ProductStage (`md:`), which is what decides whether the parts list
    // sits beside the product. Testing the stage's own width let the list cover the right cup
    // when the stage was a narrow column on a wide screen.
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const insetR = wide ? 250 : 0;
    const insetB = wide ? 96 : 205;
    const insetT = wide ? 40 : 70;
    layout.availW = S.w - insetR;
    layout.availH = S.h - insetB - insetT;
    layout.offX = insetR / 2;
    layout.offY = (insetB - insetT) / 2;
    camera.setViewOffset(S.w, S.h, layout.offX, layout.offY, S.w, S.h);
    camera.updateProjectionMatrix();
    if (!S.visible) render(S.now);
  };

  const fitDistance = (ex: number) => {
    const e = extents(ex, box);
    const fillH = layout.availH / S.h;
    const fillW = layout.availW / S.w;
    const halfW = e.x * 0.86 + 2.6;
    const dV = (e.top - e.bottom) / 2 / (TAN * 0.92 * fillH);
    const dH = halfW / (TAN * (S.w / S.h) * 0.94 * fillW);
    return Math.max(dV, dH) + 4;
  };

  /* -------- pose */
  const pose = () => {
    for (let i = 0; i < PART_IDS.length; i++) {
      const id = PART_IDS[i];
      const p = P.parts[id];
      partOffset(id, 1, S.explode, off);
      for (let g = 0; g < p.groups.length; g++) {
        p.groups[g].position.x = id === "arco" ? 0 : off.x;
        p.groups[g].position.y = off.y;
      }
    }
    const sw = swivelAt(S.explode);
    for (let i = 0; i < P.swivels.length; i++) P.swivels[i].rotation.y = sw * (P.swivels[i].userData.sign as number);
    partOffset("microfones", 1, S.explode, off);
    for (let i = 0; i < P.mics.length; i++) {
      const m = P.mics[i];
      const r = (m.userData.r0 as number) + off.r;
      const a = m.userData.angle as number;
      m.position.y = Math.cos(a) * r;
      m.position.z = Math.sin(a) * r;
      // The sampling dot sits on the shell's skin while closed, on the capsule once apart.
      const d = dots[i];
      const k = 1 - clamp(off.r / 1.35);
      d.position.set(0.25 * k, Math.cos(a) * 0.66 * k, Math.sin(a) * 0.66 * k);
    }
  };

  /* -------- picking */
  const pick = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    hits.length = 0;
    ray.intersectObjects(P.pickables, false, hits);
    for (let i = 0; i < hits.length; i++) {
      const ob = hits[i].object;
      // Ghosted parts let the pointer through to the focused one.
      if (S.part && S.focusAmt > 0.5 && ob.userData.part !== S.part) continue;
      return ob;
    }
    return null;
  };

  /* -------- render */
  let frameN = 0;
  const render = (time: number) => {
    stand.rotation.y = exploreYaw(S.explode) + S.yaw;
    const pitch = explorePitch(S.explode) + S.pitch;
    camera.position.set(target.x, target.y + Math.sin(pitch) * S.camDist, target.z + Math.cos(pitch) * S.camDist);
    camera.lookAt(target);
    if (frameN++ % 2 === 0 || !S.visible) shadow.update(renderer, scene, noCast);
    renderer.render(scene, camera);
    placeLabel(o.hoverEl, S.hover, S.hoverSide);
    placeLabel(o.focusEl, S.part, S.focusSide);
    void time;
  };

  const placeLabel = (el: HTMLElement, id: PartId | null, side: number) => {
    if (!id) return;
    const p = P.parts[id];
    const a = p.anchors[Math.min(side, p.anchors.length - 1)];
    a.getWorldPosition(tmp);
    tmp.project(camera);
    const x = (tmp.x * 0.5 + 0.5) * S.w;
    const y = (-tmp.y * 0.5 + 0.5) * S.h;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };

  /* -------- frame */
  const frame = (time: number, dt: number) => {
    S.now = time;
    // Explode tween.
    if (S.exT < 1) {
      S.exT = S.exDur <= 0 ? 1 : Math.min(1, S.exT + dt / S.exDur);
      S.explode = S.exFrom + (S.exTo - S.exFrom) * easeInOutCubic(S.exT);
    }
    if (Math.abs(S.explode - S.lastExplode) > 1e-4) {
      S.lastExplode = S.explode;
      pose();
      cb.onExplode(S.explode);
    }
    // Colourway tween.
    if (colorT < 1) {
      colorT = Math.min(1, colorT + dt / 0.7);
      const k = easeInOutCubic(colorT);
      cur.body.copy(from.body).lerp(to.body, k);
      cur.ring.copy(from.ring).lerp(to.ring, k);
      cur.cushion.copy(from.cushion).lerp(to.cushion, k);
      cur.band.copy(from.band).lerp(to.band, k);
      applyColors();
    }
    // Orbit: inertia, then a slow turntable when left alone.
    const idle = time - S.idleSince > 4 && !S.part && !o.reduced && !o.frozen && !drag.active;
    if (!drag.active) {
      S.yawVel = damp(S.yawVel, idle ? 0.16 : 0, idle ? 0.8 : 3.2, dt);
      S.yaw += S.yawVel * dt;
      S.pitch = damp(S.pitch, clamp(S.pitch, -0.2, 0.45), 6, dt);
    }
    // Float.
    P.root.position.y = -CENTER_Y + (o.reduced || o.frozen ? 0 : Math.sin(time * 0.9) * 0.12);

    // Camera target and distance.
    S.focusAmt = damp(S.focusAmt, S.part ? 1 : 0, 5, dt);
    if (S.part) {
      const p = P.parts[S.part];
      p.anchors[Math.min(S.focusSide, p.anchors.length - 1)].getWorldPosition(goal);
      const narrow = Math.min(1, layout.availW / Math.max(1, layout.availH));
      const d = (p.size / (TAN * narrow)) * 1.9 + 6;
      S.camDist = damp(S.camDist, d, 4, dt);
    } else {
      const e = extents(S.explode, box);
      goal.set(0, (e.top + e.bottom) / 2 - CENTER_Y, 0);
      S.camDist = damp(S.camDist, fitDistance(S.explode), 4, dt);
    }
    target.x = damp(target.x, goal.x, 4, dt);
    target.y = damp(target.y, goal.y, 4, dt);
    target.z = damp(target.z, goal.z, 4, dt);

    // Highlight and ghosting.
    for (let i = 0; i < PART_IDS.length; i++) {
      const id = PART_IDS[i];
      const want = id === S.hover && id !== S.part ? 1 : 0;
      const h = damp(hl.get(id)!, want, 10, dt);
      hl.set(id, h);
      const ms = tintable.get(id)!;
      for (let j = 0; j < ms.length; j++) ms[j].emissive.setRGB(ACCENT.r * h * 0.05, ACCENT.g * h * 0.05, ACCENT.b * h * 0.05);
      const op = id === S.part ? 1 : 1 - 0.86 * S.focusAmt;
      if (Math.abs(op - lastOpacity.get(id)!) > 1e-3) {
        lastOpacity.set(id, op);
        const all = P.parts[id].mats;
        for (let j = 0; j < all.length; j++) {
          all[j].opacity = op;
          all[j].depthWrite = op > 0.98;
        }
        if (id === "anel") P.finish.halo.uniforms.uOpacity.value = 0.32 * op;
      }
    }

    // Working layer.
    S.workAmt = damp(S.workAmt, S.working ? 1 : 0, o.reduced ? 60 : 4, dt);
    const w = S.workAmt;
    const ft = o.reduced ? 1.2 : time; // reduced motion: the waves hold still
    const on = w > 0.01;
    const breathe = o.reduced ? 0.6 : 0.5 + 0.5 * Math.sin(time * 2.4);
    P.finish.ring.emissiveIntensity = 1.5 + w * (0.4 + 1.6 * breathe);
    if (S.part !== "anel") P.finish.halo.uniforms.uOpacity.value = (0.3 + w * 0.3 * breathe) * (1 - 0.86 * S.focusAmt);
    fx.dotMat.opacity = w;
    for (let s = 0; s < 2; s++) {
      fx.roots[s].visible = on;
      if (!on) continue;
      partOffset("concha", 1, S.explode, off);
      const face = X.face + off.x;
      partOffset("driver", 1, S.explode, off);
      const drv = X.shellIn - 0.35 + off.x;
      partOffset("almofada", 1, S.explode, off);
      const ear = 1.4 + Math.min(0, off.x) * 0.3;
      const n = fx.noise[s].material.uniforms;
      n.uTime.value = ft;
      n.uX0.value = face + 9.5;
      n.uX1.value = face + 0.25;
      n.uOpacity.value = 0.85 * w;
      const l = fx.leak[s].material.uniforms;
      l.uTime.value = ft;
      l.uX0.value = drv;
      l.uX1.value = ear;
      l.uAmp.value = 0.7;
      l.uOpacity.value = 0.38 * w;
      const a = fx.anti[s].material.uniforms;
      a.uTime.value = ft;
      a.uX0.value = drv;
      a.uX1.value = ear;
      a.uAmp.value = 0.7;
      a.uOpacity.value = 0.95 * w;
      for (let k = 0; k < 4; k++) {
        const r = fx.rings[s * 4 + k];
        const ph = (((ft / 1.8 + k / 4) % 1) + 1) % 1;
        r.position.x = drv - (drv - ear) * ph;
        const rad = 1.7 + 1.3 * ph;
        r.scale.set(rad, rad, rad);
        const m = fx.ringMat[s * 4 + k];
        m.color.copy(cur.ring);
        m.opacity = Math.sin(Math.PI * ph) * 0.75 * w;
      }
    }
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      d.visible = on;
      if (!on) continue;
      const pulse = Math.pow(0.5 + 0.5 * Math.sin(7.0 * ft - i * 1.7), 6);
      const sc = 0.7 + 0.9 * pulse;
      d.scale.set(sc, sc, sc);
    }
    P.finish.mic.emissiveIntensity = w * (0.4 + 1.4 * Math.pow(0.5 + 0.5 * Math.sin(7.0 * ft), 6));

    // Hover (mouse only), at most once per frame.
    if (S.hoverDirty && !drag.active) {
      S.hoverDirty = false;
      const ob = S.pointerIn ? pick(S.px, S.py) : null;
      const id = (ob?.userData.part as PartId | undefined) ?? null;
      const side = (ob?.userData.side as number | undefined) ?? 0;
      canvas.style.cursor = id ? "pointer" : "grab";
      if (id !== S.hover || side !== S.hoverSide) {
        const changed = id !== S.hover;
        S.hover = id;
        S.hoverSide = side;
        if (changed) cb.onHover(id);
      }
    }

    render(time);
  };

  /* -------- input */
  const drag = { active: false, id: -1, x: 0, y: 0, sx: 0, sy: 0, moved: false, t: 0, type: "mouse" };
  const poke = () => {
    S.idleSince = S.now;
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag.id !== -1) return;
    drag.id = e.pointerId;
    drag.x = drag.sx = e.clientX;
    drag.y = drag.sy = e.clientY;
    drag.moved = false;
    drag.t = performance.now();
    drag.type = e.pointerType;
    poke();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse") {
      S.px = e.clientX;
      S.py = e.clientY;
      S.pointerIn = true;
      S.hoverDirty = true;
    }
    if (e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved) {
      const tx = e.clientX - drag.sx;
      const ty = e.clientY - drag.sy;
      if (Math.hypot(tx, ty) < 5) return;
      // Touch: only a clearly horizontal gesture turns the object; vertical ones belong to the page.
      if (drag.type !== "mouse" && Math.abs(ty) > Math.abs(tx) * 0.8) {
        drag.id = -1;
        return;
      }
      drag.moved = true;
      drag.active = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      if (S.hover) {
        S.hover = null;
        cb.onHover(null);
      }
    }
    const now = performance.now();
    const dts = Math.max(0.008, (now - drag.t) / 1000);
    drag.t = now;
    const dyaw = dx * 0.0085;
    S.yaw += dyaw;
    S.yawVel = S.yawVel * 0.4 + (dyaw / dts) * 0.6;
    if (drag.type === "mouse") S.pitch = clamp(S.pitch + dy * 0.004, -0.3, 0.55);
    drag.x = e.clientX;
    drag.y = e.clientY;
    poke();
    if (!S.visible) render(S.now);
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== drag.id) return;
    const wasDrag = drag.moved;
    drag.id = -1;
    drag.active = false;
    poke();
    if (performance.now() - drag.t > 80) S.yawVel *= 0.2; // held still before letting go
    if (wasDrag) return;
    const ob = pick(e.clientX, e.clientY);
    if (ob) {
      setPart(ob.userData.part as PartId, ob.userData.side as number);
    } else if (S.part) setPart(null);
  };
  const onCancel = (e: PointerEvent) => {
    if (e.pointerId !== drag.id) return;
    drag.id = -1;
    drag.active = false;
  };
  const onLeave = () => {
    S.pointerIn = false;
    S.hoverDirty = true;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && S.part) setPart(null);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("pointerleave", onLeave);
  window.addEventListener("keydown", onKey);

  /* -------- visibility */
  let unsub: (() => void) | null = null;
  let onScreen = false;
  const sync = () => {
    const want = onScreen && document.visibilityState === "visible";
    if (want && !unsub) unsub = onFrame(frame);
    if (!want && unsub) {
      unsub();
      unsub = null;
    }
    S.visible = want;
  };
  const io = new IntersectionObserver((es) => {
    onScreen = es[es.length - 1].isIntersecting;
    sync();
  });
  io.observe(host);
  document.addEventListener("visibilitychange", sync);
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const onLost = (e: Event) => {
    e.preventDefault();
    cb.onLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  /* -------- API */
  function setExplode(v: number, how: "instant" | "ease" | "tween" = "tween") {
    v = clamp(v);
    S.exFrom = S.explode;
    S.exTo = v;
    S.exT = 0;
    const span = Math.abs(v - S.explode);
    S.exDur = o.reduced || how === "instant" ? 0 : how === "ease" ? 0.35 : 0.5 + 1.3 * span;
    const open = v > 0.5 || (v > S.explode && v > 0.02);
    if (open !== S.open) {
      S.open = open;
      cb.onOpen(open);
    }
    poke();
  }
  function setPart(id: PartId | null, side?: number) {
    if (id === S.part) return;
    // The camera sees the left cup's inner side and the right cup's outer side.
    S.focusSide = side ?? (id === "driver" || id === "almofada" ? 1 : 0);
    S.part = id;
    poke();
    cb.onPart(id);
  }

  resize();
  pose();
  S.camDist = fitDistance(0);
  goal.set(0, 0, 0);
  render(0);

  return {
    setExplode,
    toggleExplode() {
      setExplode(S.exTo > 0.5 ? 0 : 1, "tween");
    },
    setPart,
    /** Focusing an inner part from the list opens the product enough to see it. */
    focusFromList(id: PartId | null) {
      if (id && INNER.has(id) && S.exTo < 0.6) setExplode(1, "tween");
      setPart(id);
    },
    /** Highlight a part from the DOM list (no camera move). */
    setHover(id: PartId | null) {
      if (id === S.hover) return;
      S.hover = id;
      S.hoverSide = 0;
      cb.onHover(id);
    },
    setWorking(on: boolean) {
      S.working = on;
      poke();
    },
    setColor(id?: string) {
      const c = pickColors(id);
      from.body.copy(cur.body);
      from.ring.copy(cur.ring);
      from.cushion.copy(cur.cushion);
      from.band.copy(cur.band);
      to.body.set(c.body);
      to.ring.set(c.ring);
      to.cushion.set(c.cushion);
      to.band.set(c.band);
      colorT = o.reduced ? 0.999 : 0;
    },
    get explode() {
      return S.explode;
    },
    dispose() {
      unsub?.();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      P.dispose();
      fx.dispose();
      shadow.dispose();
      envRT.dispose();
      renderer.dispose();
    },
  };
}
