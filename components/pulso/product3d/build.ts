/**
 * The Pulso One built from primitives, part by part, so it can come apart. One function per
 * part; the right side is built once and mirrored for the left. Every mesh carries
 * `userData.part` and `userData.side` for picking. Dimensions come from ./model.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DIM, MIC_ANGLES, PART_IDS, SWIVEL, X, type PartId } from "./model";
import { batteryTexture, boardTexture, brushedTexture, chipTexture, fabricNormal } from "./textures";

const { R } = DIM;
/** Vertical axis the cups swivel on (through the pivot knob) and the rest-pose swivel angle. */
const PIVOT_X = X.face + 0.36;
/** Inside the shell, from the driver outward: battery centre, then the board's back face. */
const BATT_X = X.shellIn + 1.45;
const BOARD_X = X.shellIn + 2.0;

/* ------------------------------------------------------------------ geometry helpers */

/** Geometry built around +Y turned so its axis is +X. */
const onX = (g: THREE.BufferGeometry) => g.rotateZ(-Math.PI / 2);

/** An open cylinder/cone band around the X axis from x0 (radius r0) to x1 (radius r1). */
function frustum(r0: number, r1: number, x0: number, x1: number, seg = 160) {
  const g = new THREE.CylinderGeometry(r1, r0, x1 - x0, seg, 1, true);
  g.translate(0, (x0 + x1) / 2, 0);
  return onX(g);
}

/** A flat ring in the YZ plane at `x`, facing +X (dir 1) or -X (dir -1). */
function annulus(rIn: number, rOut: number, x: number, dir: 1 | -1, seg = 160) {
  const g = rIn <= 0 ? new THREE.CircleGeometry(rOut, seg) : new THREE.RingGeometry(rIn, rOut, seg, 1);
  g.rotateY((dir * Math.PI) / 2);
  g.translate(x, 0, 0);
  return g;
}

/** Strip the attributes mergeGeometries would choke on and merge. */
function merge(list: THREE.BufferGeometry[]) {
  const clean = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k);
    return n;
  });
  const out = mergeGeometries(clean, false)!;
  list.forEach((g) => g.dispose());
  clean.forEach((g) => g.dispose());
  return out;
}

/**
 * Sweep a closed cross-section along the headband's arc (in the XY plane). `profile(s)` returns
 * the section at arc fraction s as flat [u, v] pairs: u along the arc's inward normal, v along Z.
 */
