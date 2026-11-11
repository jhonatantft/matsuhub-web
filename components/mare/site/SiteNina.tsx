"use client";

import { useEffect, useRef, useState } from "react";
import { MAITRE } from "@/content/mare";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { addToComanda, emitSite, onSite, onTour, scrollToSection, SECTION, showTable } from "./bus";
import { newMemory, NINA_START, ninaAnswer, orderStep, type NinaAction, type NinaStep } from "./nina-script";

type Message = { id: number; from: "nina" | "user"; text: string };

/**
 * Nina, the scripted AI maître: a floating button that opens a chat panel (bottom sheet on
 * phones). Quick replies branch through nina-script.ts, which computes every answer from the
 * menu and table data; typed text is matched by keywords. Labelled as a simulation.
 */
export function SiteNina() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replies, setReplies] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [past, setPast] = useState(false);
  const [inside, setInside] = useState(false);

  const ids = useRef(0);
  const memory = useRef(newMemory());
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<(step: NinaStep) => void>(() => {});

  // phones: the button waits until the visitor has left the hero
  useEffect(() => {
    const read = () => setPast(window.scrollY > window.innerHeight * 0.6);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  // inside the salon tour the button would sit on the tour's own controls
  useEffect(() => onTour("mare:state", (d) => setInside(d.state !== "fachada")), []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  const close = () => {
    if (panelRef.current?.contains(document.activeElement)) launcherRef.current?.focus({ preventScroll: true });
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (panelRef.current?.contains(document.activeElement)) launcherRef.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  const push = (from: Message["from"], text: string) => setMessages((list) => [...list, { id: ++ids.current, from, text }]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const narrow = () => window.innerWidth < 640;

  const act = (action: NinaAction) => {
    if (action.kind === "comanda") {
      action.ids.forEach((id) => addToComanda(id));
      return;
    }
    if (action.kind === "avoid") {
      emitSite("avoid", action.list);
      scrollToSection(SECTION.menu);
    } else if (action.kind === "show-table") {
      showTable(action.tableId);
      scrollToSection(SECTION.salon);
    } else if (action.kind === "reserve") {
      emitSite("reserve", action.prefill);
      scrollToSection(SECTION.reserve);
    } else {
      scrollToSection(action.to);
    }
    if (narrow()) later(1100, () => setOpen(false));
  };

  const play = (step: NinaStep) => {
    setReplies([]);
    let t = 250;
    step.say.forEach((line, i) => {
      later(t, () => setTyping(true));
      t += Math.min(1500, 520 + line.length * 9);
      later(t, () => {
        setTyping(false);
        push("nina", line);
        if (i === step.say.length - 1) {
          setReplies(step.replies);
          if (step.action) act(step.action);
        }
      });
      t += 260;
    });
  };

  // keep the latest play() for the bus listener below
  useEffect(() => {
    playRef.current = play;
  });

  // "Enviar para a Nina" from the comanda
  useEffect(
    () =>
      onSite("nina", () => {
        setOpen(true);
        if (!started.current) {
          started.current = true;
          playRef.current({ say: ["Boa noite! Sou a Nina, maître virtual do Maré."], replies: [] });
        }
        timers.current.push(window.setTimeout(() => playRef.current(orderStep()), 900));
      }),
    [],
  );

  const toggle = () => {
    setOpen((was) => !was);
    if (!started.current) {
      started.current = true;
      play(NINA_START);
    }
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || typing) return;
    push("user", clean);
    setDraft("");
    play(ninaAnswer(clean, memory.current));
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="mare-nina"
        data-past={past}
        data-hide={inside && !past}
        data-open={open}
        className="group fixed right-4 bottom-4 z-[70] flex items-center gap-3 rounded-full border border-ma-ember/60 bg-ma-bg/90 py-2 pr-5 pl-2 text-ma-ink shadow-[0_18px_50px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-[opacity,translate,border-color] duration-500 ease-soft hover:border-ma-ember sm:right-6 sm:bottom-6 max-sm:data-[past=false]:pointer-events-none max-sm:data-[past=false]:translate-y-4 max-sm:data-[past=false]:opacity-0 data-[hide=true]:pointer-events-none data-[hide=true]:translate-y-4 data-[hide=true]:opacity-0 data-[open=true]:pointer-events-none data-[open=true]:translate-y-4 data-[open=true]:opacity-0"
      >
        <Avatar />
        <span className="text-left leading-none">
          <span className="block text-[13px] font-semibold">Fale com a {MAITRE.name}</span>
          <span className="mt-1 block text-[9px] font-semibold tracking-[0.2em] text-ma-ember uppercase">IA · simulação</span>
        </span>
      </button>

      <div
        ref={panelRef}
        id="mare-nina"
        role="dialog"
        tabIndex={-1}
        aria-label={`${MAITRE.name}, ${MAITRE.role}`}
        data-open={open}
        inert={!open}
        className="fixed z-[75] flex flex-col overflow-hidden border border-ma-line bg-ma-bg/95 text-ma-ink shadow-[0_30px_90px_-20px_rgb(0_0_0/0.85)] outline-none backdrop-blur-xl transition-[opacity,translate] duration-500 ease-soft data-[open=false]:pointer-events-none data-[open=false]:translate-y-6 data-[open=false]:opacity-0 max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[78svh] max-sm:rounded-t-[22px] max-sm:border-x-0 max-sm:border-b-0 sm:right-6 sm:bottom-6 sm:h-[min(620px,calc(100svh-140px))] sm:w-[390px] sm:rounded-[22px]"
      >
        <div className="flex items-center gap-3 border-b border-ma-line px-4 py-3.5">
          <Avatar />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2.5">
              <span className="font-mare text-[22px] leading-none">{MAITRE.name}</span>
              <span className="rounded-full border border-ma-line px-2 py-[3px] text-[8px] leading-none font-bold tracking-[0.2em] text-ma-ember uppercase">
                IA · simulação
              </span>
            </span>
            <span className="mt-1.5 block truncate text-[9px] leading-none font-semibold tracking-[0.2em] text-ma-mute uppercase">
              {MAITRE.role}
            </span>
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar conversa"
            className="relative grid h-9 w-9 place-items-center rounded-full border border-ma-line text-[13px] transition-colors before:absolute before:-inset-[3px] before:content-[''] hover:border-ma-ember focus-visible:outline-ma-ember"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div
          ref={listRef}
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-4"
          data-lenis-prevent
        >
          <p className="mb-2 self-center text-center text-[10.5px] leading-snug text-ma-mute">
            Conversa roteirizada para demonstração.
            <br />
            Nenhum dado é enviado.
          </p>
          {messages.map((m) => (
            <p
              key={m.id}
              className={cn(
                "max-w-[88%] px-3.5 py-2.5 text-[13.5px] leading-snug whitespace-pre-line transition-[opacity,translate] duration-500 ease-soft starting:translate-y-2 starting:opacity-0",
                m.from === "user"
                  ? "self-end rounded-[16px_16px_4px_16px] bg-ma-ember font-medium text-ma-bg"
                  : "self-start rounded-[16px_16px_16px_4px] bg-white/[0.07]",
              )}
            >
              {m.text}
            </p>
          ))}
          {typing && (
            <p aria-label={`${MAITRE.name} está digitando`} className="flex gap-1 self-start rounded-[16px_16px_16px_4px] bg-white/[0.07] px-3.5 py-3.5">
              {[0, 1, 2].map((dot) => (
                <i
                  key={dot}
                  aria-hidden
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-ma-mute [animation-duration:0.9s]"
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
                  className="rounded-full border border-ma-ember/50 px-3 py-2 text-[12px] leading-none text-ma-ember transition-colors starting:opacity-0 hover:bg-ma-ember hover:text-ma-bg focus-visible:outline-ma-ember"
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
          className="flex items-center gap-2 border-t border-ma-line px-3 py-3"
        >
          <label htmlFor="mare-nina-input" className="sr-only">
            Mensagem para a {MAITRE.name}
          </label>
          <input
            id="mare-nina-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={200}
            autoComplete="off"
            placeholder="Escreva uma mensagem…"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[14px] text-ma-ink placeholder:text-ma-mute focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ma-ember"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!draft.trim() || typing}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ma-ember text-[14px] text-ma-bg transition-opacity disabled:opacity-40"
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
    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ma-ember/70 font-mare text-[20px] leading-none text-ma-ember italic">
      N
      <i aria-hidden className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-ma-bg bg-[#7fe3a3]" />
    </span>
  );
}
