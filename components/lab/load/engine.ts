/**
 * The load-test stage: three layers (CDN · app machines · database) and the request packets
 * flowing through them. Plain three.js on the shared ticker. It reads one number set by the
 * shell — people on the site, plus the architecture and how far the layers are pulled apart —
 * and derives everything else from model.ts's `loadPose()`, the same function the panels use.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { maxDpr, quality } from "@/lib/env";
import { clamp, damp, lerp } from "@/lib/math";
import { onFrame } from "@/lib/ticker";
import { emptyPose, loadPose, MAX_MACHINES, MAX_REPLICAS, type Arch } from "./model";

export type LoadView = "iso" | "side" | "top";
const VIEWS: Record<LoadView, readonly [yaw: number, pitch: number]> = { iso: [0.78, 0.5], side: [0.22, 0.07], top: [0.02, 1.32] };

export type LoadStageOptions = {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  /** Layer labels, positioned every frame: people, CDN, app, database. */
  labels: readonly (HTMLElement | null)[];
  reduced: boolean;
  /** `?t=` is set: no idle motion. */
  frozen: boolean;
  onInteract(): void;
  onLost(): void;
};

export type LoadStage = ReturnType<typeof createLoadStage>;

const ACC = new THREE.Color("#b9ff4b");
const MINT = new THREE.Color("#3ef2c4");
const WARM = new THREE.Color("#ffd08a");
const DANGER = new THREE.Color("#ff7a6b");
const IDLE = new THREE.Color("#22302b");
const FOV = 30;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/** App machine slots, nearest to the centre first, so the cluster grows outwards. */
const COLS = 8;
const ROWS = 6;
const PITCH = 0.95;
const BLADE = 0.7;
const SLOTS = (() => {
  const s: { x: number; z: number }[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s.push({ x: (c - (COLS - 1) / 2) * PITCH, z: (r - (ROWS - 1) / 2) * PITCH });
  return s.sort((a, b) => a.x * a.x + a.z * a.z * 1.6 - (b.x * b.x + b.z * b.z * 1.6) || Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
})();

/** Database nodes: primary, three replicas, cache. */
const DB_POS = [
  [0, 0],
  [-2.15, -0.35],
  [2.15, -0.35],
  [0, -2.05],
] as const;
const CACHE_POS = [2.1, 1.75] as const;

/** Healthy → busy → overloaded. */
function heat(use: number, out: THREE.Color) {
  if (use < 0.6) return out.copy(ACC);
  if (use < 0.9) return out.copy(ACC).lerp(WARM, (use - 0.6) / 0.3);
  return out.copy(WARM).lerp(DANGER, clamp((use - 0.9) / 0.15));
}

const fract = (v: number) => v - Math.floor(v);
const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);

export function createLoadStage(o: LoadStageOptions) {
  const { canvas, host } = o;
  const q = quality();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== "low", alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setPixelRatio(Math.min(maxDpr(q), q === "low" ? 1 : 1.5));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight("#ffffff", 1.4);
  key.position.set(-6, 12, 8);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);
  const disposables: { dispose(): void }[] = [envRT];
  const own = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  /* ---------------------------------------------------------------- materials */
  const metal = own(new THREE.MeshStandardMaterial({ color: "#1a2420", roughness: 0.5, metalness: 0.45 }));
  const metalDark = own(new THREE.MeshStandardMaterial({ color: "#111916", roughness: 0.6, metalness: 0.35 }));
  const glow = own(new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  const slabMat = own(new THREE.MeshStandardMaterial({ color: "#0f1d18", roughness: 0.35, metalness: 0.2, transparent: true, opacity: 0.55, depthWrite: false }));
  const slabLine = own(new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: 0.55 }));
  const gridMat = own(new THREE.LineBasicMaterial({ color: "#3ef2c4", transparent: true, opacity: 0.07 }));

  /* ---------------------------------------------------------------- app tier: machines */
  const bladeGeo = own(new THREE.BoxGeometry(BLADE, 1, BLADE).translate(0, 0.5, 0));
  const blades = new THREE.InstancedMesh(bladeGeo, metal, MAX_MACHINES);
  const topGeo = own(new THREE.BoxGeometry(BLADE * 0.8, 0.02, BLADE * 0.8));
  const tops = new THREE.InstancedMesh(topGeo, glow, MAX_MACHINES);
  for (let i = 0; i < MAX_MACHINES; i++) tops.setColorAt(i, IDLE);
  scene.add(blades, tops);
  const lift = new Float32Array(MAX_MACHINES);

  /* single server: one box with the database inside */
  const single = new THREE.Group();
  const boxGeo = own(new THREE.BoxGeometry(2.4, 1.4, 1.8).translate(0, 0.7, 0));
  const box = new THREE.Mesh(boxGeo, metal);
  const lidGeo = own(new THREE.BoxGeometry(2.48, 0.1, 1.88));
  const lid = new THREE.Mesh(lidGeo, metalDark);
  const stripGeo = own(new THREE.BoxGeometry(2.0, 0.05, 0.02));
  const stripMat = own(glow.clone());
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.set(0, 1.15, 0.91);
  const innerGeo = own(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 40));
  const inner = new THREE.Mesh(innerGeo, metalDark);
  const ringGeoS = own(new THREE.TorusGeometry(0.43, 0.018, 8, 48).rotateX(Math.PI / 2));
  const innerRing = new THREE.Mesh(ringGeoS, stripMat);
  single.add(box, lid, strip, inner, innerRing);
  scene.add(single);

  /* ---------------------------------------------------------------- edge: CDN slab */
  const slabGeo = own(new THREE.BoxGeometry(8.4, 0.05, 6.4));
  const slab = new THREE.Mesh(slabGeo, slabMat);
  const slabEdges = new THREE.LineSegments(own(new THREE.EdgesGeometry(slabGeo)), slabLine);
  slab.add(slabEdges);
  scene.add(slab);

  /* ---------------------------------------------------------------- data tier */
  const dbGeo = own(new THREE.CylinderGeometry(0.62, 0.62, 0.7, 48));
  const repGeo = own(new THREE.CylinderGeometry(0.46, 0.46, 0.56, 40));
  const ringGeo = own(new THREE.TorusGeometry(0.63, 0.02, 8, 64).rotateX(Math.PI / 2));
  const repRingGeo = own(new THREE.TorusGeometry(0.47, 0.018, 8, 56).rotateX(Math.PI / 2));
  const dbNodes: { group: THREE.Group; ring: THREE.MeshBasicMaterial; scale: number }[] = [];
  for (let j = 0; j < 1 + MAX_REPLICAS; j++) {
    const group = new THREE.Group();
    const ringMat = own(glow.clone());
    group.add(new THREE.Mesh(j === 0 ? dbGeo : repGeo, metal), new THREE.Mesh(j === 0 ? ringGeo : repRingGeo, ringMat));
    group.children[1].position.y = j === 0 ? 0.2 : 0.16;
    scene.add(group);
    dbNodes.push({ group, ring: ringMat, scale: j === 0 ? 1 : 0 });
  }
  const cacheGeo = own(new THREE.BoxGeometry(0.8, 0.46, 0.8));
  const cacheEdgeMat = own(new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: 0.8 }));
  const cache = new THREE.Mesh(cacheGeo, metalDark);
  cache.add(new THREE.LineSegments(own(new THREE.EdgesGeometry(cacheGeo)), cacheEdgeMat));
  scene.add(cache);

  const grid = new THREE.GridHelper(18, 36);
  grid.material.dispose();
  grid.material = gridMat;
  own(grid.geometry);
  scene.add(grid);

  /* ---------------------------------------------------------------- packets */
  const P = q === "low" ? 150 : 260;
  const packetGeo = own(new THREE.BoxGeometry(0.075, 0.075, 0.075));
  const packets = new THREE.InstancedMesh(packetGeo, glow, P);
  packets.frustumCulled = false;
  for (let i = 0; i < P; i++) packets.setColorAt(i, MINT);
  scene.add(packets);
  /** Per packet: kind, period, phase, spawn x, spawn z, db pick, error pick, queue pick. */
  const H = new Float32Array(P * 8);
  for (let i = 0; i < P * 8; i++) H[i] = hash(i + 1);

  /* ---------------------------------------------------------------- state */
  const S = {
    users: 150,
    arch: "single" as Arch,
    archT: 0,
    open: 0,
    openV: 0,
    yaw: VIEWS.iso[0],
    pitch: VIEWS.iso[1],
    yawTo: VIEWS.iso[0],
    pitchTo: VIEWS.iso[1],
    w: 1,
    h: 1,
    visible: false,
    dragging: false,
    px: 0,
    py: 0,
    dirty: true,
    lost: false,
  };
  const pose = emptyPose();
  const m4 = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();
  const qI = new THREE.Quaternion();
  const col = new THREE.Color();
  const heatCol = new THREE.Color();
  const anchor = new THREE.Vector3();

  const place = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => {
    v3.set(x, y, z);
    s3.set(sx, sy, sz);
    m4.compose(v3, qI, s3);
    mesh.setMatrixAt(i, m4);
  };

  /* ---------------------------------------------------------------- frame */
  function update(time: number, dt: number) {
    const snap = o.reduced || dt >= 1;
    const k = (lambda: number, a: number, b: number) => (snap ? b : damp(a, b, lambda, dt));
    S.archT = k(4, S.archT, S.arch === "scalable" ? 1 : 0);
    S.openV = k(4, S.openV, S.open);
    if (!S.dragging) {
      S.yaw = k(5, S.yaw, S.yawTo);
      S.pitch = k(5, S.pitch, S.pitchTo);
    }
    loadPose(S.users, S.arch, pose);
    const A = S.archT;
    const sA = Math.max(0.0001, A);
    const sS = Math.max(0.0001, 1 - A);

    /* layers */
    const gap = 2.3 + 1.7 * S.openV;
    const yEdge = 0.55 + gap;
    const yDb = -gap + 0.1;
    const ySpawn = lerp(3.9, yEdge + 1.9, S.archT);

    /* machines */
    const appHeat = heat(pose.appUse, heatCol);
    const machines = S.arch === "scalable" ? pose.machines : 0;
    for (let i = 0; i < MAX_MACHINES; i++) {
      lift[i] = k(6 - (i % 5) * 0.6, lift[i], i < machines ? 1 : 0);
      const s = SLOTS[i];
      const h = lerp(0.12, 0.55, lift[i]);
      place(blades, i, s.x, 0, s.z, sA, h * sA, sA);
      place(tops, i, s.x, h * sA + 0.011, s.z, sA);
      if (lift[i] > 0.02) tops.setColorAt(i, col.copy(appHeat).lerp(IDLE, 1 - lift[i] * 0.85));
      else tops.setColorAt(i, IDLE);
    }
    blades.instanceMatrix.needsUpdate = true;
    tops.instanceMatrix.needsUpdate = true;
    if (tops.instanceColor) tops.instanceColor.needsUpdate = true;
    blades.visible = tops.visible = A > 0.002;

    /* single server */
    single.visible = A < 0.998;
    single.scale.setScalar(sS);
    lid.position.y = 1.45 + 1.4 * S.openV;
    inner.position.y = 0.32 + 1.15 * S.openV;
    innerRing.position.y = inner.position.y + 0.17;
    heat(S.arch === "single" ? pose.appUse : 0, stripMat.color);

    /* edge */
    slab.position.y = yEdge;
    slab.scale.setScalar(lerp(0.85, 1, A));
    slabMat.opacity = 0.5 * A;
    slabLine.opacity = 0.6 * A;
    slab.visible = A > 0.01;

    /* database */
    const dbHeat = heat(pose.dbUse, col);
    for (let j = 0; j < dbNodes.length; j++) {
      const n = dbNodes[j];
      const on = S.arch === "scalable" && (j === 0 || j <= pose.replicas) ? 1 : 0;
      n.scale = k(5, n.scale, on);
      n.group.visible = n.scale * A > 0.01;
      n.group.scale.setScalar(Math.max(0.0001, n.scale * A));
      n.group.position.set(DB_POS[j][0], yDb, DB_POS[j][1]);
      n.ring.color.copy(dbHeat);
    }
    cache.position.set(CACHE_POS[0], yDb - 0.05, CACHE_POS[1]);
    cache.scale.setScalar(sA);
    cache.visible = A > 0.01;
    grid.position.y = lerp(-0.02, yDb - 0.45, A);

    /* packets */
    const active = Math.round(P * clamp(Math.log10(pose.rps + 1) / Math.log10(30000), 0.05, 1));
    const queue = clamp((pose.appUse - 0.75) / 1.0, 0, 0.85);
    const tt = o.reduced ? 1.7 : time;
    for (let i = 0; i < P; i++) {
      if (i >= active) {
        place(packets, i, 0, -99, 0, 0.0001);
        continue;
      }
      const h = i * 8;
      const isStatic = H[h] < 0.55;
      const s = fract(tt / (2.3 + H[h + 1] * 0.9) + H[h + 2]);
      const sx = (H[h + 3] - 0.5) * 7.4;
      const sz = (H[h + 4] - 0.5) * 5.4;
      let x = sx;
      let y = ySpawn;
      let z = sz;
      let sc = 1;
      let c = isStatic ? MINT : ACC;
      if (A >= 0.5) {
        if (isStatic) {
          if (s < 0.5) y = lerp(ySpawn, yEdge + 0.06, (s / 0.5) ** 2);
          else if (s < 0.64) {
            y = yEdge + 0.06;
            sc = 1.7 * (1 - (s - 0.5) / 0.14);
          } else sc = 0;
        } else {
          const slot = SLOTS[i % Math.max(1, pose.machines)];
          const top = lerp(0.12, 0.55, lift[i % Math.max(1, pose.machines)]) + 0.06;
          if (s < 0.35) y = lerp(ySpawn, yEdge, (s / 0.35) ** 2);
          else if (s < 0.6) {
            const e = (s - 0.35) / 0.25;
            const ee = e * e * (3 - 2 * e);
            x = lerp(sx, slot.x, ee);
            z = lerp(sz, slot.z, ee);
            y = lerp(yEdge, top, ee);
          } else if (H[h + 6] < pose.errors) {
            const e = (s - 0.6) / 0.4;
            const len = Math.hypot(slot.x, slot.z) || 1;
            x = slot.x + (slot.x / len) * e * 3;
            z = slot.z + (slot.z / len) * e * 3;
            y = top + e * 0.5 - e * e * 4;
            c = DANGER;
          } else if (s < 0.86) {
            const e = (s - 0.6) / 0.26;
            const ee = e * e * (3 - 2 * e);
            const node = H[h + 5] < 0.3 || pose.replicas === 0 ? 0 : 1 + Math.floor(H[h + 7] * pose.replicas);
            x = lerp(slot.x, DB_POS[node][0], ee);
            z = lerp(slot.z, DB_POS[node][1], ee);
            y = lerp(top, yDb + 0.42, ee);
          } else sc = 0;
        }
      } else {
        const tx = (H[h + 3] - 0.5) * 1.8;
        const tz = (H[h + 4] - 0.5) * 1.3;
        if (s < 0.5) {
          const e = s / 0.5;
          x = lerp(sx, tx, e);
          z = lerp(sz, tz, e);
          y = lerp(ySpawn, 1.56, e * e);
        } else if (H[h + 6] < pose.errors) {
          const e = (s - 0.5) / 0.5;
          const len = Math.hypot(tx, tz) || 1;
          x = tx + (tx / len) * e * 3;
          z = tz + (tz / len) * e * 3;
          y = 1.56 + e * 0.6 - e * e * 4.6;
          c = DANGER;
        } else if (H[h + 7] < queue) {
          const e = (s - 0.5) / 0.5;
          const a = H[h + 3] * Math.PI * 2 + tt * 0.9;
          const r = 1.15 + H[h + 4] * 0.4;
          x = Math.cos(a) * r;
          z = Math.sin(a) * r * 0.8;
          y = 1.75 + H[h + 5] * 1.1 * queue + e * 0.15;
          c = WARM;
        } else if (s < 0.6) {
          y = lerp(1.56, 1.2, (s - 0.5) / 0.1);
          x = tx;
          z = tz;
          sc = 1 - (s - 0.5) / 0.1;
        } else sc = 0;
      }
      place(packets, i, x, y, z, Math.max(0.0001, sc));
      packets.setColorAt(i, c);
    }
    packets.instanceMatrix.needsUpdate = true;
    if (packets.instanceColor) packets.instanceColor.needsUpdate = true;

    /* camera: fit the stack, orbit around its middle */
    const top = ySpawn + 0.3;
    const bottom = lerp(-0.3, yDb - 0.5, A);
    const cy = (top + bottom) / 2;
    const ry = (top - bottom) / 2 + 0.6;
    const rx = lerp(3.3, 5.3, A);
    const aspect = S.w / S.h;
    const dist = Math.max(ry / TAN, rx / (TAN * aspect)) * 1.04;
    const cp = Math.cos(S.pitch);
    camera.position.set(Math.sin(S.yaw) * cp * dist, cy + Math.sin(S.pitch) * dist, Math.cos(S.yaw) * cp * dist);
    camera.lookAt(0, cy, 0);

    /* labels hug the screen-left edge of each layer */
    const lx = -Math.cos(S.yaw);
    const lz = Math.sin(S.yaw);
    label(0, lx * 4.1, ySpawn, lz * 4.1, 1);
    label(1, lx * 4.5, yEdge, lz * 4.5, A);
    label(2, lx * lerp(1.45, 4.3, A), lerp(0.75, 0.3, A), lz * lerp(1.45, 4.3, A), 1);
    label(3, lx * lerp(0.6, 2.9, A), lerp(inner.position.y, yDb, A), lz * lerp(0.6, 2.9, A), lerp(S.openV, 1, A));

    renderer.render(scene, camera);
  }

  function label(i: number, x: number, y: number, z: number, opacity: number) {
    const el = o.labels[i];
    if (!el) return;
    anchor.set(x, y, z).project(camera);
    const sx = clamp((anchor.x * 0.5 + 0.5) * S.w, 8, S.w - 8);
    const sy = (-anchor.y * 0.5 + 0.5) * S.h;
    const flip = sx < 150 ? "0%" : "-100%";
    el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) translate(${flip},-50%)`;
    el.style.opacity = (anchor.z > 1 ? 0 : opacity).toFixed(2);
  }

  /* ---------------------------------------------------------------- size, visibility, loop */
  const resize = () => {
    const r = host.getBoundingClientRect();
    S.w = Math.max(1, r.width);
    S.h = Math.max(1, r.height);
    renderer.setSize(S.w, S.h, false);
    camera.aspect = S.w / S.h;
    camera.updateProjectionMatrix();
    S.dirty = true;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let stop: (() => void) | null = null;
  const frame = (time: number, dt: number) => {
    if (S.lost) return;
    // Reduced motion: draw only when something changed.
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

  /* ---------------------------------------------------------------- orbit by dragging */
  const down = (e: PointerEvent) => {
    S.dragging = true;
    S.px = e.clientX;
    S.py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    o.onInteract();
  };
  const move = (e: PointerEvent) => {
    if (!S.dragging) return;
    S.yaw -= (e.clientX - S.px) * 0.006;
    S.pitch = clamp(S.pitch + (e.clientY - S.py) * 0.005, 0.03, 1.35);
    S.yawTo = S.yaw;
    S.pitchTo = S.pitch;
    S.px = e.clientX;
    S.py = e.clientY;
    S.dirty = true;
  };
  const up = () => {
    S.dragging = false;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  const lost = (e: Event) => {
    e.preventDefault();
    S.lost = true;
    sync();
    o.onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);

  // Warm the shaders before the first visible frame.
  update(0, 1);
  renderer.compile(scene, camera);

  return {
    /** Target state; `users` is already smoothed by the shell (the panels show the same value). */
    set(users: number, arch: Arch, open: number) {
      if (users !== S.users || arch !== S.arch || open !== S.open) S.dirty = true;
      S.users = users;
      S.arch = arch;
      S.open = open;
    },
    view(v: LoadView) {
      S.yawTo = VIEWS[v][0];
      S.pitchTo = VIEWS[v][1];
      S.dirty = true;
    },
    /** Jump every eased value to its target and draw (stills). */
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
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("webglcontextlost", lost);
      blades.dispose();
      tops.dispose();
      packets.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
