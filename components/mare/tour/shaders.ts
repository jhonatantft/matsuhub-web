/**
 * Shaders of the Maré tour: one fullscreen quad composing at most two pictures ("A" on stage,
 * "B" arriving during a cut) plus the life drawn in code on top of them.
 *
 * Space conventions (same as the Aurora stage)
 * - `s`  screen position 0..1, origin TOP-left.
 * - `uv` image position 0..1, origin top-left (textures are uploaded unflipped).
 * - `uXf*` maps s → uv: uv = s * xf.xy + xf.zw. The camera / cover maths lives in engine.ts.
 * - `uPx*` CSS px per image unit (x, y) of each side: keeps rings 1 px thin and glows sized
 *   to the picture at any zoom.
 * - Colour maths in approximate linear space (texel², sqrt on the way out), so glows add like
 *   light. Mind the sqrt: 0.04 here reads as 0.2 on screen.
 *
 * Kinds: 0 = a photo (a view), 1 = the cut-away salon (tables, fire, candles, sea),
 *        2 = the facade (breathing doorway, door ring, sea).
 * Defines: TAPS (samples of the cut's radial smear), NT tables, NZ zones, NC candles.
 */

export const MARE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const MARE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2 uRes;
uniform float uTime;
uniform float uMotion;     // 1 = ambient life, 0 = prefers-reduced-motion
uniform vec3 uBg;          // linear backdrop around the cut-away

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

uniform float uMix;        // 0..1 cut A → B
uniform vec2 uPivot;       // screen point the camera goes through
uniform float uPower;

uniform vec4 uTables[NT];
uniform float uTableR[NT];
uniform float uFit[NT];    // 1 = the party fits and the table is free, 0 = dimmed
uniform float uFitA;       // strength of the fit display
uniform vec4 uZones[NZ];
uniform float uZoneR[NZ];
uniform vec4 uHov;
uniform float uHovR;
uniform float uHovA;
uniform vec4 uSel;
uniform float uSelR;
uniform float uSelA;
uniform vec4 uFire;
uniform vec2 uCandles[NC];
uniform vec2 uSea;
uniform float uDebug;

uniform vec4 uDoor;
uniform float uDoorR;
uniform float uDoorA;
uniform vec4 uDoorway;

const vec3 EMBER = vec3(0.885, 0.29, 0.087);
const vec3 EMBER_HOT = vec3(1.0, 0.62, 0.36);
const vec3 FIRE = vec3(1.0, 0.42, 0.1);
const vec3 SPARK = vec3(1.0, 0.5, 0.16);
const vec3 CANDLE = vec3(1.0, 0.66, 0.3);
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

/* soft moving glints on water: two drifting, rotated sine lattices multiplied, raised to a power */
float glints(vec2 p, float freq) {
  vec2 a = mat2(0.8, -0.6, 0.6, 0.8) * p * freq;
  vec2 b = mat2(0.6, 0.8, -0.8, 0.6) * p * freq * 0.83;
  float w = (sin(a.x + uTime * 1.3) * sin(a.y * 0.6 - uTime * 0.9)) * (sin(b.x - uTime * 1.1) * sin(b.y * 0.7 + uTime * 0.7));
  return pow(max(w, 0.0), 6.0) * 6.0;
}

