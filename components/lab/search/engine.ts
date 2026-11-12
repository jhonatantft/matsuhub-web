/**
 * The semantic-search map: every help-center passage as a glowing point at its PCA position,
 * faint lines to its nearest neighbours, the question flying in as a new point and lines
 * growing to the passages it matched. Plain three.js on the shared ticker. The shell owns the
 * pipeline phase (0..4) and the query; this file only draws them.
 */
import * as THREE from "three";
import { maxDpr, quality } from "@/lib/env";
import { clamp, damp, lerp, seg } from "@/lib/math";
import { onFrame } from "@/lib/ticker";

export type SearchStageOptions = {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  /** n × 3, radius ≤ 1. */
  coords: Float32Array;
  /** Topic index of each passage. */
  topics: readonly number[];
  /** Pairs [i, j] for the constellation lines. */
  links: readonly (readonly [number, number])[];
  topicLabels: readonly (HTMLElement | null)[];
  tooltip: HTMLElement | null;
  reduced: boolean;
  frozen: boolean;
  onHover(i: number | null): void;
  onPick(i: number): void;
  onInteract(): void;
  onLost(): void;
};

export type SearchStage = ReturnType<typeof createSearchStage>;

const FOV = 34;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
const R = 1.55;
const TOPIC_COLORS = ["#7fb3a3", "#a3b37f", "#b8a27f", "#8f98b8"].map((c) => new THREE.Color(c));
const ACC = new THREE.Color("#b9ff4b");
const MINT = new THREE.Color("#3ef2c4");
const WARM = new THREE.Color("#ffd08a");

const VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
uniform float uPx;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPx / -mv.z;
  vColor = aColor;
  vAlpha = aAlpha;
}`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.4, 0.28, d);
  float halo = pow(1.0 - d, 2.4) * 0.5;
  gl_FragColor = vec4(vColor * (core + halo), (core + halo) * vAlpha);
  #include <colorspace_fragment>
}`;

