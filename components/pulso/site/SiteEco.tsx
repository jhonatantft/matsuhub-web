"use client";

import { useEffect, useRef, useState } from "react";
import { ECO } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { ECO_START, ecoAnswer, newMemory, type EcoAction, type EcoStep } from "./eco-script";
import { addToCart, cartStore, compareStore, focusSearch, scrollToSection, SECTION, setCartOpen, setSearch } from "./store";

type Message = { id: number; from: "eco" | "user"; text: string };

/**
 * Eco, the scripted AI salesperson: floating launcher + chat panel (bottom sheet on phones).
 * Answers come from eco-script.ts, computed from the catalogue and the live cart. Labelled as a simulation.
 */
export function SiteEco() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replies, setReplies] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [past, setPast] = useState(false);

  const ids = useRef(0);
  const memory = useRef(newMemory());
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // phones: the launcher waits until the visitor has left the hero (it would sit on the buy panel)
  useEffect(() => {
    const read = () => setPast(window.scrollY > window.innerHeight * 0.9);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('[role="dialog"][aria-modal="true"]:not([inert])')) return;
      if (panelRef.current?.contains(document.activeElement)) launcherRef.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  const close = () => {
    if (panelRef.current?.contains(document.activeElement)) launcherRef.current?.focus({ preventScroll: true });
    setOpen(false);
  };

  const push = (from: Message["from"], text: string) => setMessages((list) => [...list, { id: ++ids.current, from, text }]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const act = (action: EcoAction) => {
    if (action.kind === "add") action.items.forEach((i) => addToCart(i.productId, i.qty, i.colorId));
    else if (action.kind === "search") {
      if (action.go) {
        focusSearch(action.text);
        if (window.innerWidth < 640) later(400, () => setOpen(false));
      } else setSearch(action.text);
    } else if (action.kind === "compare") {
      compareStore.set(action.ids);
      scrollToSection(SECTION.compare);
      if (window.innerWidth < 640) later(400, () => setOpen(false));
    } else if (action.kind === "cart") setCartOpen(true);
  };

  const play = (step: EcoStep) => {
    setReplies([]);
    let t = 220;
    step.say.forEach((line, i) => {
      later(t, () => setTyping(true));
      t += Math.min(1300, 420 + line.length * 7);
      later(t, () => {
        setTyping(false);
        push("eco", line);
        if (i === step.say.length - 1) {
          setReplies(step.replies);
          if (step.action) act(step.action);
        }
      });
      t += 240;
    });
  };

  const toggle = () => {
    setOpen((was) => !was);
    if (!started.current) {
      started.current = true;
      play(ECO_START);
    }
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || typing) return;
    push("user", clean);
    setDraft("");
    play(ecoAnswer(clean, memory.current, cartStore.get()));
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="pulso-eco"
        data-open={open}
        data-past={past}
        className="group fixed right-4 bottom-4 z-[70] flex items-center gap-3 rounded-full border border-pu-line bg-white/90 py-1.5 pr-5 pl-1.5 text-pu-ink shadow-[0_18px_50px_-16px_rgb(91_75_255/0.5)] backdrop-blur-xl transition-[opacity,translate,box-shadow] duration-500 ease-soft hover:shadow-[0_18px_50px_-12px_rgb(91_75_255/0.7)] sm:right-6 sm:bottom-6 data-[open=true]:pointer-events-none data-[open=true]:translate-y-4 data-[open=true]:opacity-0 max-sm:data-[past=false]:pointer-events-none max-sm:data-[past=false]:translate-y-4 max-sm:data-[past=false]:opacity-0"
      >
        <Orb />
        <span className="text-left leading-none">
          <span className="block text-[13px] font-semibold">Pergunte ao {ECO.name}</span>
          <span className="mt-1 block font-mono text-[9px] tracking-[0.16em] text-pu-acc uppercase">IA · simulação</span>
        </span>
      </button>

      <div
        ref={panelRef}
        id="pulso-eco"
        role="dialog"
        tabIndex={-1}
        aria-label={`${ECO.name}, ${ECO.role}`}
        data-open={open}
        inert={!open}
        className="fixed z-[75] flex flex-col overflow-hidden border border-pu-line bg-pu-bg/95 text-pu-ink shadow-[0_30px_90px_-24px_rgb(12_13_18/0.45)] outline-none backdrop-blur-2xl transition-[opacity,translate] duration-500 ease-soft data-[open=false]:pointer-events-none data-[open=false]:translate-y-6 data-[open=false]:opacity-0 max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[80svh] max-sm:rounded-t-[22px] max-sm:border-x-0 max-sm:border-b-0 sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100svh-140px))] sm:w-[400px] sm:rounded-[22px]"
      >
        <div className="flex items-center gap-3 border-b border-pu-line bg-white/60 px-4 py-3.5">
          <Orb />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2.5">
              <span className="font-pulso text-[18px] leading-none font-semibold tracking-[-0.03em]">{ECO.name}</span>
              <span className="rounded-full border border-pu-acc/30 px-2 py-[3px] font-mono text-[8.5px] leading-none tracking-[0.14em] text-pu-acc uppercase">IA · simulação</span>
            </span>
            <span className="mt-1.5 block truncate font-mono text-[9.5px] leading-none tracking-[0.12em] text-pu-mute uppercase">{ECO.role}</span>
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar conversa"
            className="relative grid h-9 w-9 place-items-center rounded-full border border-pu-line text-[13px] transition-colors before:absolute before:-inset-[3px] before:content-[''] hover:border-pu-ink/40"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div ref={listRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-4" data-lenis-prevent>
          <p className="mb-2 self-center text-center text-[10.5px] leading-snug text-pu-mute">
            Respostas roteirizadas, calculadas a partir do catálogo.
            <br />
            Não é um modelo de linguagem. Nenhum dado é enviado.
          </p>
          {messages.map((m) => (
            <p
              key={m.id}
              className={cn(
                "max-w-[88%] px-3.5 py-2.5 text-[13.5px] leading-snug whitespace-pre-line transition-[opacity,translate] duration-500 ease-soft starting:translate-y-2 starting:opacity-0",
                m.from === "user"
                  ? "self-end rounded-[16px_16px_4px_16px] bg-pu-ink text-white"
                  : "self-start rounded-[16px_16px_16px_4px] border border-pu-line bg-white",
              )}
            >
              {m.text}
            </p>
          ))}
          {typing && (
            <p aria-label={`${ECO.name} está digitando`} className="flex gap-1 self-start rounded-[16px_16px_16px_4px] border border-pu-line bg-white px-3.5 py-3.5">
              {[0, 1, 2].map((dot) => (
                <i
                  key={dot}
                  aria-hidden
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-pu-acc/70 [animation-duration:0.9s]"
                  style={{ animationDelay: `${dot * 0.14}s` }}
                />
              ))}
            </p>
          )}
          {replies.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              {replies.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => send(r)}
                  className="rounded-full border border-pu-acc/35 bg-white px-3 py-2 text-[12px] leading-none text-pu-acc transition-colors starting:opacity-0 hover:bg-pu-acc hover:text-white"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2 border-t border-pu-line bg-white/60 px-3 py-3"
        >
          <label htmlFor="pulso-eco-input" className="sr-only">
            Mensagem para o {ECO.name}
          </label>
          <input
            ref={inputRef}
            id="pulso-eco-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={200}
            autoComplete="off"
            placeholder="Ex.: quero um fone para academia"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[14px] text-pu-ink outline-none placeholder:text-pu-mute"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!draft.trim() || typing}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pu-ink text-[14px] text-white transition-opacity disabled:opacity-30"
          >
            <span aria-hidden>↑</span>
          </button>
        </form>
      </div>
    </>
  );
}

function Orb() {
  return (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[conic-gradient(from_200deg,var(--color-pu-acc),var(--color-pu-acc-2),#c9c2ff,var(--color-pu-acc))]">
      <span className="h-[30px] w-[30px] rounded-full bg-white/85 backdrop-blur" />
      <i aria-hidden className="absolute h-2 w-2 rounded-full bg-pu-acc" />
    </span>
  );
}
