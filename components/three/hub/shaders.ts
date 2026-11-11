/**
 * GLSL for the hero hub, as template strings assembled per material.
 *
 * Everything a particle does — flow, breathing, ripples, the intro, the scroll scatter, the
 * pointer force field, depth of field — is computed in the vertex stage from a handful of
 * uniforms, so the CPU never touches a per-particle buffer after start-up.
 */

/** One ripple slot per agent: length of the `uPulse` / `uPulseT` uniform arrays. */
export const PULSES = 16;

/** Orbit rings: length of the `uRingU` / `uRingV` / `uRingP` uniform arrays. */
export const RINGS = 3;

// 3D simplex noise — Ian McEwan / Stefan Gustavson, Ashima Arts (MIT), github.com/stegu/webgl-noise
const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 snoise3(vec3 p) {
  return vec3(
    snoise(p),
    snoise(p + vec3(31.416, -47.853, 12.679)),
    snoise(p + vec3(-23.317, 15.729, 41.234)));
}
`;

/** Uniforms and helpers shared by every vertex shader of the scene. */
const COMMON = /* glsl */ `
#define PI 3.141592653589793
#define TAU 6.283185307179586
#define NP ${PULSES}

uniform float uTime;        // seconds since the scene mounted
uniform float uIntro;       // 0 → 1 while the cloud converges into the hub
uniform float uScatter;     // 0 → 1 as the hero scrolls away
uniform float uFade;        // overall opacity
uniform float uGain;        // density compensation between quality tiers / screen sizes
uniform float uAgents;      // 0 → 1 once the agents come online
uniform float uDpr;
uniform float uSize;        // global sprite scale
uniform float uRefDepth;    // camera distance to the hub centre
uniform float uFocus;       // focal distance
uniform float uDof;         // lens blur strength, css px
uniform float uMaxPoint;    // GPU point-size limit, device px
uniform vec3 uRayO;         // pointer ray in hub space
uniform vec3 uRayD;
uniform float uForce;       // 0 → 1 force-field strength
uniform vec3 uDown;         // "down the page" in hub space
uniform vec3 uAxis;         // the camera's line of sight in hub space
uniform vec4 uGuard;        // keeps the headline side quiet: x0, x1 (viewport fraction), floor, share applied to the shell
uniform vec4 uPulse[NP];    // xyz ripple origin on the unit sphere, w strength
uniform float uPulseT[NP];  // ripple start times
uniform vec3 uLime;
uniform vec3 uMint;
uniform vec3 uHot;

${NOISE}

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Rings of light and height that run across the shell from wherever an agent lands.
float ripples(vec3 d, out float glow) {
  float disp = 0.0;
  glow = 0.0;
  for (int i = 0; i < NP; i++) {
    float age = uTime - uPulseT[i];
    float life = clamp(age / 2.7, 0.0, 1.0);
    float amp = uPulse[i].w * step(0.0, age) * (1.0 - life) * (1.0 - life);
    float x = acos(clamp(dot(d, uPulse[i].xyz), -1.0, 1.0)) - age * 1.05;
    float env = amp * exp(-x * x * 140.0);
    disp += env * cos(x * 17.0);
    glow += env;
  }
  disp *= uAgents;
  glow *= uAgents;
  return disp;
}

// Radius of the living surface along the unit direction d.
float surface(vec3 d, out float n1, out float n2, out float glow) {
  n1 = snoise(d * 1.15 + vec3(0.0, uTime * 0.11, 0.0));
  n2 = snoise(d * 2.9 + vec3(uTime * 0.16, 0.0, -uTime * 0.09));
  return 1.0 + 0.045 * n1 + 0.022 * n2 + 0.035 * ripples(d, glow);
}

// How much light a clip-space position may carry: less toward the headline, none at the very
// bottom, so the scene dissolves before the canvas edge instead of being cut by it.
float quiet(vec4 clip, float amount) {
  vec2 s = clip.xy / clip.w * 0.5 + 0.5;
  float side = mix(uGuard.z, 1.0, smoothstep(uGuard.x, uGuard.y, s.x));
  return mix(1.0, side, amount) * smoothstep(0.0, 0.1, s.y);
}

varying float vForce;

