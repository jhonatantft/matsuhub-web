/**
 * Scene extras that are not parts of the product: the soft contact shadow under it and the
 * "Ver funcionando" layer (noise arriving from outside, the anti-phase wave the chip makes at the
 * ear, the music leaving the driver, microphones sampling).
 */
import * as THREE from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";

/* ------------------------------------------------------------------ contact shadow */

/** The contact-shadow technique from the three.js examples: depth from below, blurred twice. */
export function createContactShadow(size: number, height: number, res: number) {
  const group = new THREE.Group();
  const rt = new THREE.WebGLRenderTarget(res, res);
  rt.texture.generateMipmaps = false;
  const rtBlur = new THREE.WebGLRenderTarget(res, res);
  rtBlur.texture.generateMipmaps = false;
  const plane = new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ map: rt.texture, opacity: 0.36, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(plane, shadowMat);
  shadow.renderOrder = 1;
  shadow.scale.y = -1;
  group.add(shadow);
  const blurPlane = new THREE.Mesh(plane);
  blurPlane.visible = false;
  group.add(blurPlane);
  const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, height);
  cam.rotation.x = Math.PI / 2;
  group.add(cam);

  const depthMat = new THREE.MeshDepthMaterial();
  depthMat.userData.darkness = { value: 1.6 };
  depthMat.onBeforeCompile = (shader) => {
    shader.uniforms.darkness = depthMat.userData.darkness;
    shader.fragmentShader = /* glsl */ `uniform float darkness;\n${shader.fragmentShader.replace(
      "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
      "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );",
    )}`;
  };
  depthMat.depthTest = false;
  depthMat.depthWrite = false;
  depthMat.side = THREE.DoubleSide;
  const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
  hBlur.depthTest = false;
  const vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
  vBlur.depthTest = false;

  const blur = (renderer: THREE.WebGLRenderer, amount: number) => {
    blurPlane.visible = true;
    blurPlane.material = hBlur;
    hBlur.uniforms.tDiffuse.value = rt.texture;
    hBlur.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(rtBlur);
    renderer.render(blurPlane, cam);
    blurPlane.material = vBlur;
    vBlur.uniforms.tDiffuse.value = rtBlur.texture;
    vBlur.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(rt);
    renderer.render(blurPlane, cam);
    blurPlane.visible = false;
  };

  const vis: boolean[] = [];
  return {
    group,
    material: shadowMat,
    /** Render the shadow map. `hide` are scene objects that must not cast (glows, waves). */
    update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, hide: THREE.Object3D[]) {
      for (let i = 0; i < hide.length; i++) {
        vis[i] = hide[i].visible;
        hide[i].visible = false;
      }
      shadow.visible = false;
      const clearAlpha = renderer.getClearAlpha();
      renderer.setClearAlpha(0);
      scene.overrideMaterial = depthMat;
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      scene.overrideMaterial = null;
      blur(renderer, 3.6);
      blur(renderer, 1.4);
      renderer.setRenderTarget(null);
      renderer.setClearAlpha(clearAlpha);
      shadow.visible = true;
      for (let i = 0; i < hide.length; i++) hide[i].visible = vis[i];
    },
    dispose() {
      rt.dispose();
      rtBlur.dispose();
      plane.dispose();
      shadowMat.dispose();
      depthMat.dispose();
      hBlur.dispose();
      vBlur.dispose();
    },
  };
}

/* ------------------------------------------------------------------ "Ver funcionando" */

