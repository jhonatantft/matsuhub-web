/**
 * Shaders of the Elo tour: one fullscreen quad composing at most two pictures ("A" on stage, "B"
 * arriving during a cut) plus the life drawn in code on top of them.
 *
 * Space conventions (same as the Maré tour)
 * - `s`  screen position 0..1, origin TOP-left.
 * - `uv` image position 0..1, origin top-left (textures are uploaded unflipped).
 * - `uXf*` maps s → uv: uv = s * xf.xy + xf.zw. The camera / cover maths lives in engine.ts.
 * - `uPx*` CSS px per image unit (x, y) of each side: keeps outlines 1–2 px thin at any zoom.
 * - Colour maths in approximate linear space (texel², sqrt on the way out).
 *
 * Kinds: 0 = a photo (a room), 1 = the cut-away floor (rooms, daylight, reception call, leaves),
 *        2 = the facade (breathing entrance, door outline, leaves).
 * Defines: TAPS (samples of the cut's radial smear), NR rooms, NV max vertices per room, NH hull.
 */

export const ELO_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const ELO_FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;
varying vec2 vUv;

uniform vec2 uRes;
uniform float uTime;
uniform float uMotion;     // 1 = ambient life, 0 = prefers-reduced-motion
uniform vec3 uBg;          // linear linen around the cut-away
uniform vec3 uBackdrop;    // linear studio grey of the cut-away picture

uniform sampler2D tA;
uniform sampler2D tB;
uniform vec4 uXfA;
uniform vec4 uXfB;
uniform vec2 uPxA;
uniform vec2 uPxB;
uniform float uLodA;
uniform float uLodB;
uniform float uKindA;
uniform float uKindB;
uniform float uFadeA;
uniform float uFadeB;
uniform vec4 uLeafA;       // x0 y0 x1 y1 of swaying leaves (x1 <= x0: none)
uniform vec4 uLeafB;

uniform float uMix;        // 0..1 cut A → B
uniform vec2 uPivot;       // screen point the camera goes through
uniform float uPower;

uniform vec4 uRoomV[NR * 4];   // NV vertices per room, two per vec4
uniform float uRoomN[NR];
uniform vec4 uRoomD[NR];       // door hit rect (debug only)
uniform float uHovW[NR];
uniform float uSelW[NR];
uniform float uSelAny;
uniform vec4 uHull[4];
uniform vec2 uDesk;
uniform vec2 uLamp;
uniform float uDebug;

uniform vec4 uDoor;
uniform float uDoorR;
uniform float uDoorA;
uniform vec4 uDoorway;

const vec3 ACC = vec3(0.0035, 0.1302, 0.1171);      // #0f5c57 pine teal
const vec3 MINT = vec3(0.38, 0.74, 0.64);
const vec3 SUN = vec3(1.0, 0.82, 0.58);
const vec3 LUMA = vec3(0.3, 0.59, 0.11);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}