// Intro convergence, scroll scatter and the pointer force field, in that order.
vec3 dynamics(vec3 p, vec4 rnd, out float vis) {
  // intro: every particle falls in from a wide swirling cloud, each on its own delay
  float k = clamp((uIntro - rnd.z * 0.34) / 0.66, 0.0, 1.0);
  float e = 1.0 - (1.0 - k) * (1.0 - k) * (1.0 - k);
  float inv = 1.0 - e;
  vec3 sdir = normalize(p + (rnd.xyw - 0.5) * 2.4 + vec3(1e-4));
  vec3 start = sdir * (2.3 + 5.4 * rnd.y * rnd.w + 1.4 * rnd.x);
  vec3 q = mix(start, p, e);
  q.xz = rot2(inv * inv * (1.5 + 1.9 * rnd.x)) * q.xz;
  vis = mix(0.24, 1.0, e * e);

  // scroll: the hub lets go — particles stream outward and sink toward the page below
  float s = uScatter;
  float burst = s * (0.1 + 0.3 * rnd.w) + s * s * (0.25 + 2.2 * rnd.y * rnd.y);
  vec3 away = normalize(q + vec3(1e-4));
  away -= uAxis * dot(away, uAxis) * 0.7;     // spread across the screen rather than into the lens
  q += away * burst * (0.45 + 0.9 * length(q));
  q += uDown * (s * 0.5 + s * s * 2.4) * (0.2 + 1.6 * rnd.x * rnd.x);

  // pointer: push away from the ray under the cursor, like a force field
  vec3 rel = q - uRayO;
  vec3 perp = rel - uRayD * dot(rel, uRayD);
  float f = uForce * exp(-dot(perp, perp) / 0.1);
  q += normalize(perp + vec3(1e-5)) * f * 0.13;
  vForce = f;
  return q;
}
`;

/** Projection, perspective size, depth of field and all the fades of a point sprite. */
const POINT_VERT = /* glsl */ `
${COMMON}

varying vec3 vColor;
varying float vAlpha;
varying float vBlur;

// sizePx: sprite diameter in css px at the hub centre. guard: how much the headline guard applies.
// farFade: brightness left on the far side of the hub.
void finish(vec3 q, float sizePx, float alpha, float guard, float farFade) {
  vec4 mv = modelViewMatrix * vec4(q, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 1e-3);
  float persp = uRefDepth / depth;
  float coc = uDof * (1.0 - 0.5 * uScatter) * abs(depth - uFocus) / depth;
  float base = sizePx * uSize * persp;
  float full = base + 2.0 * coc;
  float ps = full * uDpr;
  float energy = (base * base) / (full * full);
  float tiny = min(1.0, ps / 3.0);
  gl_PointSize = min(max(ps, 3.0), uMaxPoint);
  float far = mix(1.0, farFade, smoothstep(-0.7, 1.05, depth - uRefDepth));
  float near = smoothstep(0.35, 1.5, depth);
  vAlpha = alpha * (1.0 + vForce) * energy * tiny * tiny * far * near * quiet(gl_Position, guard) * uFade * uGain;
  vBlur = clamp(2.0 * coc / full, 0.0, 1.0);
}
`;

/** Soft round sprite: a gaussian speck in focus, a soft-edged bokeh disc out of focus. */
export const POINT_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vBlur;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(c, c);
  float speck = max(0.0, exp(-d2 * 4.2) - 0.015);
  float disc = (1.0 - smoothstep(0.5, 1.0, sqrt(d2))) * 0.42;
  float a = mix(speck, disc, vBlur) * vAlpha;
  gl_FragColor = vec4(vColor * a, a);
}
`;