const WAVE_VERT = /* glsl */ `
attribute float aT;
attribute float aSide;
uniform float uTime;
uniform float uX0;
uniform float uX1;
uniform float uAmp;
uniform float uW;
uniform float uKind;
uniform float uSign;
varying float vT;

float wave(float q) {
  float t = uTime;
  if (uKind < 0.5)
    return 0.62 * sin(1.9 * q - 7.0 * t) + 0.3 * sin(4.3 * q - 11.3 * t + 1.3) + 0.12 * sin(9.1 * q - 17.0 * t);
  return 0.55 * sin(1.25 * q - 4.2 * t);
}
float env(float s) { return smoothstep(0.0, 0.22, s) * smoothstep(1.0, 0.82, s); }
float f(float s) {
  float x = mix(uX0, uX1, s);
  return uSign * uAmp * wave(abs(x - uX0)) * env(s);
}
void main() {
  vT = aT;
  float x = mix(uX0, uX1, aT);
  float e = 0.004;
  float y = f(aT);
  float dy = (f(aT + e) - f(aT - e)) / (2.0 * e * (uX1 - uX0));
  vec2 n = normalize(vec2(-dy, 1.0));
  vec3 p = vec3(x, y, 0.0) + vec3(n * aSide * uW * 0.5, 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const WAVE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vT;
void main() {
  float a = smoothstep(0.0, 0.12, vT) * smoothstep(1.0, 0.9, vT);
  gl_FragColor = vec4(uColor, a * uOpacity);
  #include <colorspace_fragment>
}`;

export type WaveRibbon = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

function ribbonGeometry(samples = 220) {
  const g = new THREE.BufferGeometry();
  const t = new Float32Array(samples * 2);
  const side = new Float32Array(samples * 2);
  const pos = new Float32Array(samples * 2 * 3);
  const idx: number[] = [];
  for (let i = 0; i < samples; i++) {
    t[i * 2] = t[i * 2 + 1] = i / (samples - 1);
    side[i * 2] = -1;
    side[i * 2 + 1] = 1;
    if (i < samples - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  g.setIndex(idx);
  // Positions are computed in the shader; give culling a generous box.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(10, 0, 0), 20);
  return g;
}

export function createWorkingFx(sides: THREE.Group[], colors: { noise: string; anti: string }) {
  const geo = ribbonGeometry();
  const ringGeo = new THREE.TorusGeometry(1, 0.016, 6, 128).rotateY(Math.PI / 2);
  const dotGeo = new THREE.SphereGeometry(0.11, 16, 12);
  const mats: THREE.Material[] = [];
  const roots: THREE.Group[] = [];
  const noise: WaveRibbon[] = [];
  const leak: WaveRibbon[] = [];
  const anti: WaveRibbon[] = [];
  const rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  const ringMat: THREE.MeshBasicMaterial[] = [];

  const ribbon = (kind: number, sign: number, color: string, opacity: number, w: number) => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uX0: { value: 0 },
        uX1: { value: 1 },
        uAmp: { value: 1 },
        uW: { value: w },
        uKind: { value: kind },
        uSign: { value: sign },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader: WAVE_VERT,
      fragmentShader: WAVE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    m.userData.base = opacity;
    mats.push(m);
    const mesh = new THREE.Mesh(geo, m) as WaveRibbon;
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    return mesh;
  };

  for (let s = 0; s < 2; s++) {
    const root = new THREE.Group();
    root.visible = false;
    sides[s].add(root);
    roots.push(root);
    const n = ribbon(0, 1, colors.noise, 0.85, 0.075);
    const l = ribbon(0, 1, colors.noise, 0.32, 0.05);
    const a = ribbon(0, -1, colors.anti, 0.95, 0.075);
    root.add(n, l, a);
    noise.push(n);
    leak.push(l);
    anti.push(a);
    for (let k = 0; k < 4; k++) {
      const m = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false });
      mats.push(m);
      ringMat.push(m);
      const r = new THREE.Mesh(ringGeo, m);
      r.renderOrder = 3;
      root.add(r);
      rings.push(r);
    }
  }

  const dotMat = new THREE.MeshBasicMaterial({ color: colors.anti, transparent: true, opacity: 0, depthWrite: false });
  mats.push(dotMat);

  return {
    roots,
    noise,
    leak,
    anti,
    rings,
    ringMat,
    dotGeo,
    dotMat,
    dispose() {
      geo.dispose();
      ringGeo.dispose();
      dotGeo.dispose();
      mats.forEach((m) => m.dispose());
    },
  };
}
