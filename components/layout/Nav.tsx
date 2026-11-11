"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { NAV } from "@/content/site";
import { cn } from "@/lib/cn";
import { lenisRef } from "@/lib/scroll";

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  // Glass background after the first scroll; hide on the way down, show on the way up.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      if (y > 480 && y > lastY.current + 6) setHidden(true);
      else if (y < lastY.current - 6 || y <= 480) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile menu: lock scrolling, close on Escape.
  useEffect(() => {
    if (!open) return;
    lenisRef.current?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lenisRef.current?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-soft",
        hidden && !open && "-translate-y-full",
      )}
    >
      <div
        className={cn(
          "flex h-[var(--nav-h)] items-center justify-between border-b px-[var(--pad)] transition-colors duration-300",
          solid || open ? "border-line bg-bg/80 backdrop-blur-md" : "border-transparent",
        )}
      >
        <Link href="/" aria-label="MatsuHub — início" className="rounded-sm">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex gap-8 font-mono text-xs font-medium tracking-[0.1em] uppercase">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-mute transition-colors hover:text-acc">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/#contato" size="sm" className="hidden sm:inline-flex">
            Iniciar projeto
          </Button>
          <button
            type="button"
            className="relative h-10 w-10 rounded-full border border-line-2 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span
              className={cn(
                "absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 bg-ink transition-transform duration-300",
                open ? "rotate-45" : "-translate-y-[4px]",
              )}
            />
            <span
              className={cn(
                "absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 bg-ink transition-transform duration-300",
                open ? "-rotate-45" : "translate-y-[4px]",
              )}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100svh-var(--nav-h))] overflow-y-auto bg-bg/95 px-[var(--pad)] py-10 backdrop-blur-xl md:hidden"
      >
        <nav aria-label="Menu">
          <ul className="grid gap-2">
            {NAV.map((item, i) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-4 border-b border-line py-5 font-display text-3xl font-semibold tracking-tight"
                >
                  <span className="font-mono text-xs text-acc">0{i + 1}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Button href="/#contato" className="mt-10 w-full" onClick={() => setOpen(false)}>
          Iniciar projeto
        </Button>
      </div>
    </header>
  );
}
