import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { MARE_TABLES } from "@/content/mare";
import { CANDLES, DOOR, DOORWAY, FIRE, SEA, TABLE_SHAPES, ZONE_ORDER, ZONE_SHAPES } from "./data";
import { MARE_FRAGMENT, MARE_VERTEX } from "./shaders";

/**
 * The WebGL half of the tour: a renderer, one fullscreen quad, the textures. It knows nothing
 * about states or cameras — engine.ts fills `uniforms` every frame. Loaded on demand (dynamic
 * import), so three.js never lands in the page's first bundle.
 */

export type MareUniforms = {
  uRes: { value: Vector2 };
  uTime: { value: number };
  uMotion: { value: number };
  uBg: { value: Vector3 };
  tA: { value: Texture };
  tB: { value: Texture };
  uXfA: { value: Vector4 };
  uXfB: { value: Vector4 };
  uPxA: { value: Vector2 };
  uPxB: { value: Vector2 };
  uLodA: { value: number };
  uLodB: { value: number };
  uKindA: { value: number };
  uKindB: { value: number };
  uFadeA: { value: number };
  uFadeB: { value: number };
  uMix: { value: number };
  uPivot: { value: Vector2 };
  uPower: { value: number };
  uTables: { value: Vector4[] };
  uTableR: { value: number[] };
  uFit: { value: number[] };
  uFitA: { value: number };
  uZones: { value: Vector4[] };
  uZoneR: { value: number[] };
  uHov: { value: Vector4 };
  uHovR: { value: number };
  uHovA: { value: number };
  uSel: { value: Vector4 };
  uSelR: { value: number };
  uSelA: { value: number };
  uFire: { value: Vector4 };
  uCandles: { value: Vector2[] };
  uSea: { value: Vector2 };
  uDebug: { value: number };
  uDoor: { value: Vector4 };
  uDoorR: { value: number };
  uDoorA: { value: number };
  uDoorway: { value: Vector4 };
};

export type MareGl = {
  uniforms: MareUniforms;
  blank: Texture;
  upload(source: ImageBitmap | HTMLImageElement): Texture;
  release(texture: Texture): void;
  resize(width: number, height: number, dpr: number): void;
  render(): void;
  dispose(): void;
};

/** Linear (squared sRGB) colour of the backdrop around the cut-away (#1f1512). */
const BG: [number, number, number] = [(31 / 255) ** 2, (21 / 255) ** 2, (18 / 255) ** 2];

/** Throws when WebGL cannot start — the caller falls back to plain <img> layers. */
export function createMareGl(
  canvas: HTMLCanvasElement,
  options: { taps: number; onContextLost: () => void },
): MareGl {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x0f0c0a, 1);

  const blank = new DataTexture(new Uint8Array([31, 21, 18, 255]), 1, 1);
  blank.needsUpdate = true;

  const box = (s: { x: number; y: number; hw: number; hh: number }) => new Vector4(s.x, s.y, s.hw, s.hh);
  const uniforms: MareUniforms = {
    uRes: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uBg: { value: new Vector3(...BG) },
    tA: { value: blank },
    tB: { value: blank },
    uXfA: { value: new Vector4(1, 1, 0, 0) },
    uXfB: { value: new Vector4(1, 1, 0, 0) },
    uPxA: { value: new Vector2(1000, 600) },
    uPxB: { value: new Vector2(1000, 600) },
    uLodA: { value: 0 },
    uLodB: { value: 0 },
    uKindA: { value: 0 },
    uKindB: { value: 0 },
    uFadeA: { value: 0 },
    uFadeB: { value: 0 },
    uMix: { value: 0 },
    uPivot: { value: new Vector2(0.5, 0.5) },
    uPower: { value: 1 },
    uTables: { value: MARE_TABLES.map((t) => box(TABLE_SHAPES[t.id])) },
    uTableR: { value: MARE_TABLES.map((t) => TABLE_SHAPES[t.id].round) },
    uFit: { value: MARE_TABLES.map(() => 1) },
    uFitA: { value: 0 },
    uZones: { value: ZONE_ORDER.map((z) => box(ZONE_SHAPES[z])) },
    uZoneR: { value: ZONE_ORDER.map((z) => ZONE_SHAPES[z].round) },
    uHov: { value: new Vector4(0.5, 0.5, 0.05, 0.05) },
    uHovR: { value: 1 },
    uHovA: { value: 0 },
    uSel: { value: new Vector4(0.5, 0.5, 0.05, 0.05) },
    uSelR: { value: 1 },
    uSelA: { value: 0 },
    uFire: { value: new Vector4(FIRE.x, FIRE.y, FIRE.rx, FIRE.ry) },
    uCandles: { value: CANDLES.map(([x, y]) => new Vector2(x, y)) },
    uSea: { value: new Vector2(SEA.y0, SEA.y1) },
    uDebug: { value: 0 },
    uDoor: { value: box(DOOR) },
    uDoorR: { value: DOOR.round },
    uDoorA: { value: 0 },
    uDoorway: { value: new Vector4(DOORWAY.x, DOORWAY.y, DOORWAY.rx, DOORWAY.ry) },
  };

  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms,
    defines: { TAPS: options.taps, NT: MARE_TABLES.length, NZ: ZONE_ORDER.length, NC: CANDLES.length },
    vertexShader: MARE_VERTEX,
    fragmentShader: MARE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const textures = new Set<Texture>();
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const onLost = (event: Event) => {
    event.preventDefault();
    options.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const free = (texture: Texture) => {
    texture.dispose();
    const source = texture.image as { close?: () => void } | null;
    source?.close?.(); // ImageBitmaps hold decoded pixels until closed
  };

  return {
    uniforms,
    blank,
    upload(source) {
      const texture = new Texture(source);
      texture.colorSpace = NoColorSpace; // sRGB decoded (approximately) in the shader
      texture.flipY = false;
      texture.premultiplyAlpha = false;
      texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.magFilter = LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
      renderer.initTexture(texture);
      textures.add(texture);
      return texture;
    },
    release(texture) {
      if (!textures.delete(texture)) return;
      free(texture);
    },
    resize(width, height, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      uniforms.uRes.value.set(width, height);
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const texture of textures) free(texture);
      textures.clear();
      blank.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
