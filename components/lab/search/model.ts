/**
 * The semantic-search model, pure TypeScript: TF-IDF over words and letter trigrams, cosine
 * similarity, and a PCA projection to 3D for the map. No three.js, no React, no clock; the same
 * input always gives the same vectors, neighbours and coordinates.
 */

export type SearchLang = "pt" | "en";

const STOP_WORDS = {
  pt: "a o os as um uma uns umas de do da dos das em no na nos nas num numa por pelo pela para pra com sem e ou que se ao aos e eh ser sao foi era como mais menos muito muita sua seu suas seus meu minha nosso nossa voce voces eu me te isso esse essa este esta qual quais quando onde quanto quanta da dar posso pode podem tem ter ha faco fazer vai ja so tambem",
  en: "a an the of to in on at by for with without and or that this these those is are was be been it its as from if into your you my our we i me do does did can could how what when where which who why will would there their not no yes up out about any all",
};
const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const STOP: Record<SearchLang, Set<string>> = {
  pt: new Set(normalize(STOP_WORDS.pt).split(" ")),
  en: new Set(normalize(STOP_WORDS.en).split(" ")),
};

/** Content words of a text, accents stripped. */
export function words(text: string, lang: SearchLang): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP[lang].has(w));
}

const WORD_WEIGHT = 2;

/** Raw feature counts: each word, plus the letter trigrams of `_word_`. */
function features(text: string, lang: SearchLang): Map<string, number> {
  const f = new Map<string, number>();
  const add = (k: string, v: number) => f.set(k, (f.get(k) ?? 0) + v);
  for (const w of words(text, lang)) {
    add(`w:${w}`, WORD_WEIGHT);
    const p = `_${w}_`;
    for (let i = 0; i + 3 <= p.length; i++) add(p.slice(i, i + 3), 1);
  }
  return f;
}

export type SearchIndex = {
  lang: SearchLang;
  n: number;
  /** Feature → column. */
  vocab: Map<string, number>;
  names: string[];
  idf: Float32Array;
  /** n × V, each row L2-normalised. */
  docs: Float32Array;
  mean: Float32Array;
  /** 3 × V principal directions. */
  comps: Float32Array;
  /** n × 3, the passages on the map (max radius 1). */
  coords: Float32Array;
  scale: number;
};

/** Writes the L2-normalised TF-IDF vector of `counts` into `out` (length V). */
function weigh(counts: Map<string, number>, vocab: Map<string, number>, idf: Float32Array, out: Float32Array) {
  out.fill(0);
  let norm = 0;
  for (const [k, c] of counts) {
    const j = vocab.get(k);
    if (j === undefined) continue;
    const v = Math.log1p(c) * idf[j];
    out[j] = v;
    norm += v * v;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) for (let j = 0; j < out.length; j++) out[j] /= norm;
  return norm;
}

export function buildIndex(texts: readonly string[], lang: SearchLang): SearchIndex {
  const n = texts.length;
  const counts = texts.map((t) => features(t, lang));
  const vocab = new Map<string, number>();
  const names: string[] = [];
  const df: number[] = [];
  for (const c of counts)
    for (const k of c.keys()) {
      let j = vocab.get(k);
      if (j === undefined) {
        j = names.length;
        vocab.set(k, j);
        names.push(k);
        df.push(0);
      }
      df[j]++;
    }
  const V = names.length;
  const idf = new Float32Array(V);
  for (let j = 0; j < V; j++) idf[j] = Math.log((n + 1) / (df[j] + 1)) + 1;
  const docs = new Float32Array(n * V);
  for (let i = 0; i < n; i++) weigh(counts[i], vocab, idf, docs.subarray(i * V, (i + 1) * V));

  // PCA through the n × n Gram matrix of the centred rows (n is small, V is not).
  const mean = new Float32Array(V);
  for (let i = 0; i < n; i++) for (let j = 0; j < V; j++) mean[j] += docs[i * V + j] / n;
  const xc = new Float64Array(n * V);
  for (let i = 0; i < n; i++) for (let j = 0; j < V; j++) xc[i * V + j] = docs[i * V + j] - mean[j];
  const G = new Float64Array(n * n);
  for (let a = 0; a < n; a++)
    for (let b = a; b < n; b++) {
      let s = 0;
      for (let j = 0; j < V; j++) s += xc[a * V + j] * xc[b * V + j];
      G[a * n + b] = G[b * n + a] = s;
    }
  const us: Float64Array[] = [];
  const lambdas: number[] = [];
  for (let c = 0; c < 3; c++) {
    let u = new Float64Array(n);
    for (let i = 0; i < n; i++) u[i] = 1 + ((i * 7 + c * 13) % 11) / 10;
    for (let it = 0; it < 400; it++) {
      const next = new Float64Array(n);
      for (let a = 0; a < n; a++) {
        let s = 0;
        for (let b = 0; b < n; b++) s += G[a * n + b] * u[b];
        next[a] = s;
      }
      for (const p of us) {
        let d = 0;
        for (let i = 0; i < n; i++) d += next[i] * p[i];
        for (let i = 0; i < n; i++) next[i] -= d * p[i];
      }
      let norm = 0;
      for (let i = 0; i < n; i++) norm += next[i] * next[i];
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < n; i++) next[i] /= norm;
      u = next;
    }
    let lambda = 0;
    for (let a = 0; a < n; a++) {
      let s = 0;
      for (let b = 0; b < n; b++) s += G[a * n + b] * u[b];
      lambda += u[a] * s;
    }
    us.push(u);
    lambdas.push(Math.max(lambda, 1e-9));
  }
  const comps = new Float32Array(3 * V);
  const coords = new Float32Array(n * 3);
  for (let c = 0; c < 3; c++) {
    const sigma = Math.sqrt(lambdas[c]);
    for (let j = 0; j < V; j++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += xc[i * V + j] * us[c][i];
      comps[c * V + j] = s / sigma;
    }
    for (let i = 0; i < n; i++) coords[i * 3 + c] = us[c][i] * sigma;
  }
  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, Math.hypot(coords[i * 3], coords[i * 3 + 1], coords[i * 3 + 2]));
  const scale = max > 0 ? 1 / max : 1;
  for (let i = 0; i < n * 3; i++) coords[i] *= scale;
  return { lang, n, vocab, names, idf, docs, mean, comps, coords, scale };
}