/** The shell: a dense skin of points sliding along a breathing, rippling surface. */
export const SHELL_VERT = /* glsl */ `
${POINT_VERT}

attribute vec4 aRand;       // x layer, y size class, z phase, w tint
uniform vec2 uFlow;         // frequency, amplitude of the surface flow

void main() {
  float t = uTime;
  // flow: slide the points along the surface so they bunch into drifting filaments
  vec3 w = snoise3(position * uFlow.x + vec3(0.0, t * 0.05, 0.0))
    + 0.3 * snoise3(position * uFlow.x * 2.7 + vec3(t * 0.07, 0.0, 9.2));
  vec3 d = normalize(position + w * uFlow.y);
  float n1, n2, glow;
  float r = surface(d, n1, n2, glow);

  float layer = aRand.x;
  float halo = smoothstep(0.86, 1.0, layer);          // outer 14 %: a thin atmosphere
  float deep = 1.0 - smoothstep(0.0, 0.12, layer);    // inner 12 %: gives the skin thickness
  r += (layer - 0.5) * 0.02 + halo * halo * 0.3 - deep * 0.09;
  vec3 p = d * r;

  float relief = smoothstep(-0.6, 0.8, n1 * 0.55 + n2 * 0.75);   // crests catch the light
  float twinkle = 0.72 + 0.28 * sin(t * (0.7 + aRand.z * 2.6) + aRand.w * TAU);
  float mag = pow(aRand.y, 6.0);                                   // most are faint, a few shine
  float spark = smoothstep(0.86, 1.0, mag);
  float sizePx = 2.2 + 1.9 * mag + 1.2 * glow;
  float alpha = (0.16 + 0.9 * mag + 1.1 * spark) * mix(0.42, 1.55, relief) * twinkle;
  alpha *= 1.0 - halo * 0.72;
  alpha *= 1.0 + glow * 5.5;

  // lime crown, mint base — the border drifts with the flow
  float tone = smoothstep(-0.8, 0.8, d.y * 1.15 + n1 * 0.4 + (aRand.w - 0.5) * 0.55);
  vec3 col = mix(uMint, uLime, tone);
  col = mix(col, uHot, clamp(spark * 0.45 + glow * 0.6, 0.0, 1.0));

  float vis;
  vec3 q = dynamics(p, aRand, vis);
  vColor = col;
  finish(q, sizePx, alpha * vis, uGuard.w, 0.2);
}
`;

/** The core: nested membranes of points that flow and counter-rotate around the hot nucleus. */
export const CORE_VERT = /* glsl */ `
${POINT_VERT}

attribute vec4 aRand;

void main() {
  float t = uTime;
  float r0 = length(position);       // 0..1: which membrane this point belongs to
  vec3 b = position / max(r0, 1e-4);
  float turn = step(0.5, fract(r0 * 6.37)) * 2.0 - 1.0;
  b.xz = rot2(turn * t * (0.12 + 0.2 / (0.25 + r0))) * b.xz;
  b.xy = rot2(t * 0.09 + r0 * 4.0) * b.xy;
  vec3 w = snoise3(b * 1.9 + vec3(0.0, t * 0.2, r0 * 7.0));
  vec3 d = normalize(b + w * 0.5);
  float n = snoise(d * 2.6 + vec3(t * 0.28, r0 * 5.0, 0.0));
  vec3 p = d * r0 * (1.0 + 0.2 * n) * 0.45;
  p *= 1.0 + 0.045 * sin(t * 1.2 - r0 * 5.0);

  float heat = 1.0 - smoothstep(0.0, 0.9, r0);
  float twinkle = 0.7 + 0.3 * sin(t * (1.2 + aRand.w * 3.0) + aRand.z * TAU);
  float sizePx = mix(2.1, 3.2, aRand.y * aRand.y) + heat * 0.8;
  float alpha = mix(0.1, 0.9, heat * heat * heat) * mix(0.45, 1.3, smoothstep(-0.5, 0.7, n)) * twinkle;
  vec3 col = mix(mix(uMint, uLime, 0.45 + 0.55 * aRand.x), uHot, heat * heat * 0.4);

  float vis;
  vec3 q = dynamics(p, aRand, vis);
  vColor = col;
  finish(q, sizePx, alpha * vis, 0.0, 0.75);
}
`;

