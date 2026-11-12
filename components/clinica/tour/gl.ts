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
import { DESK, DOOR, DOORWAY, FLOOR_BACKDROP, HULL, LAMP, MAX_VERTS, ROOM_GEO, ROOM_IDS } from "./data";
import { ELO_FRAGMENT, ELO_VERTEX } from "./shaders";

/**
 * The WebGL half of the Elo tour: a renderer, one fullscreen quad, the textures. It knows
 * nothing about states or cameras — engine.ts fills `uniforms` every frame. Loaded on demand
 * (dynamic import), so three.js never lands in the page's first bundle.
 */

export type EloUniforms = {
  uRes: { value: Vector2 };
  uTime: { value: number };
  uMotion: { value: number };
  uBg: { value: Vector3 };
  uBackdrop: { value: Vector3 };
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
  uLeafA: { value: Vector4 };
  uLeafB: { value: Vector4 };
  uMix: { value: number };
  uPivot: { value: Vector2 };
  uPower: { value: number };
  uRoomV: { value: Vector4[] };
  uRoomN: { value: number[] };
  uRoomD: { value: Vector4[] };
  uHovW: { value: number[] };
  uSelW: { value: number[] };
  uSelAny: { value: number };
  uHull: { value: Vector4[] };
  uDesk: { value: Vector2 };
  uLamp: { value: Vector2 };
  uDebug: { value: number };
  uDoor: { value: Vector4 };
  uDoorR: { value: number };
  uDoorA: { value: number };
  uDoorway: { value: Vector4 };
};

export type EloGl = {
  uniforms: EloUniforms;
  blank: Texture;
  upload(source: ImageBitmap | HTMLImageElement): Texture;
  resize(width: number, height: number, dpr: number): void;
  render(): void;
  dispose(): void;
};

/** Linear (squared sRGB) linen of the page, #f6f3ee. */
const LINEN: [number, number, number] = [(246 / 255) ** 2, (243 / 255) ** 2, (238 / 255) ** 2];

/** Pack a list of points two per Vector4, padded to `count` points. */
function pack(points: readonly (readonly [number, number])[], count: number, out: Vector4[]) {
  for (let i = 0; i < count; i += 2) {
    const a = points[Math.min(i, points.length - 1)];
    const b = points[Math.min(i + 1, points.length - 1)];
    out.push(new Vector4(a[0], a[1], b[0], b[1]));
  }
  return out;
}

/** Throws when WebGL cannot start — the caller falls back to plain <img> layers. */
export function createEloGl(canvas: HTMLCanvasElement, options: { taps: number; onContextLost: () => void }): EloGl {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0xf6f3ee, 1);

  const blank = new DataTexture(new Uint8Array([246, 243, 238, 255]), 1, 1);
  blank.needsUpdate = true;

  const roomV: Vector4[] = [];
  for (const id of ROOM_IDS) pack(ROOM_GEO[id].poly, MAX_VERTS, roomV);
  const NR = ROOM_IDS.length;

  const uniforms: EloUniforms = {
    uRes: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uBg: { value: new Vector3(...LINEN) },
    uBackdrop: { value: new Vector3(FLOOR_BACKDROP[0] ** 2, FLOOR_BACKDROP[1] ** 2, FLOOR_BACKDROP[2] ** 2) },
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
    uLeafA: { value: new Vector4(0, 0, 0, 0) },
    uLeafB: { value: new Vector4(0, 0, 0, 0) },
    uMix: { value: 0 },
    uPivot: { value: new Vector2(0.5, 0.5) },
    uPower: { value: 1 },
    uRoomV: { value: roomV },
    uRoomN: { value: ROOM_IDS.map((id) => ROOM_GEO[id].poly.length) },
    uRoomD: { value: ROOM_IDS.map((id) => new Vector4(...(ROOM_GEO[id].door ?? [0, 0, 0, 0]))) },
    uHovW: { value: ROOM_IDS.map(() => 0) },
    uSelW: { value: ROOM_IDS.map(() => 0) },
    uSelAny: { value: 0 },
    uHull: { value: pack(HULL, 8, []) },
    uDesk: { value: new Vector2(DESK[0], DESK[1]) },
    uLamp: { value: new Vector2(LAMP[0], LAMP[1]) },
    uDebug: { value: 0 },
    uDoor: { value: new Vector4(DOOR.x, DOOR.y, DOOR.hw, DOOR.hh) },
    uDoorR: { value: DOOR.round },
    uDoorA: { value: 0 },
    uDoorway: { value: new Vector4(DOORWAY.x, DOORWAY.y, DOORWAY.rx, DOORWAY.ry) },
  };

  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms,
    defines: { TAPS: options.taps, NR, NV: MAX_VERTS, NH: HULL.length },
    vertexShader: ELO_VERTEX,
    fragmentShader: ELO_FRAGMENT,
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
