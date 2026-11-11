"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useCart, Wordmark } from "./bits";
import { cartSummary, focusSearch, scrollToSection, setCartOpen, SITE_NAV } from "./store";

/** Pulso's own glass header with search (⌘K) and the cart, right below MatsuHub's demo bar (app/demos/layout). */
export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const { count } = cartSummary(useCart());

  useEffect(() => {
    const read = () => setSolid(window.scrollY > 12);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  const jump = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    scrollToSection(id);
  };

  return (
    <>

      <header
        data-solid={solid}
        className="fixed inset-x-0 top-[var(--demo-bar-h,0px)] z-[55] border-b border-transparent transition-[background-color,border-color] duration-500 data-[solid=true]:border-pu-line data-[solid=true]:bg-pu-bg/80 data-[solid=true]:backdrop-blur-xl data-[solid=true]:backdrop-saturate-150"
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-[var(--pad)]">
          <a href="#one" onClick={jump("top")} aria-label="Pulso, início">
            <Wordmark />
          </a>
          <nav aria-label="Seções da loja" className="flex items-center gap-8 max-lg:hidden">
            {SITE_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={jump(item.id)}
                className="text-[13px] leading-none font-medium text-pu-ink/75 transition-colors hover:text-pu-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => focusSearch()}
              aria-label="Buscar por intenção (Ctrl+K ou ⌘K)"
              className="flex h-9 items-center gap-2.5 rounded-full border border-pu-line bg-white/70 pr-1.5 pl-3.5 text-[12.5px] text-pu-mute transition-[border-color,color,box-shadow] hover:border-pu-acc/40 hover:text-pu-ink hover:shadow-[0_0_0_4px_rgb(91_75_255/0.08)] max-sm:w-9 max-sm:justify-center max-sm:px-0"
            >
              <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5 shrink-0">
                <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="max-sm:hidden">Pergunte à loja</span>
              <kbd className="rounded-full border border-pu-line bg-pu-bg px-2 py-1 font-mono text-[10px] leading-none text-pu-mute max-sm:hidden">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
              className="relative flex h-9 items-center gap-2 rounded-full bg-pu-ink pr-3.5 pl-3 text-[12.5px] font-medium text-white transition-transform active:scale-95"
            >
              <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5">
                <path d="M2.5 5.5h11l-1 8h-9z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M5.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <span className="max-sm:hidden">Carrinho</span>
              <span
                key={count}
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[10.5px] leading-none transition-[scale,background-color] duration-500 ease-soft starting:scale-150",
                  count ? "bg-[linear-gradient(135deg,var(--color-pu-acc),var(--color-pu-acc-2))] text-white" : "bg-white/15 text-white/70",
                )}
              >
                {count}
              </span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
