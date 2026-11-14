/**
 * How many guesses a password needs, the honest way: the brute-force space (every character
 * multiplies it) next to a pattern-aware estimate (attackers try common passwords, dictionary
 * words with decorations, dates, sequences and repetitions first), whichever is smaller.
 * Everything in log10 so 10^80 never overflows. Pure: same input, same output.
 */

export type CharClass = "lower" | "upper" | "digit" | "symbol" | "other";
export type Finding = "common" | "word" | "phrase" | "leet" | "date" | "sequence" | "repeat" | "short";
export type AttackId = "online" | "bcrypt" | "md5";

export const CLASS_SIZE: Record<CharClass, number> = { lower: 26, upper: 26, digit: 10, symbol: 33, other: 100 };
export const CLASS_ORDER: readonly CharClass[] = ["lower", "upper", "digit", "symbol", "other"];

/** Guesses per second. Online: a site that allows 100 attempts per hour. Offline: one current GPU (hashcat). */
export const ATTACKS: readonly { id: AttackId; perSecond: number }[] = [
  { id: "online", perSecond: 100 / 3600 },
  { id: "bcrypt", perSecond: 1.5e3 },
  { id: "md5", perSecond: 1e11 },
];

const YEAR_S = 3.156e7;
/** 13.8 billion years, in seconds (log10). */
export const LOG_UNIVERSE_S = Math.log10(13.8e9 * YEAR_S);

export type Analysis = {
  length: number;
  classes: CharClass[];
  /** Distinct classes used, in display order. */
  used: CharClass[];
  pool: number;
  log10Brute: number;
  log10Guesses: number;
  bits: number;
  findings: Finding[];
};

