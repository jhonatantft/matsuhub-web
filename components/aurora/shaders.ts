/**
 * Shaders of the Aurora stage: one fullscreen quad that composes every picture.
 *
 * Space conventions
 * - `s`  screen position, 0..1 with the origin at the TOP-left (same as CSS).
 * - `uv` image position, 0..1 with the origin at the top-left (textures are uploaded unflipped).
 * - `uXf*` maps s → uv for a scene: uv = s * xf.xy + xf.zw. The "cover" maths lives in
 *   stage-core.ts, so the shader never stretches a picture.
 * - Mip levels are explicit (`uLod*`, computed on the CPU from the real scale): sampling stays
 *   well defined inside the cut's loop, and raising the level is a free, smooth blur.
 * - Colour maths runs in an approximate linear space (texel², sqrt on the way out): blurs
 *   keep their highlights and cross-fades look like light, not like paint. Mind the sqrt when
 *   adding glow: a value of 0.04 here reads as 0.2 on screen.
 *
 * Compile-time defines: TAPS (samples of the cut's radial smear), DEBUG_FLOORS (slab overlay).
 */

export const AURORA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const AURORA_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2 uRes;        // canvas size, CSS px
uniform float uTime;
uniform float uMotion;    // 1 = ambient motion allowed, 0 = prefers-reduced-motion

uniform sampler2D tBlue;
uniform sampler2D tDay;
uniform sampler2D tDusk;
uniform sampler2D tFrom;
uniform sampler2D tTo;

uniform vec4 uXfFrom;
uniform vec4 uXfTo;
uniform float uLodFrom;
uniform float uLodTo;
uniform float uFromExt;   // 1 when that side is the exterior composite
uniform float uToExt;
uniform float uFadeFrom;  // 0..1 fade-in of a picture that has just finished loading
uniform float uFadeTo;

uniform float uMix;       // 0..1 progress of the cut from → to
uniform vec2 uPivot;      // screen point the camera flies through
uniform float uPower;     // strength of the cut (0.6 lateral … 1 full zoom-through)

uniform float uBuild;     // 0 blueprint … 1 photo
uniform float uDusk;      // 0 day … 1 blue hour
uniform vec4 uBand;       // highlighted floor: x0, y0, x1, y1 (image fractions)
uniform float uBandA;
uniform vec4 uFacade;
uniform vec2 uExtPx;      // CSS px per image fraction on the exterior (for crisp 1 px lines)
uniform vec3 uBg;
#ifdef DEBUG_FLOORS
uniform float uLines[22];
#endif

const vec3 LIME = vec3(0.526, 1.0, 0.086);
const vec3 LIME_HOT = vec3(0.86, 1.0, 0.62);
const vec3 GOLD = vec3(0.82, 0.598, 0.293);
const vec3 CREAM = vec3(0.92, 0.886, 0.81);
const vec3 LUMA = vec3(0.3, 0.59, 0.11);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
// interleaved gradient noise: a dither that hides tap banding without looking like static
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 texel(sampler2D t, vec2 uv, float lod) {
  vec3 c = textureLod(t, uv, lod).rgb;
  return c * c;
}

/* ── Exterior: day → blue hour. The sky cross-fades; warm lights switch on in clusters. ── */
vec3 photoAt(vec2 uv, float lod) {
  if (uDusk <= 0.001) return texel(tDay, uv, lod);
  vec3 night = texel(tDusk, uv, lod);
  if (uDusk >= 0.999) return night;
  vec3 day = texel(tDay, uv, lod);
  // "lamp": warm and brighter than the same pixel by day (windows, street lights, reflections)
  float lamp = smoothstep(0.04, 0.22, night.r - night.b) * smoothstep(0.02, 0.16, dot(night, LUMA) - dot(day, LUMA) * 0.92);
  float n = vnoise(uv * vec2(78.0, 47.0));
  float on = smoothstep(0.0, 0.13, uDusk * 1.3 - 0.2 - n * 0.8);
  vec3 unlit = night * mix(vec3(1.0), vec3(0.17, 0.2, 0.3), lamp);
  return mix(day, mix(unlit, night, on), smoothstep(0.0, 0.74, uDusk));
}

