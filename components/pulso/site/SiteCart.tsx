"use client";

import { useEffect, useRef, useState } from "react";
import { brl, PULSO, PULSO_ONE_COLORS, pulsoById } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { lenisRef } from "@/lib/scroll";
import { IRIS, Photo, useCart, useUi } from "./bits";
import { addToCart, cartSummary, clearCart, orderIdFor, removeLine, setCartOpen } from "./store";

type Step = "cart" | "entrega" | "revisao" | "pedido";
type Order = { id: string; total: number; count: number; name: string; cep: string; days: number };

const STEPS: { id: Step; label: string }[] = [
  { id: "entrega", label: "Entrega" },
  { id: "revisao", label: "Revisão" },
  { id: "pedido", label: "Pedido" },
];

const cepMask = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

const NOTE = "Demonstração: nenhum pagamento é processado e nada é enviado.";

/**
 * The cart drawer and the simulated three-step checkout. Also the page's door for other agents:
 * it listens to pulso:cart-add / pulso:cart-clear and announces external adds with a toast.
 */
export function SiteCart() {
  const { cart: open } = useUi();
  const items = useCart();
  const s = cartSummary(items);
  const [step, setStep] = useState<Step>("cart");
  const [name, setName] = useState("");
  const [cep, setCep] = useState("");
  const [tried, setTried] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<{ n: number; text: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const toastTimer = useRef(0);

  // contract: other agents (and the agent layer's demos) put things in the cart through window events
  useEffect(() => {
    const onAdd = (event: Event) => {
      const d = (event as CustomEvent).detail as { productId?: unknown; qty?: unknown; colorId?: unknown } | null;
      if (!d || typeof d.productId !== "string") return;
      const product = pulsoById(d.productId);
      if (!product) return;
      const qty = typeof d.qty === "number" && Number.isFinite(d.qty) ? Math.max(1, Math.min(10, Math.round(d.qty))) : 1;
      const colorId = typeof d.colorId === "string" && PULSO_ONE_COLORS.some((c) => c.id === d.colorId) ? d.colorId : undefined;
      const n = addToCart(product.id, qty, colorId);
      window.clearTimeout(toastTimer.current);
      setToast((t) => ({ n: (t?.n ?? 0) + 1, text: n > 0 ? `${n}× ${product.name} adicionado por evento externo` : `${product.name}: sem estoque para mais` }));
      toastTimer.current = window.setTimeout(() => setToast(null), 3600);
    };
    const onClear = () => clearCart();
    window.addEventListener("pulso:cart-add", onAdd);
    window.addEventListener("pulso:cart-clear", onClear);
    return () => {
      window.removeEventListener("pulso:cart-add", onAdd);
      window.removeEventListener("pulso:cart-clear", onClear);
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  // focus in, Escape out, focus back to whoever opened it
  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCartOpen(false);
      if (event.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, a[href]");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
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
    const html = document.documentElement;
    html.style.overflow = "hidden";
    lenisRef.current?.stop();
    return () => {
      window.removeEventListener("keydown", key);
      html.style.overflow = "";
      lenisRef.current?.start();
      back.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const close = () => {
    setCartOpen(false);
    if (step === "pedido") {
      setStep("cart");
      setOrder(null);
    }
  };

  const cepOk = /^\d{5}-\d{3}$/.test(cep);
  const nameOk = name.trim().length >= 2;

  const confirm = () => {
    const id = orderIdFor(items, cep);
    const placed: Order = { id, total: s.total, count: s.count, name: name.trim(), cep, days: s.shipDays };
    setOrder(placed);
    setStep("pedido");
    window.dispatchEvent(new CustomEvent("pulso:order", { detail: { orderId: id, total: s.total } }));
    clearCart();
  };

  const stepIndex = STEPS.findIndex((x) => x.id === step);
  const progress = Math.min(1, s.subtotal / PULSO.freeShippingFrom);

  return (
    <>
      <div
        aria-hidden
        data-open={open}
        onClick={close}
        className="fixed inset-0 z-[78] bg-pu-ink/25 backdrop-blur-[2px] transition-opacity duration-500 data-[open=false]:pointer-events-none data-[open=false]:opacity-0"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho"
        tabIndex={-1}
        data-open={open}
        inert={!open}
        className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[440px] flex-col bg-pu-bg text-pu-ink shadow-[-30px_0_90px_-30px_rgb(12_13_18/0.45)] outline-none transition-[translate,box-shadow] duration-500 ease-soft data-[open=false]:translate-x-full data-[open=false]:shadow-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-pu-line px-5 py-4">
          <div>
            <p className="font-pulso text-[20px] font-semibold tracking-[-0.03em]">{step === "cart" ? "Carrinho" : step === "pedido" ? "Pedido feito" : "Finalizar"}</p>
            <p className="mt-0.5 font-mono text-[10px] tracking-[0.12em] text-pu-mute uppercase">
              {step === "cart" ? `${s.count} ${s.count === 1 ? "item" : "itens"}` : "Checkout simulado"}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar carrinho"
            className="grid h-10 w-10 place-items-center rounded-full border border-pu-line text-[13px] transition-colors hover:border-pu-ink/40"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        {step !== "cart" && (
          <ol className="flex gap-1.5 px-5 pt-4" aria-label="Etapas">
            {STEPS.map((x, i) => (
              <li key={x.id} aria-current={x.id === step ? "step" : undefined} className="flex-1">
                <i aria-hidden className={cn("block h-[3px] rounded-full transition-colors duration-500", i <= stepIndex ? IRIS : "bg-pu-line")} />
                <span className={cn("mt-2 block font-mono text-[10px] tracking-[0.1em] uppercase", i <= stepIndex ? "text-pu-ink" : "text-pu-mute")}>
                  {i + 1}. {x.label}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5" data-lenis-prevent>
          {step === "cart" &&
            (s.count === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <p className="font-pulso text-[22px] font-semibold tracking-[-0.03em]">Carrinho vazio</p>
                  <p className="mt-2 text-[13.5px] text-pu-mute">Adicione pelo hero, pela vitrine, pela busca ou peça ao Eco.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-[16px] border border-pu-line bg-white px-4 py-3.5">
                  <p className="text-[12.5px] text-pu-ink">
                    {s.shipping === 0 ? (
                      <>
                        <b className="font-semibold">Frete grátis</b> garantido.
                      </>
                    ) : (
                      <>
                        Faltam <b className="font-semibold">{brl(s.toFree)}</b> para o frete grátis.
                      </>
                    )}
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-pu-line" role="progressbar" aria-valuemin={0} aria-valuemax={PULSO.freeShippingFrom} aria-valuenow={Math.min(s.subtotal, PULSO.freeShippingFrom)} aria-label="Progresso até o frete grátis">
                    <i className={cn("block h-full origin-left rounded-full transition-transform duration-700 ease-soft", IRIS)} style={{ transform: `scaleX(${progress})` }} />
                  </div>
                </div>
                <ul className="mt-4 grid gap-3">
                  {s.lines.map((l) => (
                    <li key={l.key} className="flex gap-3 rounded-[16px] bg-white p-2.5 transition-[opacity,translate] duration-500 ease-soft starting:translate-x-4 starting:opacity-0">
                      {l.color && l.color.id !== PULSO_ONE_COLORS[0].id ? (
                        // only the Grafite One has a studio photo: other colours get a drawn swatch, not a wrong photo
                        <span aria-hidden className="relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[12px] bg-[#e4e4ea]">
                          <span className="relative h-11 w-11 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" style={{ background: l.color.body }}>
                            <i className="absolute top-1/2 left-1/2 h-5 w-5 -translate-1/2 rounded-full border-[3px]" style={{ borderColor: l.color.ring }} />
                          </span>
                        </span>
                      ) : (
                        <Photo product={l.product} sizes="72px" className="h-[72px] w-[72px] shrink-0 rounded-[12px]" />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[14px] font-semibold">{l.product.name}</p>
                          <p className="shrink-0 text-[13.5px] tabular-nums">{brl(l.qty * l.product.price)}</p>
                        </div>
                        {l.color && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-pu-mute">
                            <i aria-hidden className="h-2.5 w-2.5 rounded-full border border-pu-line" style={{ background: l.color.body }} />
                            {l.color.name}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex items-center rounded-full border border-pu-line">
                            <button type="button" onClick={() => addToCart(l.productId, -1, l.colorId)} aria-label={`Menos um ${l.product.name}`} className="grid h-8 w-8 place-items-center text-[15px]">
                              −
                            </button>
                            <span className="w-6 text-center text-[13px] tabular-nums" aria-label={`Quantidade ${l.qty}`}>
                              {l.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => addToCart(l.productId, 1, l.colorId)}
                              aria-label={`Mais um ${l.product.name}`}
                              disabled={s.lines.filter((x) => x.productId === l.productId).reduce((n, x) => n + x.qty, 0) >= l.product.stock}
                              className="grid h-8 w-8 place-items-center text-[15px] disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                          <button type="button" onClick={() => removeLine(l.key)} className="text-[12px] text-pu-mute hover:text-pu-ink">
                            Remover
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ))}

          {step === "entrega" && (
            <form
              id="pulso-entrega"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                setTried(true);
                if (cepOk && nameOk) setStep("revisao");
              }}
              className="grid gap-4"
            >
              <p className="text-[13.5px] leading-relaxed text-pu-mute">Só o necessário para simular a entrega. Nada sai do seu navegador.</p>
              <label className="grid gap-1.5 text-[12.5px] font-medium">
                Nome
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="off"
                  maxLength={60}
                  aria-invalid={tried && !nameOk}
                  className="h-12 rounded-[12px] border border-pu-line bg-white px-3.5 text-[15px] font-normal outline-none focus:border-pu-acc aria-[invalid=true]:border-[#dc2626]"
                />
              </label>
              <label className="grid gap-1.5 text-[12.5px] font-medium">
                CEP
                <input
                  value={cep}
                  onChange={(event) => setCep(cepMask(event.target.value))}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="00000-000"
                  aria-invalid={tried && !cepOk}
                  aria-describedby="pulso-cep-hint"
                  className="h-12 rounded-[12px] border border-pu-line bg-white px-3.5 font-mono text-[15px] font-normal tracking-[0.04em] outline-none focus:border-pu-acc aria-[invalid=true]:border-[#dc2626]"
                />
                <span id="pulso-cep-hint" className={cn("text-[11.5px] font-normal", tried && !cepOk ? "text-[#dc2626]" : "text-pu-mute")}>
                  {tried && !cepOk ? "CEP precisa de 8 dígitos (00000-000)." : "Só conferimos o formato; nenhum endereço é consultado."}
                </span>
              </label>
              {tried && !nameOk && <p className="text-[11.5px] text-[#dc2626]">Escreva um nome.</p>}
            </form>
          )}

          {step === "revisao" && (
            <div className="grid gap-4">
              <ul className="grid gap-2 rounded-[16px] bg-white p-4">
                {s.lines.map((l) => (
                  <li key={l.key} className="flex justify-between gap-3 text-[13.5px]">
                    <span>
                      {l.qty}× {l.product.name}
                      {l.color ? ` · ${l.color.name}` : ""}
                    </span>
                    <span className="tabular-nums">{brl(l.qty * l.product.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-[16px] bg-white p-4 text-[13.5px]">
                <p className="font-mono text-[10px] tracking-[0.12em] text-pu-mute uppercase">Entrega</p>
                <p className="mt-1.5">
                  {name.trim()} · CEP {cep}
                </p>
                <p className="mt-0.5 text-pu-mute">Sai em até {s.shipDays} dias úteis (simulado).</p>
              </div>
              <p className="rounded-[14px] border border-dashed border-pu-line px-4 py-3 text-[12.5px] leading-relaxed text-pu-mute">
                Sem etapa de pagamento: nesta demonstração não existe cartão, Pix nem CPF.
              </p>
            </div>
          )}

          {step === "pedido" && order && (
            <div className="grid place-items-center pt-6 text-center">
              <span className={cn("grid h-16 w-16 place-items-center rounded-full text-[26px] text-white starting:scale-50", IRIS, "transition-transform duration-700 ease-soft")}>✓</span>
              <p className="mt-5 font-pulso text-[24px] font-semibold tracking-[-0.03em]">Pedido confirmado (simulado)</p>
              <p className="mt-2 font-mono text-[15px] tracking-[0.06em] text-pu-acc">{order.id}</p>
              <p className="mt-4 max-w-[300px] text-[13.5px] leading-relaxed text-pu-mute">
                {order.count} {order.count === 1 ? "item" : "itens"}, {brl(order.total)}, para {order.name} (CEP {order.cep}). Numa loja real, sairia em até {order.days} dias úteis.
              </p>
              <p className="mt-3 max-w-[300px] text-[11.5px] text-pu-mute/80">O número do pedido é derivado do carrinho e do CEP — não é aleatório nem foi registrado.</p>
            </div>
          )}
        </div>

        <div className="border-t border-pu-line px-5 pt-4 pb-5">
          {step !== "pedido" && s.count > 0 && (
            <dl className="mb-4 grid gap-1.5 text-[13.5px]">
              <div className="flex justify-between text-pu-mute">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{brl(s.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-pu-mute">
                <dt>Frete</dt>
                <dd className="tabular-nums">{s.shipping === 0 ? "grátis" : brl(s.shipping)}</dd>
              </div>
              <div className="flex justify-between text-[16px] font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{brl(s.total)}</dd>
              </div>
            </dl>
          )}
          <div className="flex gap-2">
            {(step === "entrega" || step === "revisao") && (
              <button
                type="button"
                onClick={() => setStep(step === "revisao" ? "entrega" : "cart")}
                className="h-12 rounded-full border border-pu-line px-5 text-[13.5px] font-medium transition-colors hover:border-pu-ink/40"
              >
                Voltar
              </button>
            )}
            {step === "cart" && (
              <button
                type="button"
                disabled={!s.count}
                onClick={() => {
                  setTried(false);
                  setStep("entrega");
                }}
                className="h-12 flex-1 rounded-full bg-pu-ink text-[14px] font-medium text-white transition-opacity disabled:opacity-30"
              >
                Finalizar compra
              </button>
            )}
            {step === "entrega" && (
              <button type="submit" form="pulso-entrega" className="h-12 flex-1 rounded-full bg-pu-ink text-[14px] font-medium text-white">
                Revisar pedido
              </button>
            )}
            {step === "revisao" && (
              <button type="button" onClick={confirm} className={cn("h-12 flex-1 rounded-full text-[14px] font-medium text-white", IRIS)}>
                Confirmar pedido (simulado)
              </button>
            )}
            {step === "pedido" && (
              <button type="button" onClick={close} className="h-12 flex-1 rounded-full bg-pu-ink text-[14px] font-medium text-white">
                Voltar à loja
              </button>
            )}
          </div>
          <p className="mt-3 text-center text-[11px] leading-snug text-pu-mute">{NOTE}</p>
        </div>
      </div>

      <div
        role="status"
        data-show={!!toast}
        className="fixed top-[calc(var(--demo-bar-h,0px)+68px)] left-1/2 z-[85] -translate-x-1/2 rounded-full border border-pu-line bg-white/95 px-4 py-2.5 text-[12.5px] whitespace-nowrap text-pu-ink shadow-[0_18px_40px_-18px_rgb(12_13_18/0.4)] backdrop-blur-xl transition-[opacity,translate] duration-500 ease-soft data-[show=false]:pointer-events-none data-[show=false]:-translate-y-3 data-[show=false]:opacity-0 max-sm:max-w-[calc(100vw-32px)] max-sm:truncate"
      >
        {toast && (
          <>
            <span className="mr-2 font-mono text-[10px] tracking-[0.12em] text-pu-acc uppercase">pulso:cart-add</span>
            {toast.text}
          </>
        )}
      </div>
    </>
  );
}