export function classOf(ch: string): CharClass {
  if (/[a-z]/.test(ch)) return "lower";
  if (/[A-Z]/.test(ch)) return "upper";
  if (/[0-9]/.test(ch)) return "digit";
  if (/[!-/:-@[-`{-~ ]/.test(ch)) return "symbol";
  return "other";
}

const LEET: Record<string, string> = { "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o", "$": "s", "5": "s", "7": "t" };
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "abcdefghijklmnopqrstuvwxyz"];

function isSequence(s: string): boolean {
  if (s.length < 4) return false;
  const lower = s.toLowerCase();
  for (const row of ROWS) {
    if (row.includes(lower) || [...row].reverse().join("").includes(lower)) return true;
  }
  return false;
}

/** "aaaa", "abab", "abcabc": the shortest block that repeats into the whole string, or null. */
function repeatBlock(s: string): string | null {
  for (let n = 1; n <= s.length / 2; n++) {
    if (s.length % n) continue;
    const block = s.slice(0, n);
    if (block.repeat(s.length / n) === s) return block;
  }
  return null;
}

/** How many values a run of digits could be if it's a date: a year (~90) or a full date (~36,500); 0 if not a date. */
function dateOptions(digits: string): number {
  if (/^(19[5-9]\d|20[0-3]\d)$/.test(digits)) return 90;
  if (digits.length === 8) {
    const d = +digits.slice(0, 2), m = +digits.slice(2, 4), y = +digits.slice(4);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2039) return 36500;
  }
  if (digits.length === 6) {
    const d = +digits.slice(0, 2), m = +digits.slice(2, 4);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return 36500;
  }
  return 0;
}

/** Words in a good attacker dictionary (several languages, names, teams) — order of magnitude. */
const DICT = 2e5;
/** Common words people build passphrases from — the list attackers combine. */
const PHRASE_WORDS = 2e4;

const log10 = Math.log10;

export function analyze(password: string, dictionary: ReadonlySet<string>, common: readonly string[]): Analysis {
  const chars = [...password];
  const classes = chars.map(classOf);
  const used = CLASS_ORDER.filter((c) => classes.includes(c));
  const pool = used.reduce((sum, c) => sum + CLASS_SIZE[c], 0);
  const length = chars.length;
  const log10Brute = length ? length * log10(pool) : 0;
  const findings = new Set<Finding>();
  let pattern = Infinity;

  if (length) {
    const lower = password.toLowerCase();
    const deleet = (w: string) => [...w].map((c) => LEET[c] ?? c).join("");
    const known = (w: string) => dictionary.has(w) || common.includes(w);
    const compound = (w: string) => {
      for (let i = 3; i <= w.length - 3; i++) if (known(w.slice(0, i)) && known(w.slice(i))) return true;
      return false;
    };

    // 1. A classic: its rank in the list (also with the l33t swaps undone).
    const rank = common.indexOf(lower) >= 0 ? common.indexOf(lower) : common.indexOf(deleet(lower));
    if (rank >= 0) {
      findings.add("common");
      pattern = log10(rank + 1);
    }

    // 2. Keyboard rows, counting up or down.
    if (isSequence(password)) {
      findings.add("sequence");
      pattern = Math.min(pattern, log10(length * 200));
    }

    // 3. One block repeated.
    const block = repeatBlock(lower);
    if (block) {
      findings.add("repeat");
      const blockPool = [...new Set([...block].map(classOf))].reduce((sum, c) => sum + CLASS_SIZE[c], 0);
      pattern = Math.min(pattern, block.length * log10(blockPool) + log10(length));
    }

    // 4. Word + decorations: a Capital, l33t swaps, then digits (maybe a date) and symbols at the end.
    const m = /^([^a-z@4310!$57]?)([a-z@4310!$57]{3,}?)([0-9]*)([^a-z0-9]*)$/.exec(lower);
    if (m) {
      const [, prefix, raw, digits, symbols] = m;
      const word = deleet(raw);
      const isWord = known(word);
      if (isWord || compound(word)) {
        findings.add("word");
        let g = isWord ? log10(DICT) : log10(DICT) + log10(5e3);
        if (/[A-Z]/.test(password)) g += log10(4); // first letter, all caps, ...
        const leets = [...raw].filter((c) => LEET[c]).length;
        if (leets) {
          findings.add("leet");
          g += leets * log10(2);
        }
        const dates = digits ? dateOptions(digits) : 0;
        if (dates) findings.add("date");
        g += dates ? log10(dates) : digits.length;
        g += symbols.length * log10(33) + prefix.length * log10(43);
        pattern = Math.min(pattern, g);
      }
    }

    // 5. Several words with separators: a passphrase. Attackers combine common words, so every
    //    part costs at most a common-word list, whether or not our small list knows it (a real
    //    dictionary has "grampo"); a short part costs its letters if that is cheaper.
    const parts = lower.split(/[-_. ]+/).filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => /^[a-z]+$/.test(p))) {
      const g = parts.reduce((sum, p) => sum + Math.min(log10(PHRASE_WORDS), p.length * log10(26)), log10(4));
      findings.add("phrase");
      pattern = Math.min(pattern, g);
    }

    // 6. Only digits that read as a date.
    const dates = /^\d+$/.test(password) ? dateOptions(password) : 0;
    if (dates) {
      findings.add("date");
      pattern = Math.min(pattern, log10(dates));
    }

    if (length < 12) findings.add("short");
  }

  const log10Guesses = Math.min(log10Brute, pattern);
  return {
    length,
    classes,
    used,
    pool,
    log10Brute,
    log10Guesses,
    bits: log10Guesses / log10(2),
    findings: [...findings],
  };
}

/** Average time to find it (half the space), in seconds, log10. */
export const log10Seconds = (log10Guesses: number, perSecond: number) => log10Guesses - log10(2) - log10(perSecond);

/** Position on the 1 s → age-of-the-universe scale, 0..1. */
export const scaleOf = (log10S: number) => Math.min(1, Math.max(0, log10S / LOG_UNIVERSE_S));
/** Where the scale ticks sit: 1 s, 1 day, 1 year, 1,000 years, age of the universe. */
export const TICKS = [0, log10(86400), log10(YEAR_S), log10(1000 * YEAR_S), LOG_UNIVERSE_S].map(scaleOf);

/** "3 horas", "40 mil anos": the unit table is [singular, plural-with-{n}] from the copy. */
export function formatDuration(
  log10S: number,
  t: { instant: string; universe: string; units: readonly (readonly [string, string])[] },
  lang: "pt" | "en",
): string {
  if (log10S < 0) return t.instant;
  if (log10S >= LOG_UNIVERSE_S) return t.universe;
  const s = 10 ** log10S;
  const steps = [1, 60, 3600, 86400, 2.63e6, YEAR_S, 1e3 * YEAR_S, 1e6 * YEAR_S, 1e9 * YEAR_S];
  let i = steps.length - 1;
  while (i > 0 && s < steps[i]) i--;
  const n = s / steps[i];
  const rounded = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  if (rounded === 1) return t.units[i][0];
  return t.units[i][1].replace("{n}", rounded.toLocaleString(lang === "pt" ? "pt-BR" : "en-US"));
}

/** 3.2 × 10^21 style, for numbers too big to write out. */
export function formatPower(log10N: number, lang: "pt" | "en"): { mantissa: string; exponent: number } | { plain: string } {
  const locale = lang === "pt" ? "pt-BR" : "en-US";
  if (log10N < 9) return { plain: Math.round(10 ** log10N).toLocaleString(locale) };
  const exponent = Math.floor(log10N);
  const mantissa = (10 ** (log10N - exponent)).toLocaleString(locale, { maximumFractionDigits: 1 });
  return { mantissa, exponent };
}

/* ---------------------------------------------------------------- generator */

/** Uniform integer in [0, max) from the system's cryptographic generator (rejection sampling, no bias). */
export function secureInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
}

const SETS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  digit: "23456789",
  symbol: "!#$%&*+-=?@^_~",
};
/** The random alphabet (look-alikes like l/1/O/0 left out). */
export const RANDOM_ALPHABET = SETS.lower + SETS.upper + SETS.digit + SETS.symbol;

export function randomPassword(length: number): string {
  return Array.from({ length }, () => RANDOM_ALPHABET[secureInt(RANDOM_ALPHABET.length)]).join("");
}

export function passphrase(words: readonly string[], count: number): string {
  return Array.from({ length: count }, () => words[secureInt(words.length)]).join("-");
}