/* ── Floor highlight, drawn in image space so it sticks to the slabs ── */
vec3 bandOn(vec3 c, vec2 uv) {
  if (uBandA <= 0.002) return c;
  vec2 q = (abs(uv - (uBand.xy + uBand.zw) * 0.5) - (uBand.zw - uBand.xy) * 0.5) * uExtPx;
  float d = max(q.x, q.y);                                // CSS px to the band's edge, negative inside
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 fq = (abs(uv - (uFacade.xy + uFacade.zw) * 0.5) - (uFacade.zw - uFacade.xy) * 0.5) * uExtPx;
  float tower = 1.0 - smoothstep(-1.0, 14.0, max(fq.x, fq.y));
  // the other floors step back a little, the chosen one lifts
  c *= 1.0 - 0.36 * uBandA * tower * (1.0 - inside);
  float along = (uv.x - uBand.x) / (uBand.z - uBand.x);
  float sweep = exp(-pow((fract(uTime * 0.19) * 2.2 - 0.6 - along) * 4.5, 2.0)) * uMotion;
  c = mix(c, c * 1.32 + CREAM * (0.05 + 0.13 * sweep), inside * uBandA);
  float rim = max(exp(-q.y * q.y / 0.7) * step(q.x, 0.5), exp(-q.x * q.x / 0.7) * step(q.y, 0.5));
  float halo = exp(-max(d, 0.0) / 5.0) * (1.0 - inside);
  return c + (CREAM * rim * 0.9 + GOLD * halo * 0.12) * uBandA;
}

/* ── Blueprint hologram ── */
vec3 wireAt(vec2 uv, vec2 s, float lod) {
  vec3 w = texel(tBlue, uv, lod);
  float sweep = exp(-pow((fract(uTime * 0.11) * 1.7 - 0.35 - (1.0 - s.y)) * 6.0, 2.0));
  float flick = 0.965 + 0.035 * sin(uTime * 11.0) * sin(uTime * 6.3);
  return w * mix(1.0, flick * (1.0 + 0.75 * sweep), uMotion);
}

vec3 exteriorAt(vec2 uv, vec2 s, float lod) {
  if (uBuild >= 0.999) return bandOn(photoAt(uv, lod), uv);
  vec3 wire = wireAt(uv, s, lod);
  if (uBuild <= 0.001) return wire;

  // The scan line climbs the screen; the photo exists below it, the drawing above.
  float line = mix(1.06, -0.06, uBuild);
  float d = (s.y - line) * uRes.y;                        // CSS px below (+) / above (−) the line
  vec3 photo = bandOn(photoAt(uv, lod), uv);
  float fresh = exp(-max(d, 0.0) / 100.0);                // just-built zone: the drawing still shows through
  vec3 built = photo * (1.0 + 0.16 * fresh) + wire * fresh * 0.7 + LIME * fresh * 0.012;
  vec3 col = mix(wire, built, smoothstep(-1.0, 1.0, d));

  float gate = smoothstep(0.0, 0.035, uBuild) * (1.0 - smoothstep(0.965, 1.0, uBuild));
  float core = exp(-d * d / 2.4);
  float halo = exp(-abs(d) / 7.0);
  float beam = exp(-max(-d, 0.0) / 55.0) * step(d, 0.0);  // light thrown up onto the drawing
  float spark = smoothstep(0.7, 0.96, vnoise(vec2(s.x * uRes.x * 0.07, uTime * 2.6 * uMotion)));
  col += (LIME * (halo * 0.34 + beam * 0.016) + LIME_HOT * core * (1.1 + 1.5 * spark)) * gate;
  return col;
}

#ifdef DEBUG_FLOORS
vec3 debugFloors(vec3 c, vec2 uv) {
  float px = 1.0 / uExtPx.y;
  if (uv.x > uFacade.x && uv.x < uFacade.z) {
    for (int i = 0; i < 22; i++) if (abs(uv.y - uLines[i]) < px * 0.6) c = vec3(1.0, 0.0, 1.0);
  }
  if (uv.y > uFacade.y && uv.y < uFacade.w) {
    float qx = 0.6 / uExtPx.x;
    if (abs(uv.x - uFacade.x) < qx || abs(uv.x - uFacade.z) < qx) c = vec3(0.0, 1.0, 1.0);
  }
  return c;
}
#endif

