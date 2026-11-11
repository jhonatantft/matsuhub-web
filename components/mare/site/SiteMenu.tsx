"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { brl, MARE_DISHES, type MareAllergen, type MareDish } from "@/content/mare";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { lenisRef } from "@/lib/scroll";
import { addToComanda, ALLERGENS, COURSE_LABEL, onSite, scrollToSection, SECTION } from "./bus";
import { DISH_SPOTS } from "./dish-spots";
import { DishPhoto } from "./DishPhoto";
import { SiteComanda, useComanda } from "./SiteComanda";
import { SiteHeading, SiteSection } from "./SiteSection";

type Filter = "tudo" | MareDish["course"] | "sem glúten";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "entrada", label: "Entradas" },
  { id: "principal", label: "Principais" },
  { id: "sobremesa", label: "Sobremesa" },
  { id: "sem glúten", label: "Sem glúten" },
];

const matches = (dish: MareDish, filter: Filter) =>
  filter === "tudo" ? true : filter === "sem glúten" ? dish.tags.includes("sem glúten") : dish.course === filter;

const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * "Cardápio vivo": filter chips, "Evitar" allergen toggles (dims dishes that contain them),
 * cards whose plate lifts and shows its ingredients on hover/focus, a detail view that zooms
 * out of the card, and the comanda.
 */
