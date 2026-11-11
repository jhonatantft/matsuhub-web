import {
  AdditiveBlending,
  type BufferGeometry,
  Color,
  DoubleSide,
  Group,
  HalfFloatType,
  type IUniform,
  LinearFilter,
  type Material,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { coarsePointer, maxDpr, quality, type Quality, reducedMotion } from "@/lib/env";
import { labParam } from "@/lib/lab";
import { clamp, damp, easeOutCubic, seg, smoothstep } from "@/lib/math";
import { onFrame } from "@/lib/ticker";
import { createAgents } from "./agents";
import {
  agentGeometry,
  coreGeometry,
  dustGeometry,
  mulberry32,
  nodeDirections,
  nodeGeometry,
  ringGeometry,
  shellGeometry,
} from "./geometry";
import {
  AGENT_FRAG,
  AGENT_VERT,
  AURA_FRAG,
  AURA_VERT,
  BLOOM_PREFILTER_FRAG,
  CORE_VERT,
  DUST_VERT,
  NODE_FRAG,
  NODE_VERT,
  OUTPUT_SHADER,
  POINT_FRAG,
  RING_VERT,
  RINGS,
  SHELL_VERT,
} from "./shaders";

/**
 * Budgets per device tier (lib/env quality()). `bloom` is the size of the glow buffers relative
 * to the canvas in CSS pixels, so the cost of the bloom does not grow with the pixel ratio.
 */
type Tier = { particles: number; agents: number; bloom: number; maxPixels: number };
const TIERS: Record<Quality, Tier> = {
  high: { particles: 120_000, agents: 16, bloom: 0.5, maxPixels: 5.4e6 },
  mid: { particles: 60_000, agents: 14, bloom: 0.375, maxPixels: 3.2e6 },
  low: { particles: 25_000, agents: 12, bloom: 0.375, maxPixels: 1.8e6 },
};

/** Share of the particle budget per layer. */
const SHARE = { shell: 0.69, core: 0.12, rings: 0.13, dust: 0.06 };

const RING_SPECS = [
  { radius: 1.4, tiltX: -0.42, tiltZ: 0.1, spin: 0.05, pulses: 2, turns: 0.05 },
  { radius: 1.74, tiltX: 0.5, tiltZ: -0.2, spin: -0.034, pulses: 3, turns: 0.032 },
  { radius: 2.12, tiltX: 0.14, tiltZ: 0.4, spin: 0.022, pulses: 2, turns: 0.024 },
] as const;

const NODES = 28;
const CAM_DIST = 4.6;
/** Half-FOV tangent along the smaller side, chosen so the unit shell spans 30 % of it. */
const TAN_MIN = 1 / (CAM_DIST * 0.6);
const INTRO = 2.2;
/** The frame shown under prefers-reduced-motion. */
const STILL_TIME = 17.2;
/** Half-size of the glow quad in hub radii (matches `r` in AURA_FRAG). */
const AURA_RADIUS = 1.6;
/** Frames skipped to find out whether slow frames are this scene's doing. */
const PROBE_FRAMES = 9;
const RAD2DEG = 180 / Math.PI;

/**
 * Builds the hub inside `container` (a positioned element the canvas will fill) and runs it
 * on the shared ticker. Returns a dispose function. If WebGL 2 is unavailable it does nothing.
 */
export function mountHub(container: HTMLElement): () => void {
  // Lab overrides for screenshots: ?still=1 shows the reduced-motion frame, ?q=0|1|2 forces the
  // low | mid | high tier.
  const still = reducedMotion() || labParam("still") === 1;
  const frozen = labParam("t") !== null;
  const forcedTier = labParam("q");
  const q: Quality = forcedTier === 0 ? "low" : forcedTier === 1 ? "mid" : forcedTier === 2 ? "high" : quality();
  const tier = TIERS[q];

  // A fresh canvas per mount: React StrictMode mounts twice, and a context that was force-lost
  // on the first cleanup could not be reused.
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
  const attributes: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  };
  const gl = canvas.getContext("webgl2", attributes);
  if (!gl) return () => {};
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, context: gl, ...attributes });
  } catch {
    return () => {};
  }
  renderer.setClearColor(0x000000, 0);
  container.appendChild(canvas);

  /** Canvas size in CSS pixels, as last applied. */
  let width = 0;
  let height = 0;

  // ───────────── scene ─────────────
  const rnd = mulberry32(20261110);
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.set(0, 0, CAM_DIST);
  camera.updateMatrixWorld();
  const hub = new Group();
  hub.rotation.order = "ZXY"; // spin about its own axis first, then tilt toward the viewer
  scene.add(hub);

  const nodes = nodeDirections(NODES, rnd);
  const agentBuffers = agentGeometry(tier.agents, 44);
  const agents = createAgents(agentBuffers, nodes, tier.agents, rnd);

  const ringU = new Float32Array(RINGS * 3);
  const ringV = new Float32Array(RINGS * 3);
  const ringP = new Float32Array(RINGS * 4);
  const axis = new Vector3();
  RING_SPECS.forEach((r, i) => {
    const tilt = new Matrix4().makeRotationZ(r.tiltZ).multiply(new Matrix4().makeRotationX(r.tiltX));
    axis.set(1, 0, 0).applyMatrix4(tilt).toArray(ringU, i * 3);
    axis.set(0, 0, 1).applyMatrix4(tilt).toArray(ringV, i * 3);
    ringP.set([r.radius, r.spin, r.pulses, r.pulses * r.turns], i * 4);
  });

  const shared = {
    uTime: { value: 0 },
    uIntro: { value: 0 },
    uScatter: { value: 0 },
    uFade: { value: 0 },
    uGain: { value: 1 },
    uAgents: { value: 0 },
    uDpr: { value: 1 },
    uSize: { value: 1 },
    uRefDepth: { value: CAM_DIST },
    uFocus: { value: CAM_DIST - 0.7 },
    uDof: { value: 4.5 },
    uMaxPoint: { value: Math.max(16, (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1]) },
    uRayO: { value: new Vector3(0, 0, 50) },
    uRayD: { value: new Vector3(0, 0, -1) },
    uForce: { value: 0 },
    uDown: { value: new Vector3(0, -1, 0) },
    uAxis: { value: new Vector3(0, 0, -1) },
    uGuard: { value: new Vector4(0, 1, 1, 0) },
    uPulse: { value: agents.pulse },
    uPulseT: { value: agents.pulseT },
    uLime: { value: new Color("#b9ff4b") },
    uMint: { value: new Color("#3ef2c4") },
    uInk: { value: new Color("#eef4ee") },
    uHot: { value: new Color().setRGB(1, 0.97, 0.84) },
  } satisfies Record<string, IUniform>;

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  /** Point clouds stored in random order, so drawing a prefix thins them evenly. */
  const clouds: { geometry: BufferGeometry; count: number }[] = [];
  const additive = {
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
  };
  const layer = (geometry: BufferGeometry, vertexShader: string, fragmentShader: string, extra?: Record<string, IUniform>) => {
    const material = new ShaderMaterial({ ...additive, uniforms: { ...shared, ...extra }, vertexShader, fragmentShader });
    const points = new Points(geometry, material);
    points.frustumCulled = false; // positions only exist in the shader
    points.matrixAutoUpdate = false;
    hub.add(points);
    geometries.push(geometry);
    materials.push(material);
    return geometry;
  };
  const cloud = (geometry: BufferGeometry) => clouds.push({ geometry, count: geometry.attributes.position.count });

  const n = tier.particles;
  cloud(layer(dustGeometry(Math.round(n * SHARE.dust), rnd), DUST_VERT, POINT_FRAG));
  cloud(
    layer(ringGeometry(Math.round(n * SHARE.rings), RING_SPECS, rnd), RING_VERT, POINT_FRAG, {
      uRingU: { value: ringU },
      uRingV: { value: ringV },
      uRingP: { value: ringP },
    }),
  );
  cloud(
    layer(shellGeometry(Math.round(n * SHARE.shell), rnd), SHELL_VERT, POINT_FRAG, {
      uFlow: { value: new Vector2(1.5, 0.24) },
    }),
  );
  cloud(layer(coreGeometry(Math.round(n * SHARE.core), rnd), CORE_VERT, POINT_FRAG));
  layer(nodeGeometry(nodes, rnd), NODE_VERT, NODE_FRAG);

  const agentMaterial = new ShaderMaterial({
    ...additive,
    side: DoubleSide,
    uniforms: { ...shared, uView: { value: new Vector2(1, 1) } },
    vertexShader: AGENT_VERT,
    fragmentShader: AGENT_FRAG,
  });
  const comets = new Mesh(agentBuffers.geometry, agentMaterial);
  comets.frustumCulled = false;
  comets.matrixAutoUpdate = false;
  hub.add(comets);
  geometries.push(agentBuffers.geometry);
  materials.push(agentMaterial);

  const auraUniforms = {
    uTime: shared.uTime,
    uLime: shared.uLime,
    uMint: shared.uMint,
    uHot: shared.uHot,
    uGlow: { value: 0 },
    uNucleus: { value: 1 },
    uAuraScale: { value: AURA_RADIUS },
  };
  const auraGeometry = new PlaneGeometry(2, 2);
  const auraMaterial = new ShaderMaterial({ ...additive, uniforms: auraUniforms, vertexShader: AURA_VERT, fragmentShader: AURA_FRAG });
  const aura = new Mesh(auraGeometry, auraMaterial);
  aura.frustumCulled = false;
  aura.matrixAutoUpdate = false;
  scene.add(aura);
  geometries.push(auraGeometry);
  materials.push(auraMaterial);

  // ───────────── post-processing ─────────────
  // Light is summed in a float buffer; UnrealBloomPass builds the glow from it at low
  // resolution; the output pass adds the two and tone-maps. Without float render targets the
  // same chain runs in 8 bits, minus the bloom.
  const hdr = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
  const target = new WebGLRenderTarget(4, 4, {
    type: hdr ? HalfFloatType : UnsignedByteType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  let bloom: UnrealBloomPass | null = null;
  const output = new ShaderPass(OUTPUT_SHADER);
  if (hdr) {
    const pass = new UnrealBloomPass(new Vector2(256, 256), 0.36, 0.4, 0.42);
    // Our own bright-pass: a box-filtered downsample with a soft knee, so small sprites never
    // slip between samples and nothing pops in and out of the glow.
    const prefilter = pass.materialHighPassFilter;
    const texel = new Vector2();
    prefilter.fragmentShader = BLOOM_PREFILTER_FRAG;
    prefilter.uniforms.smoothWidth.value = 0.6;
    prefilter.uniforms.uStep = { value: texel };
    // The pass would add its result to the scene buffer with one more full-resolution blend;
    // the output pass samples the glow directly instead.
    pass.blendMaterial.visible = false;
    output.uniforms.tBloom.value = pass.renderTargetsHorizontal[0].texture;
    output.uniforms.uBloom.value = 1;
    const setSize = pass.setSize.bind(pass);
    pass.setSize = () => {
      const w = Math.max(16, Math.round(width * tier.bloom) * 2);
      const h = Math.max(16, Math.round(height * tier.bloom) * 2);
      setSize(w, h); // the pass works at half of what it is given
      texel.set(0.5 / w, 0.5 / h);
    };
    composer.addPass(pass);
    bloom = pass;
  }
  composer.addPass(output);

  // ───────────── state ─────────────
  let dead = false;
  let ready = false;
  let lost = false;
  let onScreen = true;
  let resized = true;
  let redraw = true;
  let pendingW = container.clientWidth;
  let pendingH = container.clientHeight;
  let deviceDpr = window.devicePixelRatio;
  let dpr = 0;
  let dim = 1;
  let t0 = -1;
  let lastScroll = -1;
  let yaw = 0;
  let pitch = 0;
  let force = 0;
  let rayX = 0;
  let rayY = 0;
  // Adaptive quality: steps down (never back up) when this scene is what keeps the frame rate
  // low. Before each step it stops drawing for a few frames: if the browser still ticks slowly
  // with nothing to draw (power saving, a busy page), the scene is not the cause and is left alone.
  let governor = 1;
  let thin = 1;
  let level = 0;
  let prevNow = 0;
  let frameMs = 16.7;
  let slowMs = 0;
  let slowLimit = 21;
  let probing = 0;
  let probeLast = 0;
  let probeBest = 0;

  const pointer = { x: 0, y: 0, active: false };
  const inverse = new Matrix4();
  const spin = new Quaternion();
  const rayO = shared.uRayO.value;
  const rayD = shared.uRayD.value;
  const probe = new Vector3();

  function applySize() {
    resized = false;
    redraw = true;
    width = pendingW;
    height = pendingH;
    if (width < 2 || height < 2) return;
    const wide = width >= 900;
    const minSide = Math.min(width, height);
    const next = Math.max(0.75, Math.min(maxDpr(q), Math.sqrt(tier.maxPixels / (width * height))) * governor);
    if (next !== dpr) {
      dpr = next;
      renderer.setPixelRatio(dpr);
      composer.setPixelRatio(dpr);
    }
    renderer.setSize(width, height, false);
    composer.setSize(width, height);

    // Lens shift instead of moving the hub: it stays on the optical axis, so it stays round.
    const cx = wide ? 0.72 : 0.5;
    const cy = wide ? 0.52 : 0.36;
    camera.fov = 2 * Math.atan((TAN_MIN * height) / minSide) * RAD2DEG;
    camera.setViewOffset(width, height, width * (0.5 - cx), height * (0.5 - cy), width, height);

    const radius = 0.3 * minSide; // css px
    const size = clamp(Math.sqrt(radius / 270), 0.74, 1.22);
    const density = ((120_000 / (tier.particles * thin)) * (radius / 270) ** 2) / (size * size);
    // Below ~1320 px the headline and the hub start to share space: quieten the hub's text side.
    const tight = wide ? 1 - seg(width, 900, 1320) : 0;
    dim = wide ? 1 - 0.2 * tight : 0.55;
    shared.uDpr.value = dpr;
    shared.uSize.value = size;
    shared.uGain.value = clamp(Math.pow(density, 0.7), 0.55, 1.45);
    shared.uDof.value = 4.5 * size;
    if (wide) shared.uGuard.value.set(0.3 + 0.16 * tight, 0.56 + 0.12 * tight, 0.14, 0.55 + 0.4 * tight);
    else shared.uGuard.value.set(0, 1, 1, 0);
    auraUniforms.uNucleus.value = wide ? 1 : 0.4; // on phones the heart sits right behind the headline
    agentMaterial.uniforms.uView.value.set(width, height);
  }

  /** One step down: fewer pixels, then fewer pixels again, then half the particles, then no bloom. */
  function degrade() {
    level++;
    if (level === 1) governor = 0.8;
    else if (level === 2) governor = 0.64;
    else if (level === 3) {
      thin = 0.5;
      for (const c of clouds) c.geometry.setDrawRange(0, Math.ceil(c.count * thin));
    } else if (bloom) {
      bloom.enabled = false;
      output.uniforms.uBloom.value = 0;
    }
    resized = true;
  }

  const frame = (time: number, dt: number) => {
    if (!ready || lost) return;
    if (!onScreen || document.hidden) {
      prevNow = 0;
      return;
    }
    if (window.devicePixelRatio !== deviceDpr) {
      deviceDpr = window.devicePixelRatio;
      resized = true;
    }
    if (resized) applySize();
    if (width < 2 || height < 2) return;

    // one layout read per frame: scroll progress and pointer mapping both come from it
    const rect = container.getBoundingClientRect();
    const scroll = clamp(-rect.top / (window.innerHeight || 1));
    if (scroll >= 1) {
      prevNow = 0;
      return;
    }
    if (still && !redraw && scroll === lastScroll) return;
    if (probing > 0) {
      const now = performance.now();
      // the first intervals still carry the last drawn frames: only the later ones count
      if (probing <= PROBE_FRAMES - 3) probeBest = Math.min(probeBest, now - probeLast);
      probeLast = now;
      if (--probing === 0) {
        if (probeBest > slowLimit) slowLimit = probeBest * 1.4;
        else degrade();
        prevNow = 0;
        frameMs = 16.7;
        slowMs = 0;
      }
      return;
    }
    redraw = false;
    lastScroll = scroll;

    // first frame: start the intro now — unless the page opened already scrolled past the hero
    if (t0 < 0) t0 = frozen ? 0 : scroll > 0.25 ? time - 60 : time;
    const t = still ? STILL_TIME : time - t0;
    const intro = still ? 1 : clamp(t / INTRO);
    const online = still ? 1 : smoothstep(seg(t, INTRO * 0.7, INTRO * 1.25));
    const appear = still ? 1 : smoothstep(seg(t, 0, 0.45));
    const fade = dim * appear * Math.pow(1 - scroll, 0.85);

    // the hub leans toward the pointer
    const inside =
      pointer.active && pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
    const nx = pointer.active ? clamp((pointer.x / window.innerWidth) * 2 - 1, -1, 1) : 0;
    const ny = pointer.active ? clamp((pointer.y / window.innerHeight) * 2 - 1, -1, 1) : 0;
    yaw = damp(yaw, nx * 0.5, 3, dt);
    pitch = damp(pitch, ny * 0.24, 3, dt);
    hub.rotation.set(0.34 + pitch, 0.6 + t * 0.1 + yaw, -0.12);
    const swell = 1 + 0.45 * easeOutCubic(scroll);
    hub.scale.setScalar(swell);
    hub.updateMatrix();
    hub.updateMatrixWorld(true);

    spin.copy(hub.quaternion).invert();
    shared.uDown.value.set(0, -1, 0).applyQuaternion(spin);
    shared.uAxis.value.set(0, 0, -1).applyQuaternion(spin);

    // force field along the ray under the pointer, expressed in hub space
    if (force < 0.002) {
      rayX = pointer.x;
      rayY = pointer.y;
    }
    force = damp(force, inside ? 1 : 0, 4, dt);
    rayX = damp(rayX, pointer.x, 12, dt);
    rayY = damp(rayY, pointer.y, 12, dt);
    if (force > 0.002) {
      inverse.copy(hub.matrixWorld).invert();
      probe.set(((rayX - rect.left) / rect.width) * 2 - 1, 1 - ((rayY - rect.top) / rect.height) * 2, 0.5).unproject(camera);
      rayO.copy(camera.position);
      rayD.copy(probe).sub(rayO).normalize();
      rayO.applyMatrix4(inverse);
      rayD.transformDirection(inverse);
    }

    shared.uTime.value = t;
    shared.uIntro.value = intro;
    shared.uScatter.value = still ? 0 : scroll;
    shared.uFade.value = fade;
    shared.uAgents.value = online;
    shared.uForce.value = force * online * (1 - scroll);
    auraUniforms.uGlow.value = fade * easeOutCubic(seg(intro, 0.25, 1)) * (1 - scroll);
    auraUniforms.uAuraScale.value = AURA_RADIUS * swell;
    agents.update(t);

    composer.render(dt);

    if (!frozen && !still) {
      const now = performance.now();
      if (prevNow > 0) {
        const ms = Math.min(100, now - prevNow);
        frameMs += (ms - frameMs) * 0.08;
        if (t > 3.5 && frameMs > slowLimit) {
          slowMs += ms;
          if (slowMs > 1800 && level < 4) {
            probing = PROBE_FRAMES;
            probeLast = now;
            probeBest = Infinity;
          }
        } else {
          slowMs = Math.max(0, slowMs - ms * 2);
        }
      }
      prevNow = now;
    }
  };

  // ───────────── wiring ─────────────
  const resizeObserver = new ResizeObserver((entries) => {
    const box = entries[0].contentRect;
    pendingW = Math.round(box.width);
    pendingH = Math.round(box.height);
    resized = true;
  });
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    redraw = true;
  });
  intersectionObserver.observe(container);

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  };
  const onPointerGone = () => {
    pointer.active = false;
  };
  const interactive = !still && !coarsePointer();
  if (interactive) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerGone);
    window.addEventListener("blur", onPointerGone);
  }

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
    resized = true;
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  // Compile the shaders off the main thread where the driver allows it, then start the clock.
  const start = () => {
    if (!dead) ready = true;
  };
  applySize();
  const failsafe = window.setTimeout(start, 1500);
  renderer.setRenderTarget(composer.readBuffer);
  renderer.compileAsync(scene, camera).then(start, start);
  renderer.setRenderTarget(null);

  const stop = onFrame(frame);

  return () => {
    dead = true;
    stop();
    window.clearTimeout(failsafe);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    if (interactive) {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerGone);
      window.removeEventListener("blur", onPointerGone);
    }
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    bloom?.dispose();
    output.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
}