function sweep(
  curve: { p: THREE.Vector2[]; n: THREE.Vector2[]; len: number[] },
  profile: (s: number) => number[],
  offset: (s: number) => number,
  uScale: number,
) {
  const rings = curve.p.length;
  const first = profile(0);
  const M = first.length / 2;
  const pos = new Float32Array(rings * M * 3);
  const uv = new Float32Array(rings * M * 2);
  const total = curve.len[rings - 1];
  for (let i = 0; i < rings; i++) {
    const s = curve.len[i] / total;
    const sec = profile(s);
    const off = offset(s);
    const p = curve.p[i];
    const n = curve.n[i];
    for (let j = 0; j < M; j++) {
      const u = sec[j * 2] + off;
      const v = sec[j * 2 + 1];
      const k = (i * M + j) * 3;
      pos[k] = p.x + n.x * u;
      pos[k + 1] = p.y + n.y * u;
      pos[k + 2] = v;
      uv[(i * M + j) * 2] = curve.len[i] / uScale;
      uv[(i * M + j) * 2 + 1] = j / M;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings - 1; i++)
    for (let j = 0; j < M; j++) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      const c = (i + 1) * M + j;
      const d = (i + 1) * M + ((j + 1) % M);
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Rounded rectangle section, half-extents hu × hv, corner radius cr, counter-clockwise. */
function roundRect(hu: number, hv: number, cr: number, seg = 5) {
  const out: number[] = [];
  const corners = [
    [hu - cr, hv - cr, 0],
    [-hu + cr, hv - cr, Math.PI / 2],
    [-hu + cr, -hv + cr, Math.PI],
    [hu - cr, -hv + cr, (3 * Math.PI) / 2],
  ];
  for (const [cu, cv, a0] of corners)
    for (let k = 0; k <= seg; k++) {
      const a = a0 + (k / seg) * (Math.PI / 2);
      out.push(cu + Math.cos(a) * cr, cv + Math.sin(a) * cr);
    }
  return out;
}

/** Soft pill section (superellipse), half-extents hu × hv. */
function pill(hu: number, hv: number, n = 2.6, seg = 28) {
  const out: number[] = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    out.push(hu * Math.sign(c) * Math.abs(c) ** (2 / n), hv * Math.sign(s) * Math.abs(s) ** (2 / n));
  }
  return out;
}

/** The headband's centre line: a superellipse from one arm to the other, resampled by arc length. */
function bandCurve(samples = 220) {
  const a = X.arm;
  const b = DIM.bandTopY - DIM.bandEndY;
  const e = 2 / 2.35;
  const dense: THREE.Vector2[] = [];
  for (let i = 0; i <= 2000; i++) {
    const t = -Math.PI / 2 + (i / 2000) * Math.PI;
    const s = Math.sin(t);
    const c = Math.cos(t);
    dense.push(new THREE.Vector2(a * Math.sign(s) * Math.abs(s) ** e, DIM.bandEndY + b * Math.abs(c) ** e));
  }
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + dense[i].distanceTo(dense[i - 1]));
  const total = acc[acc.length - 1];
  const p: THREE.Vector2[] = [];
  const len: number[] = [];
  let j = 0;
  for (let i = 0; i < samples; i++) {
    const target = (i / (samples - 1)) * total;
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const f = (target - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j]);
    p.push(dense[j].clone().lerp(dense[j + 1], f));
    len.push(target);
  }
  const n = p.map((pt, i) => {
    const prev = p[Math.max(0, i - 1)];
    const next = p[Math.min(p.length - 1, i + 1)];
    const t = next.clone().sub(prev).normalize();
    const nn = new THREE.Vector2(-t.y, t.x);
    // Inward: toward the middle of the arc.
    if (nn.dot(new THREE.Vector2(0, DIM.bandEndY).sub(pt)) < 0) nn.negate();
    return nn;
  });
  return { p, n, len };
}

/* ------------------------------------------------------------------ materials */

export type Finish = {
  body: THREE.MeshPhysicalMaterial;
  face: THREE.MeshPhysicalMaterial;
  ring: THREE.MeshStandardMaterial;
  halo: THREE.ShaderMaterial;
  cushion: THREE.MeshPhysicalMaterial;
  scrim: THREE.MeshPhysicalMaterial;
  pad: THREE.MeshPhysicalMaterial;
  band: THREE.MeshPhysicalMaterial;
  arm: THREE.MeshPhysicalMaterial;
  knob: THREE.MeshPhysicalMaterial;
  block: THREE.MeshPhysicalMaterial;
  mic: THREE.MeshStandardMaterial;
};