vec3 sideFrom(vec2 s, float blur) {
  vec2 uv = s * uXfFrom.xy + uXfFrom.zw;
  if (uFromExt > 0.5) {
    vec3 c = mix(uBg, exteriorAt(uv, s, uLodFrom + blur), uFadeFrom);
#ifdef DEBUG_FLOORS
    c = debugFloors(c, uv);
#endif
    return c;
  }
  return mix(uBg, texel(tFrom, uv, uLodFrom + blur), uFadeFrom);
}
vec3 sideTo(vec2 s, float blur) {
  vec2 uv = s * uXfTo.xy + uXfTo.zw;
  if (uToExt > 0.5) return mix(uBg, exteriorAt(uv, s, uLodTo + blur), uFadeTo);
  return mix(uBg, texel(tTo, uv, uLodTo + blur), uFadeTo);
}

/* ── The cut: the camera flies through uPivot; the next picture grows out of that point ── */
vec3 cut(vec2 s) {
  float p = uMix;
  float asp = uRes.x / uRes.y;
  vec2 d = s - uPivot;
  float r = length(vec2(d.x * asp, d.y));                 // distance to the pivot, in canvas heights
  float push = p * p * p;                                 // accelerating into the picture
  float settle = 1.0 - pow(1.0 - p, 3.0);                 // decelerating onto the next one
  float bell = sin(3.14159265 * p);

  float zf = 1.0 + uPower * 1.9 * push;
  float zt = 1.0 - uPower * 0.3 * (1.0 - settle);
  float bf = uPower * 0.42 * smoothstep(0.0, 0.6, p);     // radial smear, as relative scale spread
  float bt = uPower * 0.36 * (1.0 - smoothstep(0.22, 0.8, p));
  // Mip blur matched to the distance between two taps: one continuous streak, no ghost copies.
  float gap = r * uRes.y * 1.6 / float(TAPS);
  float softF = log2(1.0 + gap * bf) + 1.3 * smoothstep(0.0, 0.5, p) * uPower;
  float softT = log2(1.0 + gap * bt) + 1.7 * (1.0 - smoothstep(0.18, 0.78, p)) * uPower;

  // soft displacement: both pictures ripple like heat haze while they overlap
  float haze = smoothstep(0.04, 0.4, p) * (1.0 - smoothstep(0.46, 0.8, p));
  vec2 q = s * vec2(asp, 1.0) * 2.3;
  vec2 flow = (vec2(vnoise(q + vec2(3.7, 1.3)), vnoise(q + vec2(19.1, 7.3))) - 0.5) * 0.055 * haze * uPower;

  // dissolve front: grows out of the pivot with an organic rim
  float n = vnoise(q * 1.6 + 11.0) * 0.62 + vnoise(q * 4.3 + 5.0) * 0.38;
  float m = smoothstep(0.0, 0.44, p * 1.78 - 0.4 - r * 0.42 + (n - 0.5) * 0.4);

  vec3 from = vec3(0.0);
  vec3 to = vec3(0.0);
  vec3 wsum = vec3(0.0);
  float jitter = ign(gl_FragCoord.xy);
  for (int i = 0; i < TAPS; i++) {
    float t = (float(i) + jitter) / float(TAPS);
    // red leans to the near taps and blue to the far ones: a little lens fringe for free
    vec3 w = vec3(1.0) + vec3(0.5 - t, 0.0, t - 0.5) * 1.2 * bell;
    // taps always step towards the pivot, so they never leave the picture
    if (m < 0.996) from += w * sideFrom(uPivot + d / (zf * (1.0 + bf * t)) + flow, softF);
    if (m > 0.004) to += w * sideTo(uPivot + d / (zt * (1.0 + bt * t)) - flow * 0.7, softT);
    wsum += w;
  }
  vec3 col = mix(from / wsum, to / wsum, m);
  // exposure blooms around the pivot while the two pictures overlap
  col *= 1.0 + 0.5 * bell * bell * uPower * (0.25 + 0.75 * exp(-r * 2.4));
  return col;
}

void main() {
  vec2 s = vec2(vUv.x, 1.0 - vUv.y);
  vec3 col;
  if (uMix <= 0.0005) col = sideFrom(s, 0.0);
  else if (uMix >= 0.9995) col = sideTo(s, 0.0);
  else col = cut(s);

  vec2 v = s - 0.5;
  col *= 1.0 - 0.2 * smoothstep(0.2, 0.75, dot(v, v));
  col = sqrt(max(col, 0.0));
  col += (hash12(gl_FragCoord.xy + 17.0) - 0.5) / 255.0;  // dither: no banding in the navy
  gl_FragColor = vec4(col, 1.0);
}
`;