export type Query = {
  text: string;
  /** L2-normalised TF-IDF vector (length V); all zeros when nothing matched the vocabulary. */
  vec: Float32Array;
  /** The heaviest features, for showing what a vector is. */
  top: { feature: string; weight: number }[];
  /** Position on the map (max radius ~1.2). */
  point: [number, number, number];
  /** Best passages, most similar first. */
  hits: { index: number; score: number }[];
  /** Whether the best passage clears MIN_SCORE. */
  answered: boolean;
};

/** Below this cosine similarity the agent says it doesn't know. */
export const MIN_SCORE = 0.2;

export function ask(index: SearchIndex, text: string, k = 3): Query {
  const V = index.names.length;
  const vec = new Float32Array(V);
  const norm = weigh(features(text, index.lang), index.vocab, index.idf, vec);
  const top: Query["top"] = [];
  if (norm > 0) {
    const order = Array.from(vec.keys())
      .filter((j) => vec[j] > 0)
      .sort((a, b) => vec[b] - vec[a] || a - b)
      .slice(0, 8);
    for (const j of order) top.push({ feature: index.names[j], weight: vec[j] });
  }
  const scores: { index: number; score: number }[] = [];
  for (let i = 0; i < index.n; i++) {
    let s = 0;
    const row = i * V;
    for (let j = 0; j < V; j++) if (vec[j] !== 0) s += vec[j] * index.docs[row + j];
    scores.push({ index: i, score: s });
  }
  scores.sort((a, b) => b.score - a.score || a.index - b.index);
  const hits = scores.slice(0, k);
  const point: [number, number, number] = [0, 0, 0];
  if (norm > 0)
    for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let j = 0; j < V; j++) s += (vec[j] - index.mean[j]) * index.comps[c * V + j];
      point[c] = s * index.scale;
    }
  const r = Math.hypot(point[0], point[1], point[2]);
  if (r > 1.2) for (let c = 0; c < 3; c++) point[c] *= 1.2 / r;
  return { text, vec, top, point, hits, answered: norm > 0 && hits[0].score >= MIN_SCORE };
}

/** k nearest passages of passage `i` by cosine (for the faint constellation lines). */
export function neighbours(index: SearchIndex, i: number, k = 2): number[] {
  const V = index.names.length;
  const out: { j: number; s: number }[] = [];
  for (let j = 0; j < index.n; j++) {
    if (j === i) continue;
    let s = 0;
    for (let c = 0; c < V; c++) s += index.docs[i * V + c] * index.docs[j * V + c];
    out.push({ j, s });
  }
  return out
    .sort((a, b) => b.s - a.s || a.j - b.j)
    .slice(0, k)
    .map((o) => o.j);
}

/** Readable name of a feature: `w:entrega` → "entrega", `_en` → "␣en". */
export const featureLabel = (f: string) => (f.startsWith("w:") ? f.slice(2) : f.replace(/_/g, "·"));