const HALO_VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.yz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uR;
uniform float uOpacity;
varying vec2 vP;
void main() {
  float d = length(vP) - uR;
  float a = d > 0.0 ? exp(-d * d * 9.0) : exp(-d * d * 28.0);
  gl_FragColor = vec4(uColor, a * uOpacity);
  #include <colorspace_fragment>
}`;

/* ------------------------------------------------------------------ the product */

export type Part = {
  id: PartId;
  /** One group per side (arco has one). Explode moves these. */
  groups: THREE.Object3D[];
  /** Label/focus anchors in the same order as `groups`. */
  anchors: THREE.Object3D[];
  /** Radius used to frame the part when focused. */
  size: number;
  mats: THREE.Material[];
};

export type Product = {
  root: THREE.Group;
  sides: THREE.Group[];
  parts: Record<PartId, Part>;
  pickables: THREE.Mesh[];
  finish: Finish;
  /** The swivelled cup frames (right, left): the working waves live on their axes. */
  cups: THREE.Group[];
  /** Groups that turn by the swivel angle (cups and pivot knobs); left side ones are mirrored. */
  swivels: THREE.Group[];
  /** Mic capsules (right then left), for the radial explode. */
  mics: THREE.Object3D[];
  dispose(): void;
};

export function buildProduct(): Product {
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const brushed = keep(brushedTexture());
  const brushedBand = keep(brushed.clone());
  const brushedColor = keep(brushed.clone());
  brushedColor.colorSpace = THREE.SRGBColorSpace;
  const fabric = keep(fabricNormal(11));
  fabric.repeat.set(30, 4);
  const fabricPad = keep(fabricNormal(19));
  fabricPad.repeat.set(1, 6);

  const phys = (p: THREE.MeshPhysicalMaterialParameters) => keep(new THREE.MeshPhysicalMaterial({ transparent: true, ...p }));
  const std = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial({ transparent: true, ...p }));

  const velvet = (normalMap: THREE.Texture) =>
    phys({
      roughness: 0.93,
      metalness: 0,
      specularIntensity: 0.35,
      sheen: 0.9,
      sheenRoughness: 0.55,
      normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });

  const finish: Finish = {
    body: phys({ metalness: 0.8, roughness: 0.46, side: THREE.DoubleSide }),
    face: phys({ metalness: 0.62, roughness: 0.52, clearcoat: 0.12, clearcoatRoughness: 0.55 }),
    ring: std({ roughness: 0.35, metalness: 0, emissiveIntensity: 1.6 }),
    halo: keep(
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uR: { value: R - 0.19 }, uOpacity: { value: 0.32 } },
        vertexShader: HALO_VERT,
        fragmentShader: HALO_FRAG,
        transparent: true,
        depthWrite: false,
      }),
    ),
    cushion: velvet(fabric),
    scrim: phys({ roughness: 0.95, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, normalMap: fabric }),
    pad: velvet(fabricPad),
    band: phys({ metalness: 0.9, roughness: 0.44, map: brushedColor, roughnessMap: brushedBand, anisotropy: 0.7, envMapIntensity: 0.55 }),
    arm: phys({ metalness: 0.9, roughness: 0.46, anisotropy: 0.5, envMapIntensity: 0.5 }),
    knob: phys({ metalness: 0.92, roughness: 0.45 }),
    block: phys({ metalness: 0.9, roughness: 0.46, envMapIntensity: 0.5 }),
    mic: std({ color: "#2a2d34", metalness: 0.6, roughness: 0.5, emissive: "#00c8f0", emissiveIntensity: 0 }),
  };

  const root = new THREE.Group();
  const sides = [new THREE.Group(), new THREE.Group()];
  sides[1].scale.x = -1;
  root.add(sides[0], sides[1]);

  const parts = {} as Record<PartId, Part>;
  for (const id of PART_IDS) parts[id] = { id, groups: [], anchors: [], size: 3, mats: [] };
  const pickables: THREE.Mesh[] = [];
  const mics: THREE.Object3D[] = [];
  const cups: THREE.Group[] = [];
  const swivels: THREE.Group[] = [];

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], part: PartId, side: number, pick = true) => {
    keep(g);
    const o = new THREE.Mesh(g, m);
    o.userData.part = part;
    o.userData.side = side;
    if (pick) pickables.push(o);
    return o;
  };
  const own = (id: PartId, ...ms: THREE.Material[]) => {
    for (const m of ms) if (!parts[id].mats.includes(m)) parts[id].mats.push(m);
  };
  const anchor = (group: THREE.Object3D, id: PartId, x: number, y: number, z: number) => {
    const a = new THREE.Object3D();
    a.position.set(x, y, z);
    group.add(a);
    parts[id].anchors.push(a);
  };

  /* -------- arco: brushed band, end blocks and the fabric pad underneath */
  {
    const g = new THREE.Group();
    const curve = bandCurve();
    const widthAt = (s: number) => {
      const m = 1 - Math.abs(2 * s - 1); // 0 at the ends, 1 at the apex
      return DIM.bandWEnd + (DIM.bandWTop - DIM.bandWEnd) * Math.sin((m * Math.PI) / 2);
    };
    const band = sweep(curve, (s) => roundRect(DIM.bandT / 2, widthAt(s) / 2, 0.16), () => 0, 24);
    g.add(mesh(band, finish.band, "arco", 0));
    // Pad: starts above the end blocks and closes in rounded tips.
    const padFrom = 0.075;
    const padSec = (s: number) => {
      const k = Math.min(1, Math.max(0, Math.min(s - padFrom, 1 - padFrom - s) / 0.07));
      const f = Math.sqrt(Math.sin((k * Math.PI) / 2));
      return pill((DIM.padT / 2) * f + 0.001, ((widthAt(s) - 0.55) / 2) * (0.55 + 0.45 * f), 3);
    };
    const pad = sweep(curve, padSec, () => DIM.bandT / 2 + DIM.padT / 2 - 0.08, 18);
    g.add(mesh(pad, finish.pad, "arco", 0));
    for (const s of [1, -1]) {
      const block = new RoundedBoxGeometry(0.82, 1.7, DIM.bandWEnd + 0.12, 3, 0.22);
      block.translate(s * X.arm, DIM.bandEndY + 0.25, 0);
      g.add(mesh(block, finish.block, "arco", 0));
    }
    root.add(g);
    parts.arco.groups.push(g);
    anchor(g, "arco", 3.5, DIM.bandTopY - 0.6, 0);
    parts.arco.size = 9;
    own("arco", finish.band, finish.pad, finish.block);
  }

  for (let si = 0; si < 2; si++) {
    const side = sides[si];
    const sideIdx = si;
    // The cup assembly swivels on the vertical axis through the pivot knob (the rest pose of
    // the studio photo: both cups turned the same way). Its parts explode along its own X.
    const swivel = new THREE.Group();
    swivel.position.x = PIVOT_X;
    swivel.rotation.y = si === 0 ? -SWIVEL : SWIVEL;
    swivel.userData.sign = si === 0 ? -1 : 1;
    swivels.push(swivel);
    const cup = new THREE.Group();
    cup.position.x = -PIVOT_X;
    swivel.add(cup);
    cups.push(cup);
    side.add(swivel);
    const group = (id: PartId) => {
      const g = new THREE.Group();
      (id === "hastes" ? side : cup).add(g);
      parts[id].groups.push(g);
      return g;
    };

    /* -------- concha: the machined shell and its flat outer face */
    {
      const g = group("concha");
      const xi = X.shellIn;
      const xf = X.face;
      const shell = merge([
        annulus(R - 0.2, R - 0.05, xi, -1),
        frustum(R - 0.05, R, xi, xi + 0.06),
        frustum(R, R, xi + 0.06, xf - 0.13),
        frustum(R, R - 0.1, xf - 0.13, xf - 0.02),
        annulus(R - 0.13, R - 0.1, xf - 0.02, 1),
        frustum(R - 0.13, R - 0.13, xf - 0.1, xf - 0.02),
        annulus(R - 0.25, R - 0.13, xf - 0.1, 1),
        frustum(R - 0.25, R - 0.25, xf - 0.1, xf),
        frustum(R - 0.2, R - 0.2, xi, xf - 0.22),
        annulus(0, R - 0.2, xf - 0.22, -1),
      ]);
      g.add(mesh(shell, finish.body, "concha", sideIdx));
      g.add(mesh(annulus(0, R - 0.25, xf, 1), finish.face, "concha", sideIdx));
      anchor(g, "concha", xf, -R * 0.55, R * 0.55);
      parts.concha.size = 5.5;
      own("concha", finish.body, finish.face);
    }

    /* -------- anel: the light ring in the groove around the face, and its glow */
    {
      const g = group("anel");
      const tube = new THREE.TorusGeometry(R - 0.19, 0.058, 12, 200);
      tube.rotateY(Math.PI / 2);
      tube.translate(X.face - 0.05, 0, 0);
      g.add(mesh(tube, finish.ring, "anel", sideIdx));
      const halo = new THREE.RingGeometry(R - 0.95, R + 0.55, 160, 1);
      halo.rotateY(Math.PI / 2);
      halo.translate(X.face + 0.012, 0, 0);
      const h = mesh(halo, finish.halo, "anel", sideIdx, false);
      h.renderOrder = 2;
      h.userData.fx = true;
      g.add(h);
      anchor(g, "anel", X.face, R * 0.72, R * 0.62);
      parts.anel.size = 5.5;
      own("anel", finish.ring);
    }

    /* -------- microfones: four capsules just inside the rim */
    {
      const g = group("microfones");
      const body = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 32);
      onX(body);
      const grill = annulus(0, 0.17, 0.172, 1, 32);
      const rim = new THREE.TorusGeometry(0.19, 0.025, 8, 32);
      rim.rotateY(Math.PI / 2);
      rim.translate(0.172, 0, 0);
      const grillMat = std({ color: "#b8955a", metalness: 0.9, roughness: 0.45 });
      for (const a of MIC_ANGLES) {
        const m = new THREE.Group();
        const r0 = R - 0.6;
        m.position.set(X.face - 0.55, Math.cos(a) * r0, Math.sin(a) * r0);
        m.userData.angle = a;
        m.userData.r0 = r0;
        m.add(mesh(body.clone(), finish.mic, "microfones", sideIdx));
        m.add(mesh(grill.clone(), grillMat, "microfones", sideIdx));
        m.add(mesh(rim.clone(), grillMat, "microfones", sideIdx));
        g.add(m);
        mics.push(m);
      }
      body.dispose();
      grill.dispose();
      rim.dispose();
      anchor(g, "microfones", X.face - 0.55, Math.cos(MIC_ANGLES[0]) * (R - 0.6), Math.sin(MIC_ANGLES[0]) * (R - 0.6));
      parts.microfones.size = 5;
      own("microfones", finish.mic, grillMat);
    }

    /* -------- placa: the logic board with the N1 chip */
    {
      const g = group("placa");
      const shape = new THREE.Shape();
      const rb = 3.45;
      const cut = -2.7;
      const a0 = Math.asin(cut / rb);
      shape.absarc(0, 0, rb, a0, Math.PI - a0, false);
      shape.lineTo(Math.cos(a0) * rb, cut);
      const board = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, curveSegments: 64 });
      board.rotateY(Math.PI / 2);
      board.translate(BOARD_X, 0, 0);
      const tex = keep(boardTexture());
      tex.repeat.set(1 / 7, 1 / 7);
      tex.offset.set(0.5, 0.5);
      const boardMat = std({ map: tex, roughness: 0.55, metalness: 0.1 });
      const edgeMat = std({ color: "#20232b", roughness: 0.6 });
      g.add(mesh(board, [boardMat, edgeMat], "placa", sideIdx));
      const chipTop = std({ map: keep(chipTexture()), roughness: 0.42, metalness: 0.2 });
      const chipSide = std({ color: "#17191f", roughness: 0.5 });
      const chip = new THREE.BoxGeometry(0.16, 1.2, 1.2);
      chip.translate(BOARD_X + 0.18, 0.55, -0.35);
      g.add(mesh(chip, [chipTop, chipSide, chipSide, chipSide, chipSide, chipSide], "placa", sideIdx));
      const bits: THREE.BufferGeometry[] = [];
      const spots = [
        [1.5, 0.9, 0.5, 0.3],
        [1.6, -0.6, 0.35, 0.6],
        [-1.4, 1.1, 0.6, 0.35],
        [-0.6, -1.4, 0.3, 0.3],
        [0.7, -1.6, 0.8, 0.4],
        [-1.9, -0.4, 0.3, 0.5],
        [2.4, 0.2, 0.25, 0.25],
        [0.2, 2.2, 0.5, 0.25],
        [-2.3, 1.3, 0.25, 0.25],
      ];
      for (const [y, z, h, w] of spots) {
        const b = new THREE.BoxGeometry(0.12, h, w);
        b.translate(BOARD_X + 0.16, y, z);
        bits.push(b);
      }
      const compMat = std({ color: "#3a3d46", metalness: 0.4, roughness: 0.45 });
      g.add(mesh(merge(bits), compMat, "placa", sideIdx));
      anchor(g, "placa", BOARD_X + 0.26, 0.55, -0.35);
      parts.placa.size = 4.2;
      own("placa", boardMat, edgeMat, chipTop, chipSide, compMat);
    }

    /* -------- bateria: a pouch cell with its sleeve */
    {
      const g = group("bateria");
      const cell = new RoundedBoxGeometry(0.7, 2.5, 3.4, 4, 0.2);
      cell.translate(BATT_X, -0.95, 0);
      const foil = std({ color: "#c3c7cf", metalness: 0.65, roughness: 0.45 });
      g.add(mesh(cell, foil, "bateria", sideIdx));
      const label = new THREE.PlaneGeometry(3.0, 2.2);
      label.rotateY(Math.PI / 2);
      label.translate(BATT_X + 0.353, -0.95, 0);
      const labelMat = std({ map: keep(batteryTexture()), roughness: 0.6 });
      g.add(mesh(label, labelMat, "bateria", sideIdx));
      const flex = new THREE.BoxGeometry(0.03, 1.1, 0.5);
      flex.translate(BATT_X + 0.3, 0.65, 1.0);
      const flexMat = std({ color: "#c98a2e", roughness: 0.5, metalness: 0.2 });
      g.add(mesh(flex, flexMat, "bateria", sideIdx));
      anchor(g, "bateria", BATT_X + 0.28, -0.95, 0);
      parts.bateria.size = 3.6;
      own("bateria", foil, labelMat, flexMat);
    }

    /* -------- driver: frame, biocellulose diaphragm, surround and magnet */
    {
      const g = group("driver");
      const frame = new THREE.CylinderGeometry(R - 0.22, R - 0.22, 0.2, 128);
      onX(frame);
      frame.translate(X.shellIn + 0.1, 0, 0);
      const frameMat = std({ color: "#1f2127", roughness: 0.62, metalness: 0.1 });
      g.add(mesh(frame, frameMat, "driver", sideIdx));
      const prof = [
        [0.001, 0.3],
        [0.3, 0.28],
        [0.55, 0.22],
        [0.72, 0.13],
        [0.76, 0.1],
        [1.1, 0.09],
        [1.5, 0.06],
        [1.85, 0.03],
        [1.95, 0.02],
      ].map(([r, h]) => new THREE.Vector2(r, h));
      const cone = new THREE.LatheGeometry(prof, 96);
      cone.rotateZ(Math.PI / 2); // lathe axis +Y → -X, toward the ear
      cone.translate(X.shellIn, 0, 0);
      const coneMat = std({ color: "#b9a780", roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide });
      g.add(mesh(cone, coneMat, "driver", sideIdx));
      const surround = new THREE.TorusGeometry(2.08, 0.12, 12, 128);
      surround.rotateY(Math.PI / 2);
      surround.translate(X.shellIn - 0.02, 0, 0);
      const rubber = std({ color: "#2a2b30", roughness: 0.7 });
      g.add(mesh(surround, rubber, "driver", sideIdx));
      const magnet = new THREE.CylinderGeometry(1.15, 1.15, 0.7, 64);
      onX(magnet);
      magnet.translate(X.shellIn + 0.55, 0, 0);
      const steel = std({ color: "#9aa0a8", metalness: 0.9, roughness: 0.45 });
      g.add(mesh(magnet, steel, "driver", sideIdx));
      anchor(g, "driver", X.shellIn - 0.2, 1.4, 1.4);
      parts.driver.size = 4.6;
      own("driver", frameMat, coneMat, rubber, steel);
    }

    /* -------- almofada: plush memory-foam cushion, slightly oval opening, fabric scrim */
    {
      const g = group("almofada");
      const rin = DIM.cushionHole;
      const rout = R - 0.08;
      const rc = (rin + rout) / 2;
      const a = (rout - rin) / 2;
      const hc = DIM.cushionDepth / 2;
      const pts: THREE.Vector2[] = [];
      const N = 72;
      for (let k = 0; k <= N; k++) {
        const t = (k / N) * Math.PI * 2;
        const c = Math.cos(t);
        const s = Math.sin(t);
        const ns = s < 0 ? 4.5 : 1.85; // flat where it sits on the shell, plump toward the ear
        const nr = s < 0 ? 4 : 2.1;
        pts.push(
          new THREE.Vector2(rc + a * Math.sign(c) * Math.abs(c) ** (2 / nr), hc + hc * Math.sign(s) * Math.abs(s) ** (2 / ns)),
        );
      }
      const cushion = new THREE.LatheGeometry(pts, 160);
      // Oval opening: stretch the inner wall vertically (lathe X becomes world Y below).
      const p = cushion.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const r = Math.hypot(x, z);
        const k = 1 - Math.min(1, Math.max(0, (r - rin) / (rout - rin)));
        p.setX(i, x * (1 + (DIM.cushionOval - 1) * k * k));
      }
      cushion.computeVertexNormals();
      cushion.rotateZ(Math.PI / 2);
      cushion.translate(X.shellIn, 0, 0);
      g.add(mesh(cushion, finish.cushion, "almofada", sideIdx));
      // Fabric cover over the driver, just wider than the opening so its edge stays buried in the foam.
      const scrim = new THREE.CircleGeometry(rin + 0.3, 96);
      scrim.scale(1, (rin * DIM.cushionOval + 0.3) / (rin + 0.3), 1);
      scrim.rotateY(-Math.PI / 2);
      scrim.translate(X.shellIn - 0.95, 0, 0);
      g.add(mesh(scrim, finish.scrim, "almofada", sideIdx));
      anchor(g, "almofada", X.cushionIn, -2.6, 2.4);
      parts.almofada.size = 5.5;
      own("almofada", finish.cushion, finish.scrim);
    }

    /* -------- hastes: slim steel arm and the knurled pivot on the face */
    {
      const g = group("hastes");
      const top = DIM.bandEndY + 0.7;
      const arm = new RoundedBoxGeometry(DIM.armT, top - DIM.pivotY, DIM.armW, 2, 0.08);
      arm.translate(X.arm, (top + DIM.pivotY) / 2, 0);
      g.add(mesh(arm, finish.arm, "hastes", sideIdx));
      const knob = new THREE.CylinderGeometry(0.74, 0.74, 0.8, 96, 6, false);
      const kp = knob.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < kp.count; i++) {
        const x = kp.getX(i);
        const z = kp.getZ(i);
        const r = Math.hypot(x, z);
        if (Math.abs(r - 0.74) < 1e-3 && Math.abs(kp.getY(i)) < 0.34) {
          const seg = Math.round((Math.atan2(z, x) / (Math.PI * 2)) * 96);
          const rr = 0.74 + (seg % 2 === 0 ? 0.022 : -0.012);
          kp.setX(i, (x / r) * rr);
          kp.setZ(i, (z / r) * rr);
        }
      }
      knob.computeVertexNormals();
      onX(knob);
      knob.translate(X.face + 0.4 - PIVOT_X, 0, 0);
      const cap = annulus(0, 0.66, X.face + 0.805 - PIVOT_X, 1, 64);
      const kg = new THREE.Group();
      kg.position.set(PIVOT_X, DIM.pivotY, 0);
      kg.rotation.y = si === 0 ? -SWIVEL : SWIVEL;
      kg.userData.sign = si === 0 ? -1 : 1;
      swivels.push(kg);
      kg.add(mesh(knob, finish.knob, "hastes", sideIdx), mesh(cap, finish.knob, "hastes", sideIdx));
      g.add(kg);
      anchor(g, "hastes", X.arm, 6.4, 0);
      parts.hastes.size = 5;
      own("hastes", finish.arm, finish.knob);
    }
  }

  return {
    root,
    sides,
    parts,
    pickables,
    finish,
    cups,
    swivels,
    mics,
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