/* signed distance in CSS px to a rounded box given in image fractions (centre, half size) */
float boxSd(vec2 uv, vec4 b, float round, vec2 px) {
  vec2 h = b.zw * px;
  float r = min(h.x, h.y) * round;
  vec2 q = abs(uv - b.xy) * px - h + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 ring(vec3 c, float d, float a, float strength) {
  float line = exp(-d * d / 0.8);
  float halo = exp(-max(d, 0.0) / 10.0) * step(0.0, d);
  float inner = exp(-max(-d, 0.0) / 26.0) * step(d, 0.0);
  float inside = 1.0 - smoothstep(-1.0, 1.0, d);
  c *= 1.0 + inside * 0.18 * a * strength;
  return c + (EMBER_HOT * line * 0.5 + EMBER * (halo * 0.08 + inner * 0.045)) * a * strength;
}

/* ── picture lookup ── */
vec3 sampleSide(sampler2D t, vec2 uv, float lod, float kind, vec2 px, float fade) {
  vec3 c = textureLod(t, uv, lod).rgb;
  c *= c;
  if (kind > 0.5 && kind < 1.5) {
    vec2 e = min(uv, 1.0 - uv) * px;                  // px to the picture's edge
    c = mix(uBg, c, smoothstep(0.0, 28.0, min(e.x, e.y)));
  }
  return mix(uBg, c, fade);
}

/* ── the cut-away: table availability, rings, fire, embers, candles, sea ── */
vec3 salonFx(vec3 c, vec2 uv, vec2 px) {
  float zoom = px.x / 1400.0;

  if (uFitA > 0.001) {
    for (int i = 0; i < NT; i++) {
      float d = boxSd(uv, uTables[i], uTableR[i], px);
      if (d > 30.0) continue;
      float inside = 1.0 - smoothstep(-16.0, 16.0, d);
      float fit = uFit[i];
      vec3 grey = vec3(dot(c, LUMA)) * vec3(1.0, 0.94, 0.9);
      c = mix(c, grey * 0.42, inside * (1.0 - fit) * uFitA * 0.82);
      c *= 1.0 + 0.12 * inside * fit * uFitA;
    }
  }

  if (uMotion > 0.0) {
    // wood fire: the glow breathes with the flames
    vec2 fd = (uv - uFire.xy) / uFire.zw;
    float fe = exp(-dot(fd, fd) * 1.5);
    if (fe > 0.003) {
      float fl = 0.7 + 0.3 * vnoise(vec2(uTime * 3.3, 1.7)) + 0.12 * (vnoise(vec2(uTime * 11.0, 9.0)) - 0.5);
      float hot = smoothstep(0.06, 0.35, c.r - c.b);
      c *= 1.0 + fe * (0.7 * hot + 0.14) * (fl - 0.62) * uMotion;
      c += FIRE * fe * 0.03 * fl * uMotion;
    }
    // embers rising from the grill
    if (abs(uv.x - uFire.x) < uFire.z && uv.y < uFire.y + 0.012 && uv.y > uFire.y - 0.11) {
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float seed = fract(fi * 0.6180339 + 0.13);
        float period = 2.3 + fract(seed * 7.31) * 1.9;
        float ph = fract(uTime / period + fract(seed * 3.17));
        vec2 p = vec2(
          uFire.x + (fract(seed * 5.71) - 0.5) * uFire.z * 1.1 + sin(uTime * 1.7 + fi * 2.3) * 0.005 * ph,
          uFire.y - 0.004 - ph * 0.085
        );
        vec2 dd = (uv - p) * px;
        float rad = (0.7 + fract(seed * 9.13) * 0.8) * max(zoom, 0.7);
        float a = smoothstep(0.0, 0.1, ph) * pow(1.0 - ph, 1.5) * (0.6 + 0.4 * sin(uTime * 9.0 + fi * 4.0));
        c += SPARK * exp(-dot(dd, dd) / (rad * rad)) * a * 0.75 * uMotion;
      }
    }
    // candles twinkle, each on its own rhythm
    for (int i = 0; i < NC; i++) {
      vec2 dd = (uv - uCandles[i]) * px;
      float r = 8.0 * zoom;
      float g = exp(-dot(dd, dd) / (r * r));
      if (g < 0.003) continue;
      float fi = float(i);
      float fl = 0.72 + 0.28 * vnoise(vec2(uTime * 4.2 + fi * 7.3, fi * 3.1));
      c *= 1.0 + g * 0.55 * (fl - 0.82) * uMotion;
      c += CANDLE * g * 0.045 * fl * uMotion;
    }
    // shimmer on the sea
    if (uv.y > uSea.x && uv.y < uSea.y) {
      float blue = smoothstep(0.0, 0.05, c.b - c.r * 0.9);
      float m = blue * smoothstep(uSea.x, uSea.x + 0.025, uv.y) * (1.0 - smoothstep(uSea.y - 0.012, uSea.y, uv.y)) * uMotion;
      float n1 = vnoise(vec2(uv.x * 34.0 + uTime * 0.32, uv.y * 20.0 - uTime * 0.1));
      c *= 1.0 + (n1 - 0.5) * 0.28 * m;
      c += vec3(0.5, 0.74, 0.8) * glints(uv * vec2(1.0, 0.5655), 210.0) * (0.4 + n1) * 0.11 * m;
    }
  }

  // focus: the selected item lifts, the rest of the room steps back
  if (uSelA > 0.002) {
    float d = boxSd(uv, uSel, uSelR, px);
    float outside = smoothstep(-2.0, 40.0, d);
    c *= 1.0 - 0.34 * uSelA * outside;
    c = ring(c, d, uSelA * (0.88 + 0.12 * sin(uTime * 2.2 * uMotion)), 1.15);
  }
  if (uHovA > 0.002) c = ring(c, boxSd(uv, uHov, uHovR, px), uHovA, 0.85);

  if (uDebug > 0.5) {
    for (int i = 0; i < NT; i++) {
      float d = boxSd(uv, uTables[i], uTableR[i], px);
      c = mix(c, vec3(1.0, 0.1, 0.6), exp(-d * d / 1.2));
      vec2 cd = (uv - uTables[i].xy) * px;
      c = mix(c, vec3(1.0, 0.1, 0.6), step(dot(cd, cd), 9.0));
    }
    for (int i = 0; i < NZ; i++) {
      float d = boxSd(uv, uZones[i], uZoneR[i], px);
      c = mix(c, vec3(0.0, 0.9, 1.0), exp(-d * d / 1.2));
    }
  }
  return c;
}

