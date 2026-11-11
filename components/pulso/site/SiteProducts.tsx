"use client";

import { useRef, useState } from "react";
import { brl, PULSO_PRODUCTS, type PulsoCategory, type PulsoProduct } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { Eyebrow, Photo, StockTag, useCart, useCompare, useInterest, useUi } from "./bits";
import { addToCart, COMPARE_MAX, forYou, noteInterest, productsInCart, scrollToSection, short, toggleCompare } from "./store";
import { useFlip } from "./useFlip";

const TABS: { id: "todos" | PulsoCategory; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "fones", label: "Fones" },
  { id: "caixas", label: "Caixas" },
  { id: "acessórios", label: "Acessórios" },
];

const SORTS = {
  destaque: { label: "Destaques", fn: () => 0 },
  "preco-asc": { label: "Menor preço", fn: (a: PulsoProduct, b: PulsoProduct) => a.price - b.price },
  "preco-desc": { label: "Maior preço", fn: (a: PulsoProduct, b: PulsoProduct) => b.price - a.price },
  bateria: { label: "Mais bateria", fn: (a: PulsoProduct, b: PulsoProduct) => (b.specs.bateriaH ?? -1) - (a.specs.bateriaH ?? -1) },
  peso: { label: "Mais leve", fn: (a: PulsoProduct, b: PulsoProduct) => a.specs.pesoG - b.specs.pesoG },
} as const;
type SortId = keyof typeof SORTS;

/** The catalogue: category tabs, sort, stock state, quick add, compare ticks and the "Para você" strip. */
export function SiteProducts() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("todos");
  const [sort, setSort] = useState<SortId>("destaque");
  const list = PULSO_PRODUCTS.filter((p) => tab === "todos" || p.category === tab).sort(SORTS[sort].fn);
  const gridRef = useFlip<HTMLUListElement>(list.map((p) => p.id).join(","));

  return (
    <section id="produtos" aria-labelledby="produtos-title" className="relative scroll-mt-[calc(var(--demo-bar-h,0px)+56px)] border-t border-pu-line bg-pu-bg-2 px-[var(--pad)] py-[clamp(72px,9vw,128px)]">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div>
            <Eyebrow n="03">Produtos</Eyebrow>
            <h2 id="produtos-title" className="mt-5 font-pulso text-[clamp(32px,4.4vw,60px)] leading-[0.98] font-semibold tracking-[-0.05em] text-pu-ink">
              Oito peças, um sistema.
            </h2>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto">
            <div role="tablist" aria-label="Categorias" className="flex rounded-full border border-pu-line bg-pu-bg p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className="rounded-full px-3.5 py-2 text-[12.5px] leading-none font-medium text-pu-mute transition-[background-color,color,box-shadow] aria-selected:bg-white aria-selected:text-pu-ink aria-selected:shadow-[0_2px_10px_-4px_rgb(12_13_18/0.25)] max-sm:px-3"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="relative flex items-center gap-2 text-[12.5px] text-pu-mute">
              <span className="max-sm:sr-only">Ordenar</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortId)}
                className="h-9 appearance-none rounded-full border border-pu-line bg-white py-0 pr-8 pl-3.5 text-[12.5px] font-medium text-pu-ink"
              >
                {(Object.keys(SORTS) as SortId[]).map((id) => (
                  <option key={id} value={id}>
                    {SORTS[id].label}
                  </option>
                ))}
              </select>
              <span aria-hidden className="pointer-events-none absolute right-3 text-[10px] text-pu-mute">
                ▾
              </span>
            </label>
          </div>
        </div>

        <ul ref={gridRef} className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </ul>

        <ForYou />
      </div>
    </section>
  );
}