/** Orbit rings: a crisp line inside a dusty band, with pulses of light sweeping round. */
export const RING_VERT = /* glsl */ `
${POINT_VERT}

#define NR ${RINGS}
attribute vec4 aRing;       // angle (or bead index), radial offset, lift, ring index
attribute vec4 aRand;       // x kind (0 line, 1 band, 2 bead), yzw random
uniform vec3 uRingU[NR];
uniform vec3 uRingV[NR];
uniform vec4 uRingP[NR];    // radius, spin (rad / s), light pulses per turn, pulses passing per second
uniform vec3 uInk;

void main() {
  float t = uTime;
  int id = int(aRing.w + 0.5);
  vec4 P = uRingP[id];
  vec3 U = uRingU[id];
  vec3 V = uRingV[id];
  float bead = step(1.5, aRand.x);
  float band = step(0.5, aRand.x) * (1.0 - bead);

  // beads ride the head of each pulse; everything else just orbits
  float th = mix(aRing.x + t * P.y, TAU * (aRing.x + t * P.w) / P.z, bead);
  vec3 p = (U * cos(th) + V * sin(th)) * (P.x + aRing.y) + cross(V, U) * aRing.z;

  float sweep = fract(th / TAU * P.z - t * P.w);      // 0 just ahead of a pulse → 1 right behind it
  float tail = pow(sweep, 6.0);
  float flicker = 0.75 + 0.25 * sin(t * (1.0 + aRand.w * 2.0) + aRand.z * TAU);
  float line = (0.2 + 0.8 * tail) * flicker;
  float dust = (0.07 + 0.22 * tail * tail) * flicker;
  float alpha = mix(mix(line, dust, band), 2.4, bead);
  float sizePx = mix(mix(2.3, 2.9, band), 9.0, bead);

  float tint = float(id) / float(NR - 1);
  vec3 col = mix(mix(uMint, uLime, tint), uInk, 0.25 + 0.3 * aRand.y);
  col = mix(col, uHot, max(bead, tail * 0.35));

  float vis;
  vec3 q = dynamics(p, vec4(aRand.yzw, aRand.y), vis);
  vColor = col;
  finish(q, sizePx, alpha * vis, 1.0, 0.5);
}
`;

/** Sparse outer dust: slow orbits, and the odd bright grain that the lens turns into bokeh. */
export const DUST_VERT = /* glsl */ `
${POINT_VERT}

attribute vec4 aRand;
uniform vec3 uInk;

void main() {
  float t = uTime;
  vec3 b = position;
  float r0 = length(b);
  b.xz = rot2(t * 0.055 / (0.5 + 0.4 * r0)) * b.xz;
  b.y += 0.05 * sin(t * 0.23 + aRand.z * TAU);

  float bokeh = step(0.955, aRand.y);
  float twinkle = 0.55 + 0.45 * sin(t * (0.4 + aRand.w * 1.7) + aRand.z * TAU);
  float sizePx = mix(2.0, 3.0, aRand.x) + bokeh * 2.0;
  float alpha = (0.04 + 0.16 * aRand.x * aRand.x) * twinkle + bokeh * 0.8;
  vec3 col = mix(mix(uMint, uLime, aRand.w), uInk, 0.3);

  float vis;
  vec3 q = dynamics(b, aRand, vis);
  vColor = col;
  finish(q, sizePx, alpha * vis, 1.0, 0.7);
}
`;

/** Nodes: the points agents travel between. They ride the surface and flash on arrival. */
export const NODE_VERT = /* glsl */ `
${COMMON}

attribute float aSeed;
varying float vAlpha;
varying float vFlash;
varying float vAge;
varying float vPx;

void main() {
  vec3 d = position;
  float n1, n2, glow;
  float r = surface(d, n1, n2, glow);

  float flash = 0.0;
  float age = 99.0;
  for (int i = 0; i < NP; i++) {
    float a = uTime - uPulseT[i];
    float hit = step(0.9998, dot(d, uPulse[i].xyz)) * step(0.0, a);
    flash += hit * exp(-a * 2.4);
    age = min(age, mix(99.0, a, hit));
  }

  float vis;
  vec4 rnd = vec4(aSeed, fract(aSeed * 7.13), fract(aSeed * 3.71), fract(aSeed * 11.9));
  vec3 q = dynamics(d * (r + 0.006), rnd, vis);
  vec4 mv = modelViewMatrix * vec4(q, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 1e-3);
  float ps = min(44.0 * uSize * (uRefDepth / depth) * uDpr, uMaxPoint);
  gl_PointSize = ps;
  vPx = ps / uDpr;
  float far = mix(1.0, 0.22, smoothstep(-0.7, 1.05, depth - uRefDepth));
  float idle = 0.7 + 0.3 * sin(uTime * 1.3 + aSeed * TAU);
  vAlpha = far * uAgents * uFade * vis * vis * (1.0 - smoothstep(0.0, 0.5, uScatter)) * quiet(gl_Position, uGuard.w);
  vFlash = min(flash, 1.5) * uAgents;
  vAge = age;
  vAlpha *= mix(idle, 1.0, min(vFlash, 1.0));
}
`;

