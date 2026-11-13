/**
 * A word-level Markov chain: count which word follows each pair of words (and each single word),
 * then write by drawing the next word in proportion to count^(1/T). The same loop as an LLM,
 * with counting instead of a neural network. Pure, apart from the random number you pass in.
 */

export const START = "<s>";

export type Model = {
  next1: Map<string, Map<string, number>>;
  next2: Map<string, Map<string, number>>;
  vocab: Set<string>;
  sentences: number;
};

/** Lowercase words and numbers ("r$" included); . , ! ? are tokens of their own. */
export function tokenize(text: string, locale: string): string[] {
  return text.toLocaleLowerCase(locale).match(/[\p{L}\p{N}$]+|[.,!?]/gu) ?? [];
}

function bump(map: Map<string, Map<string, number>>, key: string, word: string) {
  let row = map.get(key);
  if (!row) map.set(key, (row = new Map()));
  row.set(word, (row.get(word) ?? 0) + 1);
}

export function train(texts: readonly string[], locale: string): Model {
  const model: Model = { next1: new Map(), next2: new Map(), vocab: new Set(), sentences: 0 };
  for (const text of texts) {
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const tokens = tokenize(sentence, locale);
      if (!tokens.length) continue;
      if (!/[.!?]/.test(tokens[tokens.length - 1])) tokens.push(".");
      model.sentences++;
      const seq = [START, ...tokens];
      for (let i = 1; i < seq.length; i++) {
        model.vocab.add(seq[i]);
        bump(model.next1, seq[i - 1], seq[i]);
        if (i >= 2) bump(model.next2, `${seq[i - 2]} ${seq[i - 1]}`, seq[i]);
      }
    }
  }
  return model;
}

export type Candidate = { word: string; p: number; count: number };
export type Prediction = { candidates: Candidate[]; context: string[]; known: boolean };

/** After ".", a new sentence starts: the context is the start marker. */
function contextOf(tokens: readonly string[]): string[] {
  const last = tokens[tokens.length - 1];
  if (!last || /[.!?]/.test(last)) return [START];
  const prev = tokens.length >= 2 && !/[.!?]/.test(tokens[tokens.length - 2]) ? tokens[tokens.length - 2] : START;
  return [prev, last];
}

export function predict(model: Model, tokens: readonly string[], temperature: number): Prediction {
  const ctx = contextOf(tokens);
  let row: Map<string, number> | undefined;
  let context = ctx;
  if (ctx.length === 2) row = model.next2.get(ctx.join(" "));
  if (!row) {
    context = [ctx[ctx.length - 1]];
    row = model.next1.get(context[0]);
  }
  if (!row) return { candidates: [], context, known: false };
  const entries = [...row].sort((a, b) => b[1] - a[1]);
  let weights: number[];
  if (temperature <= 0.001) weights = entries.map((_, i) => (i === 0 ? 1 : 0));
  else weights = entries.map(([, c]) => c ** (1 / temperature));
  const sum = weights.reduce((a, b) => a + b, 0);
  return {
    candidates: entries.map(([word, count], i) => ({ word, count, p: weights[i] / sum })),
    context: context.filter((w) => w !== START),
    known: true,
  };
}

/** The candidate a uniform draw `r` in [0, 1) lands on. */
export function pick(candidates: readonly Candidate[], r: number): number {
  let acc = 0;
  for (let i = 0; i < candidates.length; i++) {
    acc += candidates[i].p;
    if (r < acc) return i;
  }
  return candidates.length - 1;
}

/** Where each candidate starts on the 0..1 bar. */
export const offsets = (candidates: readonly Candidate[]) => {
  let acc = 0;
  return candidates.map((c) => {
    const at = acc;
    acc += c.p;
    return at;
  });
};

/** Tokens back to text: no space before punctuation, a capital after a full stop. */
export function detokenize(tokens: readonly string[]): { word: string; space: boolean; capital: boolean }[] {
  return tokens.map((w, i) => ({
    word: w,
    space: i > 0 && !/^[.,!?]$/.test(w),
    capital: i === 0 || /[.!?]/.test(tokens[i - 1]),
  }));
}
