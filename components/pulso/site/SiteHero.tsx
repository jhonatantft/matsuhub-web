"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { brl, PULSO, PULSO_ONE_COLORS, pulsoById } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { Eyebrow, IRIS, StockTag, useUi } from "./bits";
import { addToCart, noteInterest, setOneColor } from "./store";

// The 3D stage belongs to another agent (components/pulso/product3d). WebGL → client only.
const ProductStage = dynamic(() => import("@/components/pulso/product3d/ProductStage").then((m) => m.ProductStage), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const ONE = pulsoById("one")!;

type StageDetail = { explode?: number; part?: string | null; working?: boolean };

/** Hero: the Pulso One on the 3D stage, with the buy panel beside it. */
export function SiteHero() {
  const { colorId } = useUi();
  const [exploded, setExploded] = useState(false);
  const [added, setAdded] = useState(0);
  const timer = useRef(0);

  useEffect(() => {
    const on = (event: Event) => {
      const d = (event as CustomEvent<StageDetail>).detail;
      if (!d || typeof d !== "object") return;
      if (typeof d.explode === "number") setExploded(d.explode > 0.5);
    };
    window.addEventListener("pulso:stage", on);
    return () => {
      window.removeEventListener("pulso:stage", on);
      window.clearTimeout(timer.current);
    };
  }, []);

  const color = PULSO_ONE_COLORS.find((c) => c.id === colorId) ?? PULSO_ONE_COLORS[0];

  const toggleExplode = () => {
    const next = !exploded;
    setExploded(next);
    window.dispatchEvent(new CustomEvent("pulso:explode", { detail: { value: next ? 1 : 0 } }));
  };

  const add = () => {
    const n = addToCart("one", 1, colorId);
    window.clearTimeout(timer.current);
    setAdded(n > 0 ? 1 : -1);
    timer.current = window.setTimeout(() => setAdded(0), 2200);
  };

  const specs = [
    ["Bateria", `${ONE.specs.bateriaH} h`],
    ["Peso", `${ONE.specs.pesoG} g`],
    ["Ruído", "ANC adaptativo"],
    ["Microfones", String(ONE.specs.microfones)],
    ["Bluetooth", ONE.specs.bluetooth ?? "—"],
    ["Água", ONE.specs.agua ?? "—"],
  ];

  return (
    <section id="one" aria-labelledby="one-title" className="relative scroll-mt-[calc(var(--demo-bar-h,0px)+56px)] overflow-hidden pt-[calc(var(--demo-bar-h,0px)+56px)]">
      {/* lab backdrop: hairline grid fading out, one soft iridescent bloom behind the product */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:linear-gradient(rgb(12_13_18/0.05)_1px,transparent_1px)_0_0/100%_64px,linear-gradient(90deg,rgb(12_13_18/0.05)_1px,transparent_1px)_0_0/64px_100%] [mask-image:radial-gradient(ellipse_70%_60%_at_35%_45%,#000,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[18%] left-[8%] h-[52vmin] w-[52vmin] rounded-full opacity-50 blur-[90px] transition-colors duration-700"
        style={{ background: `radial-gradient(circle, ${color.ring}55, transparent 65%)` }}
      />

      <div className="relative mx-auto grid max-w-[1440px] gap-6 px-[var(--pad)] pb-16 lg:min-h-[calc(100svh-var(--demo-bar-h,0px)-56px)] lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-10">
        <div className="relative h-[min(64svh,520px)] lg:col-span-7 lg:h-[min(calc(100svh-var(--demo-bar-h,0px)-108px),780px)]">
          <ProductStage className="absolute inset-0" colorId={colorId} />
        </div>

        <div className="relative lg:col-span-5 lg:max-w-[480px]">
          <Eyebrow n="01">Pulso One · {ONE.sku}</Eyebrow>
          <h1 id="one-title" className="mt-5 font-pulso text-[clamp(44px,6.4vw,92px)] leading-[0.92] font-semibold tracking-[-0.055em] text-pu-ink">
            Pulso One
          </h1>
          <p className="mt-4 font-pulso text-[clamp(18px,1.7vw,23px)] leading-snug font-light tracking-[-0.02em] text-pu-ink">
            {PULSO.tagline}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-pu-mute">{ONE.text}</p>

          <div className="mt-7 flex items-end justify-between gap-4 border-t border-pu-line pt-5">
            <div>
              <p className="font-pulso text-[34px] leading-none font-medium tracking-[-0.04em] text-pu-ink lining-nums">{brl(ONE.price)}</p>
              <p className="mt-2 text-[12px] text-pu-mute">Frete grátis · sai em até {ONE.shipDays} dias úteis</p>
            </div>
            <StockTag product={ONE} />
          </div>

          <fieldset className="mt-6">
            <legend className="flex w-full items-baseline justify-between text-[12.5px] text-pu-mute">
              <span>
                Cor: <b className="font-medium text-pu-ink">{color.name}</b>
              </span>
            </legend>
            <div className="mt-3 flex gap-3">
              {PULSO_ONE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === colorId}
                  aria-label={c.name}
                  onClick={() => {
                    setOneColor(c.id);
                    noteInterest("one", "view", 0.5);
                  }}
                  className="group relative grid h-11 w-11 place-items-center rounded-full border border-pu-line bg-white transition-[border-color,box-shadow] aria-pressed:border-pu-ink aria-pressed:shadow-[0_0_0_3px_rgb(91_75_255/0.14)] hover:border-pu-ink/40"
                >
                  <span className="relative h-7 w-7 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" style={{ background: c.body }}>
                    <i aria-hidden className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: c.cushion }} />
                    <i aria-hidden className="absolute top-1/2 left-1/2 h-3 w-3 -translate-1/2 rounded-full border-2" style={{ borderColor: c.ring }} />
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-snug text-pu-mute/80">As três cores são mostradas no modelo 3D; a foto de estúdio é da Grafite.</p>
          </fieldset>

          <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-pu-line bg-pu-line">
            {specs.map(([k, v]) => (
              <div key={k} className="bg-white/80 px-3 py-3 backdrop-blur">
                <dt className="font-mono text-[9.5px] leading-none tracking-[0.14em] text-pu-mute uppercase">{k}</dt>
                <dd className="mt-2 text-[14px] leading-none font-medium text-pu-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex gap-2.5">
            <button
              type="button"
              onClick={add}
              className="group relative flex h-[52px] flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-pu-ink text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
            >
              <span aria-hidden className={cn("absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100", IRIS)} />
              <span className="relative" aria-live="polite">
                {added === 1 ? `Adicionado · ${color.name} ✓` : added === -1 ? "Limite do estoque" : "Adicionar ao carrinho"}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleExplode}
              aria-pressed={exploded}
              className="h-[52px] rounded-full border border-pu-ink/15 bg-white/60 px-5 text-[14px] font-medium text-pu-ink backdrop-blur transition-colors hover:border-pu-ink/40 aria-pressed:border-pu-acc aria-pressed:text-pu-acc"
            >
              {exploded ? "Montar" : "Desmontar"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
