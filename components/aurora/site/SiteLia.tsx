"use client";

import { useEffect, useRef, useState } from "react";
import { LIA } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { emitSite, onSite, scrollToSection, SECTION } from "./bus";
import { LIA_START, liaAnswer, type LiaMemory, type LiaStep } from "./lia-script";

type Message = { id: number; from: "lia" | "user"; text: string };

/**
 * Lia, the scripted AI broker: a floating button that opens a chat panel (bottom sheet on
 * phones). Quick replies branch through lia-script.ts; typed text is matched by keywords.
 * Labelled as a simulation everywhere — no model is called.
 */
export function SiteLia() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replies, setReplies] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [past, setPast] = useState(false);
  const [inside, setInside] = useState(false);

  const ids = useRef(0);
  const memory = useRef<LiaMemory>({});
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // phones: the button waits until the visitor has left the tour (it would cover the floor card)
  useEffect(() => {
    const read = () => setPast(window.scrollY > window.innerHeight * 0.6);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  // over the tour's plan and rooms the button would cover the room tabs
  useEffect(() => onSite("tour", (mode) => setInside(mode !== "tower")), []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [messages, typing]);

  // move focus into the panel when it opens (the launcher fades out under it)
  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  /** Close; if focus was inside the panel, hand it back to the launcher instead of losing it to <body>. */
  const close = () => {
    if (panelRef.current?.contains(document.activeElement)) launcherRef.current?.focus({ preventScroll: true });
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (panelRef.current?.contains(document.activeElement)) launcherRef.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  const push = (from: Message["from"], text: string) =>
    setMessages((list) => [...list, { id: ++ids.current, from, text }]);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const narrow = () => window.innerWidth < 640;

  const act = (action: NonNullable<LiaStep["action"]>) => {
    if (action.kind === "unit") {
      emitSite("unit", action.unit);
      scrollToSection("top");
      if (narrow()) later(900, () => setOpen(false));
    } else if (action.kind === "scroll") {
      scrollToSection(action.to === "finance" ? SECTION.finance : SECTION.units);
      if (narrow()) later(900, () => setOpen(false));
    } else {
      emitSite("visit", { message: action.message });
      scrollToSection(SECTION.visit);
      if (narrow()) later(1400, () => setOpen(false));
    }
  };

  const play = (step: LiaStep) => {
    setReplies([]);
    let t = 250;
    step.say.forEach((line, i) => {
      later(t, () => setTyping(true));
      t += Math.min(1500, 520 + line.length * 11);
      later(t, () => {
        setTyping(false);
        push("lia", line);
        if (i === step.say.length - 1) {
          setReplies(step.replies);
          if (step.action) act(step.action);
        }
      });
      t += 260;
    });
  };

  const toggle = () => {
    setOpen((was) => !was);
    if (!started.current) {
      started.current = true;
      play(LIA_START);
    }
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || typing) return;
    push("user", clean);
    setDraft("");
    play(liaAnswer(clean, memory.current));
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="aurora-lia"
        data-past={past}
        data-hide={inside && !past}
        data-open={open}
        className="group fixed right-4 bottom-4 z-[70] flex items-center gap-3 rounded-full border border-au-gold/60 bg-au-bg/90 py-2 pr-5 pl-2 text-au-ink shadow-[0_18px_50px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-[opacity,translate,border-color] duration-500 ease-soft hover:border-au-gold sm:right-6 sm:bottom-6 max-sm:data-[past=false]:pointer-events-none max-sm:data-[past=false]:translate-y-4 max-sm:data-[past=false]:opacity-0 data-[hide=true]:pointer-events-none data-[hide=true]:translate-y-4 data-[hide=true]:opacity-0 data-[open=true]:pointer-events-none data-[open=true]:translate-y-4 data-[open=true]:opacity-0"
      >
        <Avatar />
        <span className="text-left leading-none">
          <span className="block text-[13px] font-semibold">Fale com a Lia</span>
          <span className="mt-1 block text-[9px] font-semibold tracking-[0.2em] text-au-gold uppercase">IA · simulação</span>
        </span>
      </button>

      <div
        ref={panelRef}
        id="aurora-lia"
        role="dialog"
        tabIndex={-1}
        aria-label={`${LIA.name}, ${LIA.role}`}
        data-open={open}
        inert={!open}
        className="fixed z-[75] flex flex-col border outline-none border-au-line bg-au-bg/95 text-au-ink shadow-[0_30px_90px_-20px_rgb(0_0_0/0.85)] backdrop-blur-xl transition-[opacity,translate] duration-500 ease-soft data-[open=false]:pointer-events-none data-[open=false]:translate-y-6 data-[open=false]:opacity-0 max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[78svh] max-sm:border-x-0 max-sm:border-b-0 sm:right-6 sm:bottom-6 sm:h-[min(600px,calc(100svh-140px))] sm:w-[380px]"
      >
        <div className="flex items-center gap-3 border-b border-au-line px-4 py-3.5">
          <Avatar />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2.5">
              <span className="font-aurora text-[19px] leading-none">{LIA.name}</span>
              <span className="border border-au-line px-1.5 py-[3px] text-[8px] leading-none font-bold tracking-[0.2em] text-au-gold uppercase">
                IA · simulação
              </span>
            </span>
            <span className="mt-1.5 block truncate text-[9px] leading-none font-semibold tracking-[0.2em] text-au-mute uppercase">
              {LIA.role}
            </span>
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar conversa"
            className="relative grid h-9 w-9 place-items-center border border-au-line text-[13px] before:absolute before:-inset-[3px] before:content-[''] transition-colors hover:border-au-gold focus-visible:outline-au-gold"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div ref={listRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-4" data-lenis-prevent>
          <p className="mb-2 self-center text-center text-[10.5px] leading-snug text-au-mute">
            Conversa roteirizada para demonstração.
            <br />
            Nenhum dado é enviado.
          </p>
          {messages.map((m) => (
            <p
              key={m.id}
              className={cn(
                "max-w-[86%] px-3.5 py-2.5 text-[13.5px] leading-snug whitespace-pre-line transition-[opacity,translate] duration-500 ease-soft starting:translate-y-2 starting:opacity-0",
                m.from === "user"
                  ? "self-end rounded-[16px_16px_4px_16px] bg-au-gold font-medium text-au-bg"
                  : "self-start rounded-[16px_16px_16px_4px] bg-white/[0.08]",
              )}
            >
              {m.text}
            </p>
          ))}
          {typing && (
            <p aria-label="Lia está digitando" className="flex gap-1 self-start rounded-[16px_16px_16px_4px] bg-white/[0.08] px-3.5 py-3.5">
              {[0, 1, 2].map((dot) => (
                <i
                  key={dot}
                  aria-hidden
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-au-mute [animation-duration:0.9s]"
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
                  className="border border-au-gold/50 px-3 py-2 text-[12px] leading-none text-au-gold transition-colors starting:opacity-0 hover:bg-au-gold hover:text-au-bg focus-visible:outline-au-gold"
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
          className="flex items-center gap-2 border-t border-au-line px-3 py-3"
        >
          <label htmlFor="aurora-lia-input" className="sr-only">
            Mensagem para a Lia
          </label>
          <input
            id="aurora-lia-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={200}
            autoComplete="off"
            placeholder="Escreva uma mensagem…"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[14px] text-au-ink placeholder:text-au-mute focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-au-gold"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!draft.trim() || typing}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-au-gold text-[14px] text-au-bg transition-opacity disabled:opacity-40"
          >
            <span aria-hidden>↑</span>
          </button>
        </form>
      </div>
    </>
  );
}

function Avatar() {
  return (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-au-gold/70 font-aurora text-[18px] leading-none text-au-gold">
      L
      <i aria-hidden className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-au-bg bg-[#7fe3a3]" />
    </span>
  );
}
