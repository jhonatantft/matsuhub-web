"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { scrollToSection, SECTION, SITE_NAV } from "./bus";
import { EloWordmark } from "./ui";

/**
 * Elo's own header, right below MatsuHub's demo bar (app/demos/layout): a soft linen fade over
 * the tour, solid linen once the page scrolls. Phones get a sheet menu.
 */
export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const read = () => setSolid(window.scrollY > 24);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [menu]);

  const jump = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    setMenu(false);
    scrollToSection(id);
  };

  return (
    <header
      data-solid={solid || menu}
      className="group/h fixed inset-x-0 top-[var(--demo-bar-h,0px)] z-[55] transition-[background-color,border-color,box-shadow] duration-500 data-[solid=true]:border-b data-[solid=true]:border-el-line data-[solid=true]:bg-el-bg/92 data-[solid=true]:shadow-[0_10px_30px_-24px_rgb(20_32_31/0.5)] data-[solid=true]:backdrop-blur-xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-el-bg/90 via-el-bg/55 to-transparent transition-opacity duration-500 group-data-[solid=true]/h:opacity-0"
      />
      <div className="relative mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-[var(--pad)]">
        <a href={`#${SECTION.tour}`} onClick={jump("top")} aria-label="Elo Clínica Integrada, início">
          <EloWordmark />
        </a>
        <nav aria-label="Seções" className="flex items-center gap-8 max-lg:hidden">
          {SITE_NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={jump(item.id)}
              className="font-elo text-[15.5px] leading-none text-el-ink transition-colors hover:text-el-acc"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={`#${SECTION.booking}`}
            onClick={jump(SECTION.booking)}
            className="inline-flex h-11 items-center rounded-full bg-el-acc px-5 font-elo text-[14.5px] leading-none font-medium text-white transition-colors hover:bg-[#0b4642] max-sm:px-4"
          >
            <span className="max-sm:hidden">Agendar consulta</span>
            <span className="sm:hidden">Agendar</span>
          </a>
          <button
            type="button"
            aria-expanded={menu}
            aria-controls="elo-menu"
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenu((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-full border border-el-ink/15 bg-el-bg-2/70 lg:hidden"
          >
            <span aria-hidden className="grid gap-[5px]">
              <i className={cn("block h-[1.5px] w-4 bg-el-ink transition-transform duration-300", menu && "translate-y-[3.25px] rotate-45")} />
              <i className={cn("block h-[1.5px] w-4 bg-el-ink transition-transform duration-300", menu && "-translate-y-[3.25px] -rotate-45")} />
            </span>
          </button>
        </div>
      </div>

      <nav
        id="elo-menu"
        aria-label="Seções"
        data-open={menu}
        inert={!menu}
        className="relative grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-soft data-[open=false]:grid-rows-[0fr] data-[open=false]:opacity-0 data-[open=true]:grid-rows-[1fr] lg:hidden"
      >
        <ul className="min-h-0 px-[var(--pad)]">
          {SITE_NAV.map((item) => (
            <li key={item.id} className="border-t border-el-line">
              <a
                href={`#${item.id}`}
                onClick={jump(item.id)}
                className="flex items-center justify-between py-4 font-elo text-[22px] text-el-ink"
              >
                {item.label}
                <span aria-hidden className="text-[16px] text-el-acc">
                  →
                </span>
              </a>
            </li>
          ))}
          <li className="border-t border-el-line pb-3" />
        </ul>
      </nav>
    </header>
  );
}
