import { brl, pulsoById, type PulsoProduct, type PulsoUse } from "@/content/pulso";
import { USE_LABEL } from "./intent";
import { short } from "./store";

/** Spec rows for the comparison table and the per-use verdicts, computed from content/pulso.ts. */

type Row = {
  label: string;
  value: (p: PulsoProduct) => number | undefined;
  show: (p: PulsoProduct) => string;
  /** "max" / "min" = which value is better; undefined = no highlight. */
  better?: "max" | "min";
};

const water = (p: PulsoProduct) => (p.specs.agua ? Number(p.specs.agua.slice(-1)) || 0 : undefined);

export const ROWS: Row[] = [
  { label: "Preço", value: (p) => p.price, show: (p) => brl(p.price), better: "min" },
  { label: "Bateria", value: (p) => p.specs.bateriaH, show: (p) => (p.specs.bateriaH ? `${p.specs.bateriaH} h` : "—"), better: "max" },
  { label: "Peso", value: (p) => p.specs.pesoG, show: (p) => `${p.specs.pesoG} g`, better: "min" },
  {
    label: "Cancelamento de ruído",
    value: (p) => (p.category === "acessórios" ? undefined : Number(p.specs.anc)),
    show: (p) => (p.category === "acessórios" ? "—" : p.specs.anc ? "Sim" : "Não"),
    better: "max",
  },
  { label: "Resistência à água", value: water, show: (p) => p.specs.agua ?? "—", better: "max" },
  { label: "Latência", value: (p) => p.specs.latenciaMs, show: (p) => (p.specs.latenciaMs ? `${p.specs.latenciaMs} ms` : "—"), better: "min" },
  { label: "Microfones", value: (p) => p.specs.microfones, show: (p) => (p.specs.microfones ? String(p.specs.microfones) : "—"), better: "max" },
  { label: "Bluetooth", value: () => undefined, show: (p) => p.specs.bluetooth ?? "—" },
  { label: "Envio", value: (p) => p.shipDays, show: (p) => `${p.shipDays} dias úteis`, better: "min" },
  { label: "Estoque", value: () => undefined, show: (p) => `${p.stock} un.` },
];

/** Index set of the winning columns of a row (empty when all equal or not comparable). */
export function winners(row: Row, list: PulsoProduct[]): Set<number> {
  if (!row.better) return new Set();
  const vals = list.map(row.value);
  const present = vals.filter((v): v is number => v !== undefined);
  if (present.length < 2 && present.length !== list.length) {
    // only one product has the spec at all: it wins only for "max" rows (having it is better)
    if (row.better === "max" && present.length === 1) return new Set([vals.findIndex((v) => v !== undefined)]);
    return new Set();
  }
  const best = row.better === "max" ? Math.max(...present) : Math.min(...present);
  if (present.every((v) => v === best) && present.length === list.length) return new Set();
  return new Set(vals.flatMap((v, i) => (v === best ? [i] : [])));
}

type Criterion = { reason: (p: PulsoProduct) => string; value: (p: PulsoProduct) => number | undefined; better: "max" | "min" };

const C = {
  weight: { reason: () => "pelo peso", value: (p) => p.specs.pesoG, better: "min" },
  water: { reason: (p) => `pelo ${p.specs.agua}`, value: water, better: "max" },
  battery: { reason: (p) => `pelas ${p.specs.bateriaH} h de bateria`, value: (p) => p.specs.bateriaH, better: "max" },
  anc: { reason: () => "pelo cancelamento de ruído", value: (p) => Number(p.specs.anc), better: "max" },
  mics: { reason: (p) => `pelos ${p.specs.microfones} microfones`, value: (p) => p.specs.microfones, better: "max" },
  latency: { reason: (p) => `pelos ${p.specs.latenciaMs} ms de latência`, value: (p) => p.specs.latenciaMs, better: "min" },
} satisfies Record<string, Criterion>;

const BY_USE: Record<PulsoUse, Criterion[]> = {
  corrida: [C.weight, C.water],
  academia: [C.water, C.weight],
  trabalho: [C.mics, C.anc, C.battery],
  viagem: [C.anc, C.battery, C.weight],
  casa: [C.battery, C.mics],
  games: [C.latency],
};

const USE_ORDER: PulsoUse[] = ["corrida", "academia", "trabalho", "viagem", "casa", "games"];

/** "Para corrida: Run, pelo peso e IP67" — one line per use any of the products is made for. */
export function verdicts(list: PulsoProduct[]) {
  const uses = USE_ORDER.filter((u) => list.some((p) => p.uses.includes(u)));
  return uses.map((use) => {
    const crit = BY_USE[use];
    const scores = list.map((p) => {
      let s = p.uses.includes(use) ? 3 : 0;
      for (const c of crit) {
        const vals = list.map(c.value).filter((v): v is number => v !== undefined);
        const v = c.value(p);
        if (v === undefined || vals.length < 2) continue;
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        if (hi === lo) continue;
        s += c.better === "max" ? (v - lo) / (hi - lo) : (hi - v) / (hi - lo);
      }
      return s;
    });
    const top = scores.indexOf(Math.max(...scores));
    const winner = list[top];
    // reasons are argued against the real rivals: the others made for the same use, if any
    const others = list.filter((_, i) => i !== top);
    const rivals = others.some((p) => p.uses.includes(use)) ? others.filter((p) => p.uses.includes(use)) : others;
    const reasons = crit
      .filter((c) => {
        const v = c.value(winner);
        if (v === undefined || (c === C.anc && !v)) return false;
        return rivals.every((p) => {
          const o = c.value(p);
          return o === undefined || (c.better === "max" ? v > o : v < o);
        });
      })
      .slice(0, 2)
      .map((c) => c.reason(winner));
    const why = reasons.length ? reasons.join(" e ") : `por ser feito para ${USE_LABEL[use]}`;
    return { use, winner, text: `${short(winner)}, ${why}` };
  });
}

export const compareList = (ids: readonly string[]) => ids.map((id) => pulsoById(id)).filter((p): p is PulsoProduct => !!p);