export const NODE_FRAG = /* glsl */ `
uniform vec3 uLime;
uniform vec3 uHot;
varying float vAlpha;
varying float vFlash;
varying float vAge;
varying float vPx;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float len = length(c);
  float px = len * vPx * 0.5;                                    // css px from the centre
  float bead = exp(-px * px / (0.7 + 3.2 * vFlash));
  float halo = exp(-px * px / 22.0) * (0.05 + 0.85 * vFlash);
  float ring = (1.0 - smoothstep(0.0, 0.7, abs(px - 3.8))) * 0.11;
  float life = clamp(vAge / 0.9, 0.0, 1.0);
  float shock = (1.0 - smoothstep(0.0, 1.2, abs(px - (3.0 + 15.0 * sqrt(life))))) * (1.0 - life) * (1.0 - life);
  float a = bead * (0.8 + 2.4 * vFlash) + halo + ring + shock * 0.6;
  a *= vAlpha * (1.0 - smoothstep(0.82, 1.0, len));
  vec3 col = mix(uLime, uHot, clamp(bead + vFlash * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(col * a, a);
}
`;

/**
 * Agents: one instanced strip per comet. Each instance knows only where it left from, where
 * it is going and when; the arc, the taper and the retraction on landing are all derived here.
 */
export const AGENT_VERT = /* glsl */ `
${COMMON}

attribute vec3 iFrom;
attribute vec3 iTo;
attribute vec4 iData;       // launch time, flight time, seed, strength
uniform vec2 uView;         // canvas size, css px
varying vec2 vUv;
varying float vKind;
varying float vAlpha;
varying vec3 vColor;

float ease(float x) { return x * x * (3.0 - 2.0 * x); }

vec3 arcAt(float e, float omega) {
  vec3 d = normalize(sin((1.0 - e) * omega) * iFrom + sin(e * omega) * iTo + vec3(1e-6));
  float n1, n2, glow;
  float r = surface(d, n1, n2, glow);
  return d * (r + (0.05 + 0.26 * omega / PI) * sin(PI * e));
}

void main() {
  float kind = position.z;                              // 0 trail strip, 1 head sprite
  float u = position.x * (1.0 - kind);                  // 0 at the head → 1 at the tail tip
  float raw = (uTime - iData.x) / iData.y;
  float omega = acos(clamp(dot(iFrom, iTo), -1.0, 1.0));
  float tail = 0.4 * (0.8 + 0.5 * fract(iData.z * 7.31));
  // the head stops at the node; the tail keeps coming and is reeled in
  float s = min(raw, 1.0 + tail) - u * tail;
  float ds = s > 0.5 ? -0.012 : 0.012;
  vec3 p0 = arcAt(ease(clamp(s, 0.0, 1.0)), omega);
  vec3 p1 = arcAt(ease(clamp(s + ds, 0.0, 1.0)), omega);

  vec4 c0 = projectionMatrix * modelViewMatrix * vec4(p0, 1.0);
  vec4 c1 = projectionMatrix * modelViewMatrix * vec4(p1, 1.0);
  vec2 dir = (c1.xy / c1.w - c0.xy / c0.w) * uView * sign(ds);
  float len = length(dir);
  dir = len > 1e-4 ? dir / len : vec2(1.0, 0.0);
  float persp = uRefDepth / max(c0.w, 1e-3);
  float halfW = 5.0 * pow(1.0 - u, 1.3) * persp * uSize;
  vec2 off = mix(vec2(-dir.y, dir.x) * position.y * halfW, position.xy * 16.0 * persp * uSize, kind);
  c0.xy += off / (uView * 0.5) * c0.w;
  gl_Position = c0;

  float far = mix(1.0, 0.3, smoothstep(-0.7, 1.05, c0.w - uRefDepth));
  float born = smoothstep(0.0, 0.06, raw);
  float landed = 1.0 - smoothstep(1.0, 1.0 + 0.3 / iData.y, raw);
  float inFlight = step(0.0, s) * step(s, 1.0);
  vAlpha = born * mix(inFlight, landed, kind) * far * uAgents * uFade * quiet(c0, uGuard.w)
    * (1.0 - smoothstep(0.0, 0.45, uScatter)) * (0.75 + 0.25 * iData.w);
  vUv = mix(vec2(u, position.y), position.xy, kind);
  vKind = kind;
  vColor = mix(uMint, uLime, fract(iData.z * 3.17));
}
`;