export function createSearchStage(o: SearchStageOptions) {
  const { canvas, host } = o;
  const q = quality();
  const n = o.topics.length;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== "low", alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(maxDpr(q), q === "low" ? 1 : 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const world = new THREE.Group();
  scene.add(world);
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  /* ---------------------------------------------------------------- frame of reference */
  const shell = new THREE.LineSegments(
    own(new THREE.EdgesGeometry(own(new THREE.IcosahedronGeometry(R * 1.02, 1)))),
    own(new THREE.LineBasicMaterial({ color: "#3ef2c4", transparent: true, opacity: 0.06 })),
  );
  world.add(shell);
  const ring = new THREE.Mesh(
    own(new THREE.RingGeometry(R * 0.8, R * 0.815, 96).rotateX(-Math.PI / 2)),
    own(new THREE.MeshBasicMaterial({ color: "#b9ff4b", transparent: true, opacity: 0.12, side: THREE.DoubleSide })),
  );
  ring.position.y = -R * 1.05;
  world.add(ring);

  /* ---------------------------------------------------------------- points (passages + the question) */
  const count = n + 1;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < n * 3; i++) pos[i] = o.coords[i] * R;
  const size = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const alpha = new Float32Array(count);
  const geo = own(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 2);
  const mat = own(
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uPx: { value: 600 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const points = new THREE.Points(geo, mat);
  world.add(points);

  /* constellation: each passage to its nearest neighbours */
  const linkPos = new Float32Array(o.links.length * 6);
  o.links.forEach(([a, b], k) => {
    for (let c = 0; c < 3; c++) {
      linkPos[k * 6 + c] = pos[a * 3 + c];
      linkPos[k * 6 + 3 + c] = pos[b * 3 + c];
    }
  });
  const linkGeo = own(new THREE.BufferGeometry());
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  const linkMat = own(new THREE.LineBasicMaterial({ color: "#a6d8c6", transparent: true, opacity: 0.11 }));
  world.add(new THREE.LineSegments(linkGeo, linkMat));

  /* result lines: question → each hit */
  const hitPos = new Float32Array(3 * 6);
  const hitGeo = own(new THREE.BufferGeometry());
  hitGeo.setAttribute("position", new THREE.BufferAttribute(hitPos, 3));
  const hitMat = own(new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: 0.85 }));
  const hitLines = new THREE.LineSegments(hitGeo, hitMat);
  hitLines.frustumCulled = false;
  world.add(hitLines);

  /* ---------------------------------------------------------------- state */
  const S = {
    w: 1,
    h: 1,
    visible: false,
    yaw: 0.6,
    pitch: 0.28,
    spin: 0,
    dragging: false,
    moved: 0,
    px: 0,
    py: 0,
    pointer: new THREE.Vector2(),
    pointerIn: false,
    pointerDirty: false,
    hover: -1,
    picked: -1,
    phase: 0,
    query: null as null | [number, number, number],
    hits: [] as number[],
    answered: false,
    lost: false,
    dirty: true,
  };
  const target = new THREE.Vector3();
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.07 };

  /* topic label anchors: centroid of each topic, lifted a little */
  const topicCount = Math.max(...o.topics) + 1;
  const centroids = new Float32Array(topicCount * 3);
  const per = new Float32Array(topicCount);
  for (let i = 0; i < n; i++) {
    const t = o.topics[i];
    per[t]++;
    for (let k = 0; k < 3; k++) centroids[t * 3 + k] += pos[i * 3 + k];
  }
  for (let t = 0; t < topicCount; t++) for (let k = 0; k < 3; k++) centroids[t * 3 + k] /= per[t] || 1;
  const lx = new Float32Array(topicCount);
  const ly = new Float32Array(topicCount);

  function place(el: HTMLElement | null | undefined, x: number, y: number, z: number, opacity: number, dy = 0) {
    if (!el) return;
    v.set(x, y, z).applyMatrix4(world.matrixWorld).project(camera);
    const sx = (v.x * 0.5 + 0.5) * S.w;
    const sy = (-v.y * 0.5 + 0.5) * S.h + dy;
    el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) translate(-50%,-100%)`;
    el.style.opacity = (v.z > 1 ? 0 : opacity).toFixed(2);
  }

  /* ---------------------------------------------------------------- frame */
  function update(time: number, dt: number) {
    const snap = o.reduced || dt >= 1;
    if (!S.dragging && !o.reduced && !o.frozen && S.hover < 0) S.spin += dt * 0.1;
    world.rotation.y = S.yaw + S.spin;
    world.rotation.x = S.pitch;

    const ph = S.phase;
    const qIn = seg(ph, 1, 2); // question flies in
    const grow = seg(ph, 2, 3); // lines reach the hits
    const pulse = o.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * 4);

    for (let i = 0; i < n; i++) {
      const rank = S.hits.indexOf(i);
      const lit = rank >= 0 && S.answered ? clamp(grow * 3 - rank) : 0;
      c.copy(TOPIC_COLORS[o.topics[i] % TOPIC_COLORS.length]).lerp(ACC, lit);
      if (i === S.hover || i === S.picked) c.lerp(MINT, 0.6);
      color[i * 3] = c.r;
      color[i * 3 + 1] = c.g;
      color[i * 3 + 2] = c.b;
      const base = 0.11 + lit * (0.08 + 0.025 * pulse) + (i === S.hover || i === S.picked ? 0.05 : 0);
      size[i] = snap ? base : damp(size[i] || base, base, 10, dt);
      alpha[i] = S.query && rank < 0 && grow > 0 ? lerp(1, 0.45, grow) : 1;
    }

    /* the question: from in front of the camera to its place on the map */
    const qi = n;
    if (S.query && ph >= 1) {
      const e = 1 - Math.pow(1 - qIn, 3);
      const [x, y, z] = S.query;
      // start: between the map and the viewer (camera position in the map's own space)
      v.copy(camera.position);
      world.worldToLocal(v).normalize();
      pos[qi * 3] = lerp(v.x * R * 1.9, x * R, e);
      pos[qi * 3 + 1] = lerp(v.y * R * 1.9 + R * 0.4, y * R, e);
      pos[qi * 3 + 2] = lerp(v.z * R * 1.9, z * R, e);
      MINT.toArray(color, qi * 3);
      size[qi] = 0.22 + 0.05 * pulse;
      alpha[qi] = clamp(qIn * 3);
    } else {
      size[qi] = 0;
      alpha[qi] = 0;
    }

    /* result lines */
    hitMat.color.copy(S.answered ? ACC : WARM);
    hitMat.opacity = S.answered ? 0.85 : 0.45;
    for (let k = 0; k < 3; k++) {
      const h = S.hits[k];
      const g = clamp(grow * 3 - k);
      const o6 = k * 6;
      if (!S.query || h === undefined || g <= 0) {
        hitPos.fill(0, o6, o6 + 6);
        continue;
      }
      for (let a = 0; a < 3; a++) {
        const from = pos[qi * 3 + a];
        hitPos[o6 + a] = from;
        hitPos[o6 + 3 + a] = lerp(from, pos[h * 3 + a], g);
      }
    }
    hitGeo.attributes.position.needsUpdate = true;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;

    /* camera */
    const aspect = S.w / S.h;
    const r = R * 1.25;
    const dist = Math.max(r / TAN, r / (TAN * aspect)) * 1.02;
    camera.position.set(0, 0, dist);
    camera.lookAt(target);
    world.updateMatrixWorld();

    /* hover (mouse) */
    if (S.pointerDirty && S.pointerIn && !S.dragging) {
      S.pointerDirty = false;
      raycaster.setFromCamera(S.pointer, camera);
      const hit = raycaster.intersectObject(points, false).find((x) => x.index !== undefined && x.index < n);
      const idx = hit?.index ?? -1;
      if (idx !== S.hover) {
        S.hover = idx;
        o.onHover(idx < 0 ? null : idx);
      }
    }

    /* labels */
    // Topic labels at their centroids; a label that would sit on top of another moves down.
    for (let t = 0; t < topicCount; t++) {
      v.set(centroids[t * 3], centroids[t * 3 + 1] + 0.3, centroids[t * 3 + 2]).applyMatrix4(world.matrixWorld).project(camera);
      lx[t] = (v.x * 0.5 + 0.5) * S.w;
      ly[t] = (-v.y * 0.5 + 0.5) * S.h;
    }
    for (let a = 0; a < topicCount; a++)
      for (let b = 0; b < topicCount; b++)
        if (a !== b && ly[b] >= ly[a] && Math.abs(lx[a] - lx[b]) < 150 && ly[b] - ly[a] < 26) ly[b] = ly[a] + 26;
    for (let t = 0; t < topicCount; t++) {
      const el = o.topicLabels[t];
      if (el) el.style.transform = `translate3d(${lx[t].toFixed(1)}px,${ly[t].toFixed(1)}px,0) translate(-50%,-100%)`;
      if (el) el.style.opacity = "0.95";
    }
    const tip = S.hover >= 0 ? S.hover : S.picked;
    if (tip >= 0) place(o.tooltip, pos[tip * 3], pos[tip * 3 + 1], pos[tip * 3 + 2], 1, -14);
    else if (o.tooltip) o.tooltip.style.opacity = "0";

    renderer.render(scene, camera);
  }

  /* ---------------------------------------------------------------- size, visibility, loop */
  const resize = () => {
    const r = host.getBoundingClientRect();
    S.w = Math.max(1, r.width);
    S.h = Math.max(1, r.height);
    renderer.setSize(S.w, S.h, false);
    camera.aspect = S.w / S.h;
    camera.updateProjectionMatrix();
    mat.uniforms.uPx.value = (S.h * renderer.getPixelRatio()) / (2 * TAN);
    S.dirty = true;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let stop: (() => void) | null = null;
  const frame = (time: number, dt: number) => {
    if (S.lost) return;
    if (o.reduced && !S.dirty && !S.dragging) return;
    S.dirty = false;
    update(time, dt);
  };
  const sync = () => {
    const run = S.visible && document.visibilityState === "visible" && !S.lost;
    if (run && !stop) stop = onFrame(frame);
    else if (!run && stop) {
      stop();
      stop = null;
    }
  };
  const io = new IntersectionObserver(([e]) => {
    S.visible = e.isIntersecting;
    sync();
  });
  io.observe(host);
  document.addEventListener("visibilitychange", sync);

  /* ---------------------------------------------------------------- pointer: orbit, hover, pick */
  const toNdc = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    S.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const down = (e: PointerEvent) => {
    S.dragging = true;
    S.moved = 0;
    S.px = e.clientX;
    S.py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    o.onInteract();
  };
  const move = (e: PointerEvent) => {
    toNdc(e);
    S.pointerIn = e.pointerType === "mouse";
    S.pointerDirty = true;
    S.dirty = true;
    if (!S.dragging) return;
    const dx = e.clientX - S.px;
    const dy = e.clientY - S.py;
    S.moved += Math.abs(dx) + Math.abs(dy);
    S.yaw += dx * 0.008;
    S.pitch = clamp(S.pitch + dy * 0.006, -1.1, 1.1);
    S.px = e.clientX;
    S.py = e.clientY;
  };
  const up = (e: PointerEvent) => {
    const tap = S.dragging && S.moved < 6;
    S.dragging = false;
    if (!tap) return;
    toNdc(e);
    raycaster.setFromCamera(S.pointer, camera);
    raycaster.params.Points = { threshold: e.pointerType === "mouse" ? 0.07 : 0.14 };
    const hit = raycaster.intersectObject(points, false).find((x) => x.index !== undefined && x.index < n);
    raycaster.params.Points = { threshold: 0.07 };
    S.picked = hit?.index ?? -1;
    S.dirty = true;
    if (S.picked >= 0) o.onPick(S.picked);
  };
  const leave = () => {
    S.pointerIn = false;
    if (S.hover >= 0) {
      S.hover = -1;
      o.onHover(null);
    }
    S.dirty = true;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", leave);
  canvas.addEventListener("pointerleave", leave);
  const lost = (e: Event) => {
    e.preventDefault();
    S.lost = true;
    sync();
    o.onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);

  update(0, 1);
  renderer.compile(scene, camera);

  return {
    setQuery(point: [number, number, number] | null, hits: number[], answered: boolean) {
      S.query = point;
      S.hits = hits;
      S.answered = answered;
      S.picked = -1;
      S.dirty = true;
    },
    /** Pipeline phase, 0 (question) … 4 (answer shown). */
    setPhase(p: number) {
      if (p !== S.phase) S.dirty = true;
      S.phase = p;
    },
    snap(time: number) {
      update(time, 1);
    },
    dispose() {
      stop?.();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", leave);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", lost);
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