/* signed distance in CSS px to a rounded box given in image fractions (centre, half size) */
float boxSd(vec2 uv, vec4 b, float round, vec2 px) {
  vec2 h = b.zw * px;
  float r = min(h.x, h.y) * round;
  vec2 q = abs(uv - b.xy) * px - h + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec2 roomVert(int r, int i) {
  vec4 q = uRoomV[r * 4 + i / 2];
  return (i - (i / 2) * 2) == 0 ? q.xy : q.zw;
}

/* signed distance in CSS px to a room's outline (negative inside) */
float roomSd(vec2 uv, int r, vec2 px) {
  int n = int(uRoomN[r] + 0.5);
  vec2 p = uv * px;
  vec2 v0 = roomVert(r, 0) * px;
  float d = dot(p - v0, p - v0);
  float s = 1.0;
  vec2 vj = roomVert(r, n - 1) * px;
  for (int i = 0; i < NV; i++) {
    if (i >= n) break;
    vec2 vi = roomVert(r, i) * px;
    vec2 e = vj - vi;
    vec2 w = p - vi;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= vi.y, p.y < vj.y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
    vj = vi;
  }
  return s * sqrt(d);
}

vec2 hullVert(int i) {
  vec4 q = uHull[i / 2];
  return (i - (i / 2) * 2) == 0 ? q.xy : q.zw;
}

/* signed distance in picture px (1600 wide) to the model's outer edge */
float hullSd(vec2 uv) {
  vec2 k = vec2(1600.0, 904.0);
  vec2 p = uv * k;
  vec2 v0 = hullVert(0) * k;
  float d = dot(p - v0, p - v0);
  float s = 1.0;
  vec2 vj = hullVert(NH - 1) * k;
  for (int i = 0; i < NH; i++) {
    vec2 vi = hullVert(i) * k;
    vec2 e = vj - vi;
    vec2 w = p - vi;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= vi.y, p.y < vj.y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
    vj = vi;
  }
  return s * sqrt(d);
}

/* a soft outline on light paper: lift inside, cool light along the inner edge, a thin teal line, a white bloom outside */
vec3 ring(vec3 c, float d, float a, float strength) {
  float k = a * strength;
  float line = exp(-d * d / 1.3);
  float halo = exp(-max(d, 0.0) / 11.0) * step(0.0, d);
  float inner = exp(-max(-d, 0.0) / 26.0) * step(d, 0.0);
  float inside = 1.0 - smoothstep(-1.0, 1.0, d);
  c *= 1.0 + inside * 0.06 * k;
  c = mix(c, c * vec3(0.94, 1.03, 1.02) + MINT * 0.06, inner * 0.6 * k);
  c = mix(c, vec3(1.0), halo * 0.28 * k);
  return mix(c, ACC, line * 0.8 * k);
}

/* ── picture lookup (with the green wall's sway, and the backdrop repainted as linen) ── */
vec3 sampleSide(sampler2D t, vec2 uv, float lod, float kind, vec2 px, float fade, vec4 leaf) {
  vec3 c = textureLod(t, uv, lod).rgb;
  if (uMotion > 0.0 && leaf.z > leaf.x) {
    vec2 e = min(uv - leaf.xy, leaf.zw - uv);
    float m = smoothstep(0.0, 0.02, min(e.x, e.y));
    float green = smoothstep(0.02, 0.1, c.g - max(c.r, c.b) * 0.94);
    if (m * green > 0.0) {
      float n = vnoise(uv * vec2(64.0, 40.0) + uTime * 0.18);
      vec2 off = vec2(
        sin(uTime * 1.15 + uv.y * 58.0 + n * 6.0),
        0.45 * cos(uTime * 0.9 + uv.x * 46.0 + n * 5.0)
      ) * 0.0011;
      vec3 s = textureLod(t, uv + off * m, lod).rgb;
      c = mix(c, s, green * m * uMotion);
    }
  }
  vec3 srgb = c;
  c *= c;
  if (kind > 0.5 && kind < 1.5) {
    float key = 1.0 - smoothstep(0.035, 0.075, length(srgb - sqrt(uBackdrop)));
    float outside = smoothstep(-5.0, 1.0, hullSd(uv));
    c *= mix(vec3(1.0), uBg / uBackdrop, key * outside);
    vec2 e = min(uv, 1.0 - uv) * px;
    c = mix(uBg, c, smoothstep(0.0, 18.0, min(e.x, e.y)));
  }
  return mix(uBg, c, fade);
}

/* ── the cut-away: daylight, the reception call, hover and selection outlines ── */
vec3 floorFx(vec3 c, vec2 uv, vec2 px) {
  float zoom = px.x / 1300.0;

  if (uMotion > 0.0) {
    // daylight through the glass front: slanted shafts and leaf dapple drifting slowly over the floor
    vec3 sc = sqrt(c);
    float lum = dot(sc, LUMA);
    float sat = max(sc.r, max(sc.g, sc.b)) - min(sc.r, min(sc.g, sc.b));
    float floorM = smoothstep(0.68, 0.86, lum) * (1.0 - smoothstep(0.07, 0.16, sat));
    float front = smoothstep(0.5, 0.93, uv.y) * (1.0 - smoothstep(0.935, 0.95, uv.y));
    float m = floorM * front;
    if (m > 0.001) m *= 1.0 - smoothstep(-6.0, 0.0, hullSd(uv)); // only on the clinic's own floor
    if (m > 0.001) {
      vec2 q = vec2(uv.x, uv.y * 0.565);
      float shaft = 0.5 + 0.5 * sin(q.x * 26.0 + q.y * 30.0 - uTime * 0.11);
      shaft = smoothstep(0.25, 1.0, shaft);
      float sweep = 0.5 + 0.5 * sin(q.x * 4.0 - uTime * 0.045);
      float dap = vnoise(q * 46.0 + vec2(uTime * 0.04, -uTime * 0.025)) * 0.65 + vnoise(q * 120.0 + vec2(-uTime * 0.06, uTime * 0.03)) * 0.35;
      float l = m * (0.55 * shaft * sweep + 0.75 * (dap - 0.45) * (0.4 + sweep));
      c *= 1.0 + 0.3 * l * uMotion;
      c += SUN * 0.05 * max(l, 0.0) * uMotion;
    }

    // "chamada": a soft call ring spreading from the reception desk, twice, then rest
    float cyc = mod(uTime, 6.0);
    for (int i = 0; i < 2; i++) {
      float ph = (cyc - float(i) * 0.7) / 2.2;
      if (ph <= 0.0 || ph >= 1.0) continue;
      vec2 e = (uv - uDesk) * px * vec2(1.0, 1.7);
      float rr = (6.0 + ph * 96.0) * zoom;
      float w = (3.0 + ph * 6.0) * zoom;
      float wave = exp(-pow((length(e) - rr) / w, 2.0)) * smoothstep(0.0, 0.12, ph) * (1.0 - ph) * (1.0 - ph);
      c = mix(c, c * vec3(0.86, 1.02, 1.0) + MINT * 0.12, wave * 0.85 * uMotion);
    }
    vec2 lo = (uv - uLamp) * px;
    float lg = exp(-dot(lo, lo) / pow(30.0 * zoom, 2.0));
    float call = exp(-pow((cyc - 0.4) / 0.9, 2.0));
    c *= 1.0 + lg * (0.08 + 0.1 * call) * uMotion;
  }

  // selection: the chosen room keeps its colour, the rest of the clinic fades toward paper
  if (uSelAny > 0.002) {
    float keep = 0.0;
    for (int r = 0; r < NR; r++) {
      float w = uSelW[r];
      if (w < 0.002) continue;
      float d = roomSd(uv, r, px);
      keep = max(keep, w * (1.0 - smoothstep(-2.0, 34.0, d)));
      c = ring(c, d, w * (0.9 + 0.1 * sin(uTime * 2.0 * uMotion)), 1.0);
    }
    vec3 paper = mix(vec3(dot(c, LUMA)), c, 0.45) * 0.55 + uBg * 0.45;
    c = mix(c, paper, uSelAny * (1.0 - keep) * 0.62);
  }
  for (int r = 0; r < NR; r++) {
    float w = uHovW[r];
    if (w < 0.002) continue;
    c = ring(c, roomSd(uv, r, px), w, 0.95);
  }

  if (uDebug > 0.5) {
    for (int r = 0; r < NR; r++) {
      float d = roomSd(uv, r, px);
      c = mix(c, vec3(1.0, 0.1, 0.6), exp(-d * d / 1.5));
      vec4 dr = uRoomD[r];
      if (dr.z > dr.x) {
        float dd = boxSd(uv, vec4((dr.xy + dr.zw) * 0.5, (dr.zw - dr.xy) * 0.5), 0.0, px);
        c = mix(c, vec3(0.0, 0.8, 1.0), exp(-dd * dd / 1.5));
      }
    }
    float h = hullSd(uv);
    c = mix(c, vec3(1.0, 0.6, 0.0), exp(-h * h / 1.0));
  }
  return c;
}

/* ── the facade: light breathing from the entrance, the door outline on hover ── */
vec3 facadeFx(vec3 c, vec2 uv, vec2 px) {
  vec2 dd = (uv - uDoorway.xy) / uDoorway.zw;
  float g = exp(-dot(dd, dd) * 1.5);
  float breath = (0.5 + 0.5 * sin(uTime * 1.0)) * uMotion;
  float warm = smoothstep(0.02, 0.2, sqrt(c.r) - sqrt(c.b));
  c *= 1.0 + g * (0.05 + 0.13 * breath + 0.2 * uDoorA) * (0.5 + warm);
  c += SUN * g * (0.006 + 0.016 * breath + 0.025 * uDoorA);
  if (uDoorA > 0.002) c = ring(c, boxSd(uv, uDoor, uDoorR, px), uDoorA, 0.9);
  return c;
}

vec3 fx(vec3 c, vec2 uv, vec2 px, float kind) {
  if (kind > 1.5) return facadeFx(c, uv, px);
  if (kind > 0.5) return floorFx(c, uv, px);
  return c;
}

vec3 sideA(vec2 s, float blur) {
  return sampleSide(tA, s * uXfA.xy + uXfA.zw, uLodA + blur, uKindA, uPxA, uFadeA, uLeafA);
}
vec3 sideB(vec2 s, float blur) {
  return sampleSide(tB, s * uXfB.xy + uXfB.zw, uLodB + blur, uKindB, uPxB, uFadeB, uLeafB);
}

/* ── the cut: B grows out of the pivot through a soft, bright, smeared dissolve ── */
vec3 cut(vec2 s) {
  float p = uMix;
  float asp = uRes.x / uRes.y;
  vec2 d = s - uPivot;
  float r = length(vec2(d.x * asp, d.y));
  float bell = sin(3.14159265 * p);
  float b = uPower * 0.22 * bell;
  float gap = r * uRes.y * 1.5 / float(TAPS);
  float soft = log2(1.0 + gap * b) + 1.0 * bell * uPower;

  vec2 q = s * vec2(asp, 1.0) * 2.3;
  float n = vnoise(q * 1.6 + 11.0) * 0.62 + vnoise(q * 4.3 + 5.0) * 0.38;
  float m = smoothstep(0.0, 0.44, p * 1.78 - 0.4 - r * 0.42 + (n - 0.5) * 0.4);

  vec3 from = vec3(0.0);
  vec3 to = vec3(0.0);
  float jitter = ign(gl_FragCoord.xy);
  for (int i = 0; i < TAPS; i++) {
    float t = (float(i) + jitter) / float(TAPS);
    vec2 sp = uPivot + d / (1.0 + b * t);
    if (m < 0.996) from += sideA(sp, soft);
    if (m > 0.004) to += sideB(sp, soft);
  }
  from /= float(TAPS);
  to /= float(TAPS);
  float life = 1.0 - bell;
  if (m < 0.996) from = mix(from, fx(from, s * uXfA.xy + uXfA.zw, uPxA, uKindA), life);
  if (m > 0.004) to = mix(to, fx(to, s * uXfB.xy + uXfB.zw, uPxB, uKindB), life);
  vec3 col = mix(from, to, m);
  // a breath of daylight at the middle of the move
  return mix(col, vec3(1.0, 0.985, 0.95), bell * bell * uPower * 0.22 * (0.35 + 0.65 * exp(-r * 2.2)));
}

void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  vec3 col;
  if (uMix <= 0.0005) {
    vec2 uv = s * uXfA.xy + uXfA.zw;
    col = fx(sampleSide(tA, uv, uLodA, uKindA, uPxA, uFadeA, uLeafA), uv, uPxA, uKindA);
  } else if (uMix >= 0.9995) {
    vec2 uv = s * uXfB.xy + uXfB.zw;
    col = fx(sampleSide(tB, uv, uLodB, uKindB, uPxB, uFadeB, uLeafB), uv, uPxB, uKindB);
  } else {
    col = cut(s);
  }
  vec2 v = s - 0.5;
  col *= 1.0 - 0.07 * smoothstep(0.2, 0.75, dot(v, v));
  col = sqrt(max(col, 0.0));
  col += (hash12(gl_FragCoord.xy + 17.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;