export function SiteMenu() {
  const [filter, setFilter] = useState<Filter>("tudo");
  const [avoid, setAvoid] = useState<MareAllergen[]>([]);
  const [open, setOpen] = useState<{ id: string; from: DOMRect | null } | null>(null);

  useEffect(() => onSite("avoid", (list) => setAvoid(list)), []);

  const shown = MARE_DISHES.filter((d) => matches(d, filter));
  const toggle = (a: MareAllergen) => setAvoid((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));
  const blocked = (d: MareDish) => d.allergens.filter((a) => avoid.includes(a));
  const safeCount = shown.filter((d) => blocked(d).length === 0).length;

  const openDish = (id: string, card: HTMLElement) => {
    const photo = card.querySelector<HTMLElement>("[data-photo]");
    setOpen({ id, from: photo?.getBoundingClientRect() ?? null });
  };

  const dish = open ? MARE_DISHES.find((d) => d.id === open.id) : undefined;

  return (
    <SiteSection id={SECTION.menu} className="bg-ma-bg">
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
        <SiteHeading
          eyebrow="Cardápio vivo"
          title={
            <>
              O mar do dia, <em>passado na brasa.</em>
            </>
          }
          lead="Passe o cursor sobre um prato para ver o que vai nele. Abra para ver os detalhes, as alergias e a harmonização."
        />
        <div className="grid gap-4 max-lg:w-full lg:justify-items-end">
          <div role="group" aria-label="Filtrar pratos" className="flex flex-wrap gap-2 max-sm:-mx-[var(--pad)] max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-[var(--pad)] max-sm:[scrollbar-width:none]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className="shrink-0 rounded-full border border-ma-line px-4 py-2.5 text-[12.5px] leading-none text-ma-mute transition-colors hover:border-ma-ember/60 hover:text-ma-ink aria-pressed:border-ma-ember aria-pressed:bg-ma-ember aria-pressed:text-ma-bg"
              >
                {f.label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Evitar alergênicos" className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
            <span className="mr-1.5 text-[10.5px] font-semibold tracking-[0.24em] text-ma-mute uppercase">Evitar:</span>
            {ALLERGENS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={avoid.includes(a)}
                onClick={() => toggle(a)}
                className="group flex items-center gap-1.5 rounded-full border border-dashed border-ma-line px-3 py-1.5 text-[12px] leading-none text-ma-mute transition-colors hover:text-ma-ink aria-pressed:border-solid aria-pressed:border-[#e58a7a]/70 aria-pressed:text-[#f3b4a6]"
              >
                <span aria-hidden className="hidden text-[10px] group-aria-pressed:inline">
                  ✕
                </span>
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="mt-8 text-[12px] text-ma-mute">
        {shown.length} {shown.length === 1 ? "prato" : "pratos"}
        {avoid.length > 0 && ` · ${safeCount} sem ${listJoin(avoid)}`}
      </p>

      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2">
          {shown.map((d, i) => {
            const hit = blocked(d);
            return (
              <li key={d.id} className="transition-opacity duration-500 starting:opacity-0" style={{ transitionDelay: `${i * 50}ms` }}>
                <button
                  type="button"
                  data-dish-card={d.id}
                  onClick={(event) => openDish(d.id, event.currentTarget)}
                  aria-label={`${d.name}, ${brl(d.price)}${hit.length ? `, contém ${listJoin(hit)}` : ""}. Ver detalhes`}
                  className={cn(
                    "group/dish block w-full text-left outline-none transition-[opacity,filter] duration-500",
                    hit.length > 0 && "opacity-35 grayscale-[0.85] hover:opacity-70",
                  )}
                >
                  <span className="relative block">
                    <span
                      aria-hidden
                      className="absolute inset-x-[12%] bottom-0 h-8 rounded-[50%] bg-black/70 blur-xl transition-[opacity,scale] duration-700 ease-soft group-hover/dish:scale-x-110 group-hover/dish:opacity-100 opacity-50"
                    />
                    <span
                      data-photo
                      className="relative block overflow-hidden rounded-[22px] ring-1 ring-ma-line transition-[translate,scale,box-shadow] duration-700 ease-soft group-hover/dish:-translate-y-2 group-hover/dish:scale-[1.015] group-hover/dish:shadow-[0_30px_60px_-24px_rgb(0_0_0/0.9),0_0_0_1px_rgb(240_138_75/0.35)] group-focus-visible/dish:-translate-y-2 group-focus-visible/dish:ring-2 group-focus-visible/dish:ring-ma-ember"
                    >
                      <DishPhoto dish={d} spots="hover" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw" />
                    </span>
                    {hit.length > 0 && (
                      <span className="absolute top-3 left-3 rounded-full bg-ma-bg/85 px-3 py-1.5 text-[11px] leading-none text-[#f3b4a6] backdrop-blur">
                        contém {listJoin(hit)}
                      </span>
                    )}
                  </span>
                  <span className="mt-5 flex items-baseline justify-between gap-4">
                    <span className="text-[10px] font-semibold tracking-[0.26em] text-ma-ember uppercase">
                      {COURSE_LABEL[d.course]}
                      <span className="text-ma-mute"> · {d.tags.join(" · ")}</span>
                    </span>
                    <span className="font-mare text-[22px] leading-none lining-nums tabular-nums">{brl(d.price)}</span>
                  </span>
                  <span className="mt-2 block font-mare text-[30px] leading-[1.05] font-light transition-colors group-hover/dish:text-ma-ember">
                    {d.name}
                  </span>
                  <span className="mt-2 block text-[14px] leading-relaxed text-ma-mute">{d.text}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div id="comanda" className="scroll-mt-[calc(var(--demo-bar-h,0px)+68px)] lg:sticky lg:top-[calc(var(--demo-bar-h,0px)+80px)] lg:self-start">
          <SiteComanda />
        </div>
      </div>

      {dish && open && (
        <DishDetail
          key={dish.id}
          dish={dish}
          from={open.from}
          avoid={avoid}
          onClose={() => {
            const card = document.querySelector<HTMLElement>(`[data-dish-card="${dish.id}"]`);
            setOpen(null);
            card?.focus({ preventScroll: true });
          }}
        />
      )}
    </SiteSection>
  );
}

function listJoin(list: string[]) {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
}

/** The dish, full size: the photo flies out of its card (FLIP with the Web Animations API). */
function DishDetail({
  dish,
  from,
  avoid,
  onClose,
}: {
  dish: MareDish;
  from: DOMRect | null;
  avoid: MareAllergen[];
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const { lines } = useComanda();
  const inOrder = lines.find((l) => l.dish.id === dish.id)?.qty ?? 0;
  const [added, setAdded] = useState(false);

  const flip = (rect: DOMRect) => {
    const el = photoRef.current;
    if (!el) return null;
    const to = el.getBoundingClientRect();
    return `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(${rect.width / to.width})`;
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    const photo = photoRef.current;
    if (!root || !photo) return;
    const still = reducedMotion();
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: still ? 1 : 380, easing: "ease-out" });
    const start = from && !still ? flip(from) : null;
    if (start) photo.animate([{ transform: start }, { transform: "none" }], { duration: 720, easing: EASE });
    closeRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per opened dish
  }, []);

  // lock the page behind the dialog
  useEffect(() => {
    const lenis = lenisRef.current;
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
      lenis?.start();
    };
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const root = rootRef.current;
    const photo = photoRef.current;
    if (!root || !photo || reducedMotion()) return onClose();
    const card = document.querySelector<HTMLElement>(`[data-dish-card="${dish.id}"] [data-photo]`);
    const r = card?.getBoundingClientRect();
    const onScreen = r && r.bottom > 0 && r.top < window.innerHeight;
    const end = onScreen ? flip(r) : null;
    if (end) photo.animate([{ transform: "none" }, { transform: end }], { duration: 480, easing: EASE, fill: "forwards" });
    root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: "ease-in", fill: "forwards" }).onfinish = onClose;
  };

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "Tab") {
        const root = rootRef.current;
        if (!root) return;
        const items = root.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const hit = dish.allergens.filter((a) => avoid.includes(a));
  const spots = DISH_SPOTS[dish.id] ?? [];

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mare-dish-title"
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-ma-bg/90 backdrop-blur-xl"
      data-lenis-prevent
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="mx-auto grid min-h-full max-w-[1240px] items-center gap-8 px-[var(--pad)] pt-[72px] pb-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:py-16"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div ref={photoRef} className="relative origin-top-left overflow-hidden rounded-[26px] ring-1 ring-ma-line shadow-[0_40px_120px_-30px_rgb(0_0_0/0.95)] lg:max-h-[min(78vh,640px)] lg:max-w-[min(78vh,640px)]">
          <DishPhoto dish={dish} spots="always" priority sizes="(min-width: 1024px) 640px, 92vw" />
        </div>

        <div className="transition-[opacity,translate] delay-200 duration-700 ease-soft starting:translate-y-3 starting:opacity-0">
          <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ma-ember uppercase">{COURSE_LABEL[dish.course]}</p>
          <h3 id="mare-dish-title" className="mt-3 font-mare text-[clamp(40px,4.6vw,64px)] leading-[0.98] font-light">
            {dish.name}
          </h3>
          <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ma-ink/85">{dish.text}</p>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Características">
            {dish.tags.map((t) => (
              <li key={t} className="rounded-full border border-ma-line px-3 py-1.5 text-[12px] leading-none text-ma-mute">
                {t}
              </li>
            ))}
          </ul>

          <dl className="mt-7 grid gap-4 border-t border-ma-line pt-6 text-[14px] sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold tracking-[0.24em] text-ma-mute uppercase">Alergênicos</dt>
              <dd className={cn("mt-1.5", hit.length ? "text-[#f3b4a6]" : "text-ma-ink")}>
                {dish.allergens.length ? listJoin(dish.allergens) : "nenhum dos principais"}
                {hit.length > 0 && " · você marcou para evitar"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold tracking-[0.24em] text-ma-mute uppercase">Harmoniza com</dt>
              <dd className="mt-1.5 font-mare text-[20px] leading-tight italic">{dish.pairing}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-semibold tracking-[0.24em] text-ma-mute uppercase">No prato</dt>
              <dd className="mt-1.5 text-ma-ink/85">{spots.map((s) => s.label.toLowerCase()).join(" · ")}</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <button
              type="button"
              onClick={() => {
                addToComanda(dish.id);
                setAdded(true);
              }}
              className="group flex items-center gap-4 rounded-full bg-ma-ember px-7 py-4.5 text-[10.5px] leading-none font-bold tracking-[0.22em] text-ma-bg uppercase transition-colors hover:bg-ma-ink"
            >
              Adicionar à comanda
              <span className="font-mare text-[17px] font-medium tracking-normal normal-case lining-nums tabular-nums">{brl(dish.price)}</span>
            </button>
            <p role="status" className="text-[13px] text-ma-mute">
              {inOrder > 0 && (
                <>
                  {added ? "Adicionado. " : ""}Na comanda: <span className="text-ma-ink lining-nums tabular-nums">{inOrder}</span>
                  <span className="lg:hidden">
                    {" · "}
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        window.setTimeout(() => scrollToSection("comanda"), 520);
                      }}
                      className="underline underline-offset-2 hover:text-ma-ink"
                    >
                      ver comanda
                    </button>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <button
        ref={closeRef}
        type="button"
        onClick={close}
        aria-label="Fechar prato"
        className="fixed top-4 right-4 grid h-11 w-11 place-items-center rounded-full border border-ma-line bg-ma-bg/80 text-[15px] backdrop-blur transition-colors hover:border-ma-ember hover:text-ma-ember sm:top-6 sm:right-6"
      >
        <span aria-hidden>✕</span>
      </button>
    </div>
  );
}