/* ── the facade: a breathing doorway, the door ring on hover, the sea on the right ── */
vec3 facadeFx(vec3 c, vec2 uv, vec2 px) {
  vec2 dd = (uv - uDoorway.xy) / uDoorway.zw;
  float g = exp(-dot(dd, dd) * 1.3);
  float breath = (0.5 + 0.5 * sin(uTime * 1.05)) * uMotion;
  float warm = smoothstep(0.02, 0.22, c.r - c.b);
  c *= 1.0 + g * warm * (0.06 + 0.16 * breath + 0.3 * uDoorA);
  c += CANDLE * g * (0.006 + 0.012 * breath + 0.02 * uDoorA);
  if (uDoorA > 0.002) c = ring(c, boxSd(uv, uDoor, uDoorR, px), uDoorA, 0.75);
  if (uMotion > 0.0 && uv.x > 0.76 && uv.y > 0.5) {
    float blue = smoothstep(0.0, 0.06, c.b - c.r);
    float n1 = vnoise(vec2(uv.x * 30.0 - uTime * 0.25, uv.y * 40.0 + uTime * 0.18));
    c *= 1.0 + (n1 - 0.5) * 0.2 * blue * uMotion;
    c += vec3(0.5, 0.7, 0.85) * glints(uv * vec2(1.0, 0.5655), 140.0) * (0.4 + n1) * 0.09 * blue * uMotion;
  }
  return c;
}

/* ── a view: the candle light in the room flickers a touch ── */
vec3 photoFx(vec3 c, vec2 uv) {
  if (uMotion <= 0.0) return c;
  float warm = smoothstep(0.12, 0.5, dot(c, LUMA)) * smoothstep(0.04, 0.2, c.r - c.b);
  float fl = vnoise(vec2(uTime * 2.1, uv.x * 2.5 + uv.y * 1.5)) - 0.5;
  return c * (1.0 + warm * fl * 0.07 * uMotion);
}

vec3 fx(vec3 c, vec2 uv, vec2 px, float kind) {
  if (kind > 1.5) return facadeFx(c, uv, px);
  if (kind > 0.5) return salonFx(c, uv, px);
  return photoFx(c, uv);
}

vec3 sideA(vec2 s, float blur) {
  return sampleSide(tA, s * uXfA.xy + uXfA.zw, uLodA + blur, uKindA, uPxA, uFadeA);
}
vec3 sideB(vec2 s, float blur) {
  return sampleSide(tB, s * uXfB.xy + uXfB.zw, uLodB + blur, uKindB, uPxB, uFadeB);
}

/* ── the cut: B grows out of the pivot through a warm, smeared dissolve ── */
vec3 cut(vec2 s) {
  float p = uMix;
  float asp = uRes.x / uRes.y;
  vec2 d = s - uPivot;
  float r = length(vec2(d.x * asp, d.y));
  float bell = sin(3.14159265 * p);
  float b = uPower * 0.24 * bell;
  float gap = r * uRes.y * 1.5 / float(TAPS);
  float soft = log2(1.0 + gap * b) + 1.1 * bell * uPower;

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
  col *= 1.0 + 0.5 * bell * bell * uPower * (0.25 + 0.75 * exp(-r * 2.4));
  return col * mix(vec3(1.0), vec3(1.07, 1.0, 0.85), bell * uPower * 0.6);
}

void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  vec3 col;
  if (uMix <= 0.0005) {
    vec2 uv = s * uXfA.xy + uXfA.zw;
    col = fx(sampleSide(tA, uv, uLodA, uKindA, uPxA, uFadeA), uv, uPxA, uKindA);
  } else if (uMix >= 0.9995) {
    vec2 uv = s * uXfB.xy + uXfB.zw;
    col = fx(sampleSide(tB, uv, uLodB, uKindB, uPxB, uFadeB), uv, uPxB, uKindB);
  } else {
    col = cut(s);
  }
  vec2 v = s - 0.5;
  col *= 1.0 - 0.26 * smoothstep(0.18, 0.75, dot(v, v));
  col = sqrt(max(col, 0.0));
  col += (hash12(gl_FragCoord.xy + 17.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;