export const AGENT_FRAG = /* glsl */ `
uniform vec3 uHot;
varying vec2 vUv;
varying float vKind;
varying float vAlpha;
varying vec3 vColor;

void main() {
  float a;
  vec3 col;
  if (vKind > 0.5) {
    float d2 = dot(vUv, vUv);
    float core = exp(-d2 * 30.0);
    float glow = max(0.0, exp(-d2 * 5.5) - 0.004) * 0.45;
    a = core * 3.2 + glow * 1.3;
    col = mix(vColor, uHot, clamp(core * 1.6, 0.0, 1.0));
  } else {
    float across = max(0.0, exp(-vUv.y * vUv.y * 3.4) - 0.033);
    float along = pow(1.0 - vUv.x, 1.7);
    a = across * along * 1.5;
    col = mix(vColor, uHot, along * along * 0.75);
  }
  a *= vAlpha;
  gl_FragColor = vec4(col * a, a);
}
`;

/** A camera-facing glow at the centre: the nucleus, its halo and a faint fill inside the shell. */
export const AURA_VERT = /* glsl */ `
uniform float uAuraScale;
varying vec2 vUv;

void main() {
  vUv = position.xy;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uAuraScale;
  gl_Position = projectionMatrix * mv;
}
`;

export const AURA_FRAG = /* glsl */ `
uniform float uTime;
uniform float uGlow;
uniform float uNucleus;        // dimmed where the heart sits behind the headline
uniform vec3 uLime;
uniform vec3 uMint;
uniform vec3 uHot;
varying vec2 vUv;

void main() {
  float len = length(vUv);
  float r = len * 1.6;                                  // hub radii
  float breathe = 0.9 + 0.1 * sin(uTime * 0.9);
  float nucleus = exp(-r * r * 210.0) * 1.15 * breathe * uNucleus;
  float heart = exp(-r * r * 15.0) * 0.17 * breathe;
  float body = exp(-r * r * 2.1) * 0.018;
  vec3 col = mix(uLime, uHot, 0.42) * nucleus + mix(uLime, uHot, 0.2) * heart + mix(uMint, uLime, 0.55) * body;
  col *= uGlow * (1.0 - smoothstep(0.7, 1.0, len));
  gl_FragColor = vec4(col, 0.0);
}
`;

/**
 * Bright-pass for UnrealBloomPass (replaces its single-tap one). Four bilinear taps make an
 * exact box filter over the source texels each glow texel covers, then a soft knee keeps only
 * the light that should bloom.
 */
export const BLOOM_PREFILTER_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uStep;                 // a quarter of a glow texel, in uv
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;

void main() {
  vec3 c = 0.25 * (
      texture2D(tDiffuse, vUv + uStep * vec2(-1.0, -1.0)).rgb
    + texture2D(tDiffuse, vUv + uStep * vec2(1.0, -1.0)).rgb
    + texture2D(tDiffuse, vUv + uStep * vec2(-1.0, 1.0)).rgb
    + texture2D(tDiffuse, vUv + uStep * vec2(1.0, 1.0)).rgb);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(c * smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, l), 1.0);
}
`;

/**
 * Final pass: scene light plus glow, filmic tone mapping, sRGB encode, a little dither against
 * banding, and an alpha derived from the light itself so the page shows through wherever the
 * hub is dark.
 */
export const OUTPUT_SHADER = {
  name: "HubOutput",
  uniforms: {
    tDiffuse: { value: null },
    tBloom: { value: null },
    uBloom: { value: 0 },
    uExposure: { value: 1 },
  },
  vertexShader: /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uExposure;
varying vec2 vUv;

// ACES filmic fit (Krzysztof Narkowicz)
vec3 filmic(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 encodeSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec3 c = max(texture2D(tDiffuse, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom, 0.0) * uExposure;
  c = encodeSrgb(filmic(c));
  float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  c = max(c + (n - 0.5) / 255.0, 0.0);
  float a = min(max(c.r, max(c.g, c.b)), 1.0);
  gl_FragColor = vec4(c, a);
}
`,
};
