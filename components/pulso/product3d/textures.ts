/**
 * Procedural surface textures drawn on canvases once at start-up (seeded, so every load looks
 * the same): brushed metal grain, a velour normal map, the board's copper traces and the printed
 * labels of the chip and the battery.
 */
import * as THREE from "three";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Fine streaks along U (the length of the part): used as roughness and as a faint albedo grain. */
export function brushedTexture() {
  const W = 1024;
  const H = 128;
  const [c, g] = canvas(W, H);
  const r = rng(7);
  const img = g.createImageData(W, H);
  const rows = new Float32Array(H);
  for (let y = 0; y < H; y++) rows[y] = r();
  for (let y = 0; y < H; y++) {
    // Neighbouring rows blend a little so the streaks have width variety.
    const base = 0.55 * rows[y] + 0.25 * rows[(y + 1) % H] + 0.2 * rows[(y + H - 1) % H];
    let streak = r();
    for (let x = 0; x < W; x++) {
      if (r() < 0.02) streak = r();
      const v = 200 + 40 * base + 14 * streak + 6 * r();
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** A tileable velour/knit normal map (height noise turned into normals). */
export function fabricNormal(seed = 11) {
  const N = 256;
  const r = rng(seed);
  const h = new Float32Array(N * N);
  const octave = (cells: number, amp: number) => {
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * cells;
        const fy = (y / N) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const a = grid[(y0 % cells) * cells + (x0 % cells)];
        const b = grid[(y0 % cells) * cells + ((x0 + 1) % cells)];
        const c2 = grid[((y0 + 1) % cells) * cells + (x0 % cells)];
        const d = grid[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
        h[y * N + x] += amp * (a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy);
      }
  };
  octave(8, 0.5);
  octave(32, 0.7);
  octave(64, 0.5);
  for (let i = 0; i < h.length; i++) h[i] += 0.12 * r();
  const [c, g] = canvas(N, N);
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)];
      const dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
      const nx = -dx * 0.8;
      const ny = -dy * 0.8;
      const l = Math.hypot(nx, ny, 1);
      const i = (y * N + x) * 4;
      img.data[i] = 128 + 127 * (nx / l);
      img.data[i + 1] = 128 + 127 * (ny / l);
      img.data[i + 2] = 128 + 127 * (1 / l);
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** The logic board: matte black solder mask, thin gold traces and pads. */
export function boardTexture() {
  const S = 512;
  const [c, g] = canvas(S, S);
  const r = rng(23);
  g.fillStyle = "#15171d";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "rgba(201, 164, 92, 0.55)";
  g.lineWidth = 2;
  g.lineCap = "round";
  for (let i = 0; i < 46; i++) {
    let x = S / 2 + (r() - 0.5) * 90;
    let y = S / 2 + (r() - 0.5) * 90;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      const len = 30 + r() * 90;
      const dir = Math.floor(r() * 8) * (Math.PI / 4);
      x += Math.cos(dir) * len;
      y += Math.sin(dir) * len;
      g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = "rgba(214, 178, 104, 0.9)";
    g.beginPath();
    g.arc(x, y, 3.5, 0, Math.PI * 2);
    g.fill();
  }
  // Edge pads.
  g.fillStyle = "rgba(214, 178, 104, 0.85)";
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    g.fillRect(S / 2 + Math.cos(a) * 220 - 5, S / 2 + Math.sin(a) * 220 - 5, 10, 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Laser-etched top of the N1 chip. */
export function chipTexture() {
  const S = 256;
  const [c, g] = canvas(S, S);
  g.fillStyle = "#1b1d24";
  g.fillRect(0, 0, S, S);
  g.fillStyle = "rgba(220, 224, 235, 0.82)";
  g.font = "600 92px ui-sans-serif, system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("N1", S / 2, S / 2 - 12);
  g.font = "500 22px ui-monospace, monospace";
  g.fillStyle = "rgba(220, 224, 235, 0.5)";
  g.fillText("PULSO · 2026", S / 2, S / 2 + 58);
  g.beginPath();
  g.arc(30, 30, 9, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The battery's printed sleeve. */
export function batteryTexture() {
  const W = 512;
  const H = 384;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#e7e9ee";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#5b4bff";
  g.fillRect(0, 0, 14, H);
  g.fillStyle = "#1d2029";
  g.font = "600 52px ui-sans-serif, system-ui, sans-serif";
  g.fillText("Li-Po", 48, 108);
  g.font = "500 30px ui-monospace, monospace";
  g.fillStyle = "#4a4f5c";
  g.fillText("3,85 V · 40 h", 48, 168);
  g.fillText("PULSO ONE", 48, 214);
  g.strokeStyle = "#9aa0ad";
  g.lineWidth = 2;
  g.strokeRect(48, 262, 150, 64);
  g.font = "500 22px ui-monospace, monospace";
  g.fillText("CE  ♻", 66, 302);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
