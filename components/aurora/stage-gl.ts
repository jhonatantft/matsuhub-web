import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MirroredRepeatWrapping,
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
import { AURORA_FRAGMENT, AURORA_VERTEX } from "./shaders";

/**
 * The WebGL half of the Aurora stage: a renderer, one fullscreen quad and the textures.
 * It knows nothing about views or timelines — stage-core.ts fills `uniforms` every frame.
 * Loaded on demand (dynamic import), so three.js never lands in a page's first bundle.
 */

export type AuroraUniforms = {
  uRes: { value: Vector2 };
  uTime: { value: number };
  uMotion: { value: number };
  tBlue: { value: Texture };
  tDay: { value: Texture };
  tDusk: { value: Texture };
  tFrom: { value: Texture };
  tTo: { value: Texture };
  uXfFrom: { value: Vector4 };
  uXfTo: { value: Vector4 };
  uLodFrom: { value: number };
  uLodTo: { value: number };
  uFromExt: { value: number };
  uToExt: { value: number };
  uFadeFrom: { value: number };
  uFadeTo: { value: number };
  uMix: { value: number };
  uPivot: { value: Vector2 };
  uPower: { value: number };
  uBuild: { value: number };
  uDusk: { value: number };
  uBand: { value: Vector4 };
  uBandA: { value: number };
  uFacade: { value: Vector4 };
  uExtPx: { value: Vector2 };
  uBg: { value: Vector3 };
  uLines: { value: number[] };
};

export type AuroraGl = {
  uniforms: AuroraUniforms;
  /** A 1×1 navy texture: bound wherever a picture has not arrived yet. */
  blank: Texture;
  /**
   * Turn a decoded picture into a mip-mapped texture and upload it now (not on first draw).
   * `extend`: repeat the edge pixels outside the picture (flat backgrounds) instead of mirroring it.
   */
  upload(source: ImageBitmap | HTMLImageElement, extend?: boolean): Texture;
  resize(width: number, height: number, dpr: number): void;
  render(): void;
  dispose(): void;
};

export type AuroraGlOptions = {
  /** Samples of the radial smear during cuts. */
  taps: number;
  /** Compile the slab-line overlay (lab only). */
  debugFloors: boolean;
  lines: readonly number[];
  facade: readonly [number, number, number, number];
  /** Linear-space (squared sRGB) background colour. */
  background: readonly [number, number, number];
  onContextLost: () => void;
};

/** Throws when a WebGL2 context cannot be created — the caller falls back to plain images. */
export function createAuroraGl(canvas: HTMLCanvasElement, options: AuroraGlOptions): AuroraGl {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x070b1a, 1);

  const blank = new DataTexture(new Uint8Array([7, 11, 26, 255]), 1, 1);
  blank.needsUpdate = true;

  const uniforms: AuroraUniforms = {
    uRes: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uMotion: { value: 1 },
    tBlue: { value: blank },
    tDay: { value: blank },
    tDusk: { value: blank },
    tFrom: { value: blank },
    tTo: { value: blank },
    uXfFrom: { value: new Vector4(1, 1, 0, 0) },
    uXfTo: { value: new Vector4(1, 1, 0, 0) },
    uLodFrom: { value: 0 },
    uLodTo: { value: 0 },
    uFromExt: { value: 1 },
    uToExt: { value: 0 },
    uFadeFrom: { value: 0 },
    uFadeTo: { value: 0 },
    uMix: { value: 0 },
    uPivot: { value: new Vector2(0.5, 0.5) },
    uPower: { value: 1 },
    uBuild: { value: 0 },
    uDusk: { value: 0 },
    uBand: { value: new Vector4(0, 0, 1, 1) },
    uBandA: { value: 0 },
    uFacade: { value: new Vector4(...options.facade) },
    uExtPx: { value: new Vector2(1, 1) },
    uBg: { value: new Vector3(...options.background) },
    uLines: { value: [...options.lines] },
  };

  const defines: Record<string, number | string> = { TAPS: options.taps };
  if (options.debugFloors) defines.DEBUG_FLOORS = 1;

  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms,
    defines,
    vertexShader: AURORA_VERTEX,
    fragmentShader: AURORA_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const textures: Texture[] = [];
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const onLost = (event: Event) => {
    event.preventDefault();
    options.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    uniforms,
    blank,
    upload(source, extend = false) {
      const texture = new Texture(source);
      texture.colorSpace = NoColorSpace; // sRGB is decoded (approximately) in the shader
      texture.flipY = false;
      texture.premultiplyAlpha = false;
      texture.wrapS = texture.wrapT = extend ? ClampToEdgeWrapping : MirroredRepeatWrapping;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.magFilter = LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
      renderer.initTexture(texture);
      textures.push(texture);
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
      for (const texture of textures) {
        texture.dispose();
        const source = texture.image as { close?: () => void } | null;
        source?.close?.(); // ImageBitmaps hold decoded pixels until closed
      }
      textures.length = 0;
      blank.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