function ProductCard({ product: p, priority }: { product: PulsoProduct; priority: boolean }) {
  const compare = useCompare();
  const { colorId } = useUi();
  const [flash, setFlash] = useState(0);
  const hover = useRef(0);
  const ticked = compare.includes(p.id);
  const full = !ticked && compare.length >= COMPARE_MAX;

  const look = () => {
    window.clearTimeout(hover.current);
    hover.current = window.setTimeout(() => noteInterest(p.id, "view"), 700);
  };
  const leave = () => window.clearTimeout(hover.current);

  const add = () => {
    const n = addToCart(p.id, 1, p.id === "one" ? colorId : undefined);
    setFlash(n > 0 ? 1 : -1);
    window.setTimeout(() => setFlash(0), 1600);
  };

  return (
    <li id={`p-${p.id}`} data-flip={p.id} className="group scroll-mt-[calc(var(--demo-bar-h,0px)+88px)]" onPointerEnter={look} onPointerLeave={leave} onFocus={look} onBlur={leave}>
      <div className="relative">
        <Photo
          product={p}
          sizes="(min-width: 1024px) 25vw, 50vw"
          priority={priority}
          className="aspect-square rounded-[18px] transition-transform duration-700 ease-soft [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-soft group-hover:[&_img]:scale-[1.04]"
        />
        <button
          type="button"
          onClick={add}
          aria-label={`Adicionar ${p.name} ao carrinho`}
          className={cn(
            "absolute right-2.5 bottom-2.5 flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium shadow-[0_10px_24px_-10px_rgb(12_13_18/0.5)] backdrop-blur-xl transition-[background-color,color,translate,opacity] duration-300",
            flash === 1 ? "bg-pu-acc text-white" : "bg-white/90 text-pu-ink hover:bg-pu-ink hover:text-white",
            "lg:translate-y-1 lg:opacity-0 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100",
          )}
        >
          <span aria-hidden>{flash === 1 ? "✓" : "+"}</span>
          <span className="max-sm:hidden">{flash === 1 ? "No carrinho" : flash === -1 ? "Sem estoque" : "Adicionar"}</span>
        </button>
        <label
          className={cn(
            "absolute top-2.5 left-2.5 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/85 py-1.5 pr-2.5 pl-1.5 text-[11px] leading-none font-medium text-pu-ink backdrop-blur-xl transition-opacity has-[:checked]:bg-pu-ink has-[:checked]:text-white",
            full && "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="checkbox"
            checked={ticked}
            disabled={full}
            onChange={() => {
              toggleCompare(p.id);
              if (!ticked) noteInterest(p.id, "compare");
            }}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="grid h-4 w-4 place-items-center rounded-[5px] border border-pu-ink/25 bg-white text-[10px] text-pu-ink peer-checked:border-transparent peer-focus-visible:outline-2 peer-focus-visible:outline-pu-acc"
          >
            {ticked ? "✓" : ""}
          </span>
          Comparar
        </label>
      </div>
      <div className="mt-3.5 px-0.5">
        <p className="font-mono text-[9.5px] leading-none tracking-[0.16em] text-pu-mute uppercase">{p.category}</p>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <h3 className="font-pulso text-[17px] leading-tight font-semibold tracking-[-0.03em] text-pu-ink sm:text-[19px]">{p.name}</h3>
          <p className="shrink-0 text-[14px] font-medium text-pu-ink tabular-nums sm:text-[15px]">{brl(p.price)}</p>
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-pu-mute sm:text-[13px]">{p.short}</p>
        <StockTag product={p} className="mt-2.5" />
      </div>
    </li>
  );
}

function ForYou() {
  const interest = useInterest();
  const cart = useCart();
  const ranked = forYou(interest, productsInCart(cart));
  const top = ranked?.slice(0, 4) ?? [];
  const ref = useFlip<HTMLOListElement>(top.map((r) => r.product.id).join(","));

  return (
    <div className="mt-16 rounded-[22px] border border-pu-line bg-pu-bg p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-pulso text-[19px] font-semibold tracking-[-0.03em] text-pu-ink">Para você</p>
        <p className="font-mono text-[10.5px] tracking-[0.08em] text-pu-mute">com base nesta visita · fica só na memória desta aba</p>
      </div>
      {!top.length ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-pu-mute">
          Ainda não sabemos nada desta visita. Olhe um produto, faça uma busca ou adicione algo ao carrinho — esta faixa se reordena sozinha.
        </p>
      ) : (
        <ol ref={ref} className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {top.map((r, i) => (
            <li key={r.product.id} data-flip={r.product.id} className="relative flex items-center gap-3 rounded-[16px] bg-white p-2">
              <Photo product={r.product} sizes="56px" className="h-14 w-14 shrink-0 rounded-[10px]" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-pu-ink">
                  <span className="font-mono text-[10px] text-pu-acc">{i + 1}</span>
                  <a
                    href={`#p-${r.product.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(`p-${r.product.id}`);
                    }}
                    className="truncate after:absolute after:inset-0"
                  >
                    {short(r.product)}
                  </a>
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-pu-mute">{r.why}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
