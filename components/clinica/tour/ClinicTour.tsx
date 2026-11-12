"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ELO_MEDIA, type EloRoomId, type EloSpecialtyId } from "@/content/clinica";
import { slotLabel, type EloSlot } from "@/lib/clinica/availability";
import { cn } from "@/lib/cn";
import { damp } from "@/lib/math";
import { ROOM_BOX, ROOM_GEO, ROOM_IDS, availability, isRoomId, prosOf, roomById, specialtyOf } from "./data";
import { createEloEngine, type Box, type EloEngine } from "./engine";
import { RoomBar, RoomDetail, RoomHover, btnPrimary, eyebrow, roomKind, surface } from "./parts";

export type ClinicTourState = "fachada" | "planta" | "sala";
export type EloBookDetail = { specialty: EloSpecialtyId; professionalId?: string; start?: string };
export type EloStateDetail = { state: ClinicTourState; room?: EloRoomId };
export type EloShowRoomDetail = { room: EloRoomId };

const polyPoints = (id: EloRoomId) => ROOM_GEO[id].poly.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * The Elo tour, the clinic demo's hero. Fills its parent (the parent sets the height).
 *
 * fachada  the street front; the entrance door (far left) is a hotspot: hover lights it,
 *          click / Enter / "Entrar" pushes the camera through it into the floor
 * planta   the cut-away as an interactive map: every room answers to hover with an outline and a
 *          card (who works there, next free time); click zooms the camera onto that room and the
 *          card lists each professional's next free slots
 * sala     the photo of a room, entered from the zoomed room; a bar jumps between rooms
 *
 * Window events — dispatches `elo:book` and `elo:state`, listens to `elo:show-room` (types above).
 * Keyboard: arrows move between rooms, Enter selects/opens, Esc goes back one step.
 */
export function ClinicTour({ className, initial = "fachada" }: { className?: string; initial?: "fachada" | "planta" }) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const doorRef = useRef<HTMLButtonElement>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const selCardRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EloEngine | null>(null);
  const live = useRef({ phase: initial as ClinicTourState, hover: null as EloRoomId | null, selected: null as EloRoomId | null });
  const lastState = useRef("");
  const drag = useRef({ id: -1, x: 0, y: 0, moved: false, type: "mouse" });

  const [phase, setPhase] = useState<ClinicTourState>(initial);
  const [flying, setFlying] = useState(false);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [hover, setHover] = useState<EloRoomId | null>(null);
  const [selected, setSelected] = useState<EloRoomId | null>(null);
  const [viewRoom, setViewRoom] = useState<EloRoomId>("espera");
  const [doorHot, setDoorHot] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [grab, setGrab] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // the schedule is computed from the clock, read outside render
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const every = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, []);
  const avail = now ? availability(now) : null;

  /* ───────────── Engine ───────────── */

  useEffect(() => {
    const root = rootRef.current!;
    const box: Box = { x: 0, y: 0, w: 0, h: 0 };
    const sizes = new Map<Element, { w: number; h: number }>();
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) sizes.set(e.target, { w: e.borderBoxSize[0].inlineSize, h: e.borderBoxSize[0].blockSize });
    });
    for (const el of [hoverCardRef.current, selCardRef.current]) if (el) ro.observe(el);
    const cards = {
      hover: { x: 0, y: 0, on: false, px: NaN, py: NaN, side: 1 },
      sel: { x: 0, y: 0, on: false, px: NaN, py: NaN, side: 1 },
    };
    const door = { x: NaN, y: NaN, w: NaN, h: NaN };
    const lead = { x: NaN, y: NaN, len: NaN, a: NaN };
    const moved = (a: number, b: number) => !(Math.abs(a - b) < 0.05);

    /**
     * Put a card beside a room: on the `prefer` side (1 right, -1 left), else the other, else over
     * the visible part of the room. Eased, so it follows the camera.
     */
    function place(el: HTMLElement | null, id: EloRoomId | null, st: typeof cards.hover, e: EloEngine, dt: number, prefer = 1) {
      if (!el || !id) {
        st.on = false;
        return;
      }
      const size = sizes.get(el) ?? { w: el.offsetWidth, h: el.offsetHeight };
      const { width: W, height: H } = e.size;
      e.projectRoom(id, box);
      const gap = 20;
      const right = box.x + box.w + gap;
      const left = box.x - gap - size.w;
      const fitsRight = right + size.w <= W - 24;
      const fitsLeft = left >= 24;
      let side = prefer;
      let x: number;
      if (prefer > 0 ? fitsRight : !fitsLeft && fitsRight) {
        side = 1;
        x = right;
      } else if (fitsLeft) {
        side = -1;
        x = left;
      } else {
        const v0 = Math.max(24, box.x);
        const v1 = Math.min(W - 24, box.x + box.w);
        x = (v0 + v1) / 2 - size.w / 2;
      }
      x = Math.max(24, Math.min(W - 24 - size.w, x));
      const y = Math.max(96, Math.min(H - 124 - size.h, box.y + box.h / 2 - size.h / 2));
      if (!st.on) {
        st.x = x;
        st.y = y;
        st.on = true;
      } else {
        st.x = damp(st.x, x, 14, dt);
        st.y = damp(st.y, y, 14, dt);
      }
      st.side = side;
      if (moved(st.x, st.px) || moved(st.y, st.py)) {
        st.px = st.x;
        st.py = st.y;
        el.style.transform = `translate3d(${st.x}px,${st.y}px,0)`;
      }
    }

    const engine = createEloEngine({
      root,
      canvas: canvasRef.current!,
      imgA: imgARef.current!,
      imgB: imgBRef.current!,
      outlines: svgRef.current!,
      initial: initial === "planta" ? "floor" : "facade",
      onReady: (mode) => {
        setReady(true);
        if (mode === "img") setFallback(true);
      },
      onFrame: (e, dt) => {
        const L = live.current;
        // the door hotspot follows the facade camera
        const doorEl = doorRef.current;
        if (doorEl && e.scene === "facade") {
          e.projectDoor(box);
          if (moved(box.x, door.x) || moved(box.y, door.y) || moved(box.w, door.w) || moved(box.h, door.h)) {
            door.x = box.x;
            door.y = box.y;
            door.w = box.w;
            door.h = box.h;
            doorEl.style.transform = `translate3d(${box.x}px,${box.y}px,0)`;
            doorEl.style.width = `${box.w}px`;
            doorEl.style.height = `${box.h}px`;
          }
        }
        const onFloor = e.scene === "floor" && !e.busy && L.phase === "planta" && !e.narrow;
        // with a room open, the hover card keeps to the side away from it
        const away = L.selected && L.hover ? (ROOM_BOX[L.hover].x < ROOM_BOX[L.selected].x ? -1 : 1) : 1;
        place(hoverCardRef.current, onFloor && L.hover !== L.selected ? L.hover : null, cards.hover, e, dt, away);
        place(selCardRef.current, onFloor ? L.selected : null, cards.sel, e, dt);
        // a hairline from the selected room to its card
        const leader = leaderRef.current;
        if (leader && onFloor && L.selected && cards.sel.on) {
          e.projectRoom(L.selected, box);
          const size = sizes.get(selCardRef.current!) ?? { w: 360, h: 300 };
          const x0 = cards.sel.side > 0 ? box.x + box.w - 6 : box.x + 6;
          const y0 = box.y + box.h / 2;
          const x1 = cards.sel.side > 0 ? cards.sel.x : cards.sel.x + size.w;
          const y1 = Math.max(cards.sel.y + 24, Math.min(cards.sel.y + size.h - 24, y0));
          const len = Math.hypot(x1 - x0, y1 - y0);
          const a = Math.atan2(y1 - y0, x1 - x0);
          if (moved(x0, lead.x) || moved(y0, lead.y) || moved(len, lead.len) || moved(a * 100, lead.a * 100)) {
            lead.x = x0;
            lead.y = y0;
            lead.len = len;
            lead.a = a;
            leader.style.width = `${len}px`;
            leader.style.transform = `translate3d(${x0}px,${y0}px,0) rotate(${a}rad)`;
          }
        }
      },
    });
    engineRef.current = engine;
    // lab/screenshot hook: document.querySelector("[data-elo-tour]").eloEngine
    if (process.env.NODE_ENV !== "production") Object.assign(root, { eloEngine: engine });
    if (initial === "planta") engine.preloadAll();
    return () => {
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [initial]);

  // mirror the state the frame hook reads
  useEffect(() => {
    live.current = { phase, hover, selected };
  }, [phase, hover, selected]);

  // tell the page where the visitor is
  useEffect(() => {
    const detail: EloStateDetail = { state: phase };
    if (phase === "sala") detail.room = viewRoom;
    else if (phase === "planta" && selected) detail.room = selected;
    const key = JSON.stringify(detail);
    if (key === lastState.current) return;
    lastState.current = key;
    window.dispatchEvent(new CustomEvent<EloStateDetail>("elo:state", { detail }));
  }, [phase, viewRoom, selected]);

  /* ───────────── Actions ───────────── */

  const floorIntro = "Planta da Elo, em corte. Setas percorrem as salas, Enter aproxima, Esc volta à fachada.";

  function describe(id: EloRoomId) {
    const room = roomById(id);
    const spec = specialtyOf(id);
    if (!spec) return `${room.name}. ${room.note}.`;
    const next = avail?.[spec.id]?.next;
    const pros = prosOf(spec.id).map((p) => p.name).join(" e ");
    return `${room.name}, ${spec.name}, com ${pros}.${next ? ` Próximo horário: ${slotLabel(next)}.` : ""}`;
  }

  function hoverRoom(id: EloRoomId | null) {
    setHover(id);
    engineRef.current?.setHover(id && id !== selected ? id : null);
  }

  function enter(room: EloRoomId | null = null) {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setFlying(true);
    setPhase("planta");
    setDoorHot(false);
    e.setDoorHover(false);
    setSelected(room);
    setSent(null);
    e.setSelected(room);
    hoverRoom(null);
    setMessage(room ? describe(room) : floorIntro);
    e.enter(room, () => {
      setFlying(false);
      e.preloadAll();
    });
  }

  function exit() {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setFlying(true);
    setPhase("fachada");
    setSelected(null);
    e.setSelected(null);
    hoverRoom(null);
    setMessage("Fachada da Elo. Enter para entrar.");
    e.exit(() => setFlying(false));
  }

  function select(id: EloRoomId) {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setSelected(id);
    setSent(null);
    e.setSelected(id);
    e.setHover(null);
    e.focus(id);
    setMessage(`${describe(id)} Enter mostra a sala; Tab leva aos horários.`);
  }

  function deselect() {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setSelected(null);
    e.setSelected(null);
    e.focus(null);
    setMessage(floorIntro);
  }

  function openRoom(id: EloRoomId) {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setFlying(true);
    setPhase("sala");
    setViewRoom(id);
    setSent(null);
    hoverRoom(null);
    setMessage(`${roomById(id).name}. Setas trocam de sala, Esc volta à planta.`);
    e.toView(id, () => {
      setFlying(false);
      setSelected(null);
      e.setSelected(null);
    });
  }

  function switchRoom(id: EloRoomId) {
    const e = engineRef.current;
    if (!e || e.busy || id === viewRoom) return;
    setFlying(true);
    setViewRoom(id);
    setSent(null);
    setMessage(`${roomById(id).name}.`);
    e.switchView(id, () => setFlying(false));
  }

  /** Sala → planta, landing on the room, then easing back out to the whole floor. */
  function backToFloor() {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setFlying(true);
    setPhase("planta");
    setSelected(null);
    e.setSelected(null);
    setHover(viewRoom);
    e.setHover(viewRoom);
    setMessage(floorIntro);
    e.toFloor(viewRoom, true, () => setFlying(false));
  }

  /** Show a room on the floor from anywhere (the page's links use this). False while a move runs. */
  function showRoom(id: EloRoomId) {
    const e = engineRef.current;
    if (!e || e.busy) return false;
    if (phase === "fachada") {
      enter(id);
      return true;
    }
    if (phase === "sala") {
      setFlying(true);
      setPhase("planta");
      setSelected(id);
      setSent(null);
      e.setSelected(id);
      hoverRoom(null);
      setMessage(describe(id));
      e.toFloor(id, false, () => setFlying(false));
      return true;
    }
    if (flying) return false;
    select(id);
    return true;
  }

  function book(specialty: EloSpecialtyId, professionalId?: string, slot?: EloSlot) {
    const detail: EloBookDetail = { specialty };
    if (professionalId) detail.professionalId = professionalId;
    if (slot) detail.start = slot.start.toISOString();
    window.dispatchEvent(new CustomEvent<EloBookDetail>("elo:book", { detail }));
    const pro = prosOf(specialty).find((p) => p.id === professionalId);
    const note = slot && pro ? `${pro.name}, ${slotLabel(slot)}: siga no agendamento.` : "Siga no agendamento para escolher o horário.";
    setSent(note);
    setMessage(note);
  }

  const onShowRoom = useEffectEvent((room: EloRoomId) => showRoom(room));
  useEffect(() => {
    let timer = 0;
    const handler = (event: Event) => {
      const room = (event as CustomEvent<Partial<EloShowRoomDetail>>).detail?.room;
      if (!isRoomId(room)) return;
      window.clearTimeout(timer);
      let tries = 0;
      // a move in progress finishes first; then the request runs
      const attempt = () => {
        if (!onShowRoom(room) && ++tries < 20) timer = window.setTimeout(attempt, 150);
      };
      attempt();
    };
    window.addEventListener("elo:show-room", handler);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("elo:show-room", handler);
    };
  }, []);

  /* ───────────── Pointer & keyboard ───────────── */

  const local = (event: React.PointerEvent) => {
    const r = rootRef.current!.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  };
  const onUi = (event: React.SyntheticEvent) => (event.target as Element).closest?.("[data-ui]") !== null;

  function onPointerDown(event: React.PointerEvent) {
    if (onUi(event) || phase !== "planta") return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, type: event.pointerType };
  }

  function onPointerMove(event: React.PointerEvent) {
    const e = engineRef.current;
    if (!e) return;
    const d = drag.current;
    if (d.id === event.pointerId && phase === "planta") {
      const dx = event.clientX - d.x;
      const dy = event.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 7) {
        d.moved = true;
        setGrab(true);
        hoverRoom(null);
      }
      if (d.moved) {
        e.pan(dx, d.type === "touch" ? 0 : dy);
        d.x = event.clientX;
        d.y = event.clientY;
        return;
      }
    }
    if (event.pointerType !== "mouse" || flying) return;
    if (phase !== "planta" || onUi(event)) return;
    const { x, y } = local(event);
    const id = e.hit(x, y);
    if (id !== hover) hoverRoom(id);
  }

  function onPointerUp(event: React.PointerEvent) {
    const d = drag.current;
    const wasDrag = d.id === event.pointerId && d.moved;
    const mine = d.id === event.pointerId;
    drag.current = { ...d, id: -1, moved: false };
    setGrab(false);
    if (!mine || wasDrag || phase !== "planta" || flying) return;
    const e = engineRef.current;
    if (!e) return;
    const { x, y } = local(event);
    const id = e.hit(x, y);
    if (!id) {
      if (selected) deselect();
      return;
    }
    if (id === selected) return;
    select(id);
  }

  /** Nearest room in a direction (arrows), weighting distance across the direction more. */
  function neighbour(from: EloRoomId, dx: number, dy: number) {
    const a = ROOM_BOX[from];
    let best: EloRoomId | null = null;
    let score = Infinity;
    for (const id of ROOM_IDS) {
      if (id === from) continue;
      const b = ROOM_BOX[id];
      const vx = b.x - a.x;
      const vy = (b.y - a.y) * 0.565;
      const along = vx * dx + vy * dy;
      if (along <= 0.004) continue;
      const s = along + Math.abs(vx * dy - vy * dx) * 2.2;
      if (s < score) {
        score = s;
        best = id;
      }
    }
    return best;
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const self = event.target === event.currentTarget;
    const key = event.key;
    if (key === "Escape") {
      if (flying) return;
      event.preventDefault();
      if (phase === "sala") backToFloor();
      else if (phase === "planta" && selected) deselect();
      else if (phase === "planta") exit();
      rootRef.current?.focus();
      return;
    }
    if (!self || flying) return;
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (phase === "fachada" && (key === "Enter" || key === " ")) {
      event.preventDefault();
      enter();
    } else if (phase === "sala" && dir[key]) {
      event.preventDefault();
      const i = ROOM_IDS.indexOf(viewRoom);
      const step = key === "ArrowLeft" || key === "ArrowUp" ? ROOM_IDS.length - 1 : 1;
      switchRoom(ROOM_IDS[(i + step) % ROOM_IDS.length]);
    } else if (phase === "planta" && dir[key]) {
      event.preventDefault();
      const [dx, dy] = dir[key];
      if (selected) {
        const next = neighbour(selected, dx, dy);
        if (next) select(next);
      } else {
        const next = hover ? (neighbour(hover, dx, dy) ?? hover) : "recepcao";
        hoverRoom(next);
        setMessage(describe(next));
      }
    } else if (phase === "planta" && (key === "Enter" || key === " ")) {
      event.preventDefault();
      if (selected) openRoom(selected);
      else if (hover) select(hover);
      else {
        hoverRoom("recepcao");
        setMessage(describe("recepcao"));
      }
    }
  }

  /* ───────────── Render ───────────── */

  const initialImage = initial === "planta" ? ELO_MEDIA.floor : ELO_MEDIA.facade;
  const showFloorUi = phase === "planta" && !flying;
  const showSalaUi = phase === "sala" && !flying;
  const view = roomById(viewRoom);
  const viewSpec = specialtyOf(viewRoom);
  const sameModel = viewRoom.startsWith("c");

  const detail = (id: EloRoomId) => {
    const spec = specialtyOf(id);
    return (
      <RoomDetail
        id={id}
        avail={avail}
        sent={sent}
        onSlot={(pro, slot) => spec && book(spec.id, pro, slot)}
        onBook={() => spec && book(spec.id)}
        onView={() => openRoom(id)}
        onClose={deselect}
      />
    );
  };

  return (
    <section
      ref={rootRef}
      tabIndex={0}
      data-elo-tour=""
      data-phase={phase}
      data-room={phase === "sala" ? viewRoom : (selected ?? "")}
      aria-label="Tour pela Elo: Enter entra; na planta, setas percorrem as salas, Enter aproxima, Esc volta"
      aria-roledescription="tour interativo"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && hover && phase === "planta" && !drag.current.moved) hoverRoom(null);
      }}
      className={cn(
        "@container relative isolate overflow-hidden bg-el-bg font-sans text-el-ink outline-none select-none focus-visible:ring-2 focus-visible:ring-el-acc/40 focus-visible:ring-inset",
        phase === "planta" ? "touch-pan-y" : "touch-auto",
        phase === "planta" && (grab ? "cursor-grabbing" : hover ? "cursor-pointer" : "cursor-default"),
        // without WebGL the cut-away keeps its studio backdrop: match it around the picture
        fallback && phase === "planta" && "bg-[#d5d0cd]",
        className,
      )}
    >
      {/* picture layers */}
      {/* eslint-disable-next-line @next/next/no-img-element -- poster under the canvas until the first frame */}
      <img
        src={initialImage.small}
        alt=""
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700",
          initial === "planta"
            ? "object-contain px-12 pt-[96px] pb-[112px] @max-3xl:object-cover @max-3xl:px-0 @max-3xl:pt-[72px] @max-3xl:pb-[128px]"
            : "object-cover object-[6%_50%] @3xl:object-center",
          ready && "opacity-0",
        )}
      />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block h-full w-full" />
      {/* eslint-disable-next-line @next/next/no-img-element -- fallback layer, driven by the engine */}
      <img ref={imgARef} alt="" aria-hidden className="pointer-events-none absolute top-0 left-0 hidden max-w-none origin-top-left" />
      {/* eslint-disable-next-line @next/next/no-img-element -- fallback layer, driven by the engine */}
      <img ref={imgBRef} alt="" aria-hidden className="pointer-events-none absolute top-0 left-0 hidden max-w-none origin-top-left opacity-0" />
      {/* fallback outlines (no WebGL), laid over the floor by the engine */}
      <svg
        ref={svgRef}
        aria-hidden
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        className="pointer-events-none absolute top-0 left-0 hidden origin-top-left overflow-visible"
      >
        {fallback && selected && (
          <polygon points={polyPoints(selected)} fill="rgb(15 92 87 / 0.07)" stroke="#0f5c57" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        )}
        {fallback && hover && hover !== selected && (
          <polygon points={polyPoints(hover)} fill="rgb(255 255 255 / 0.1)" stroke="#0f5c57" strokeOpacity={0.75} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <p className="sr-only" role="img" aria-label={phase === "fachada" ? ELO_MEDIA.facade.alt : phase === "planta" ? ELO_MEDIA.floor.alt : view.view.alt} />

      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      {/* ── fachada ── */}
      <button
        ref={doorRef}
        type="button"
        data-ui
        tabIndex={phase === "fachada" ? 0 : -1}
        aria-label="Entrar na Elo"
        aria-hidden={phase !== "fachada"}
        onClick={() => enter()}
        onPointerEnter={() => {
          setDoorHot(true);
          engineRef.current?.setDoorHover(true);
        }}
        onPointerLeave={() => {
          setDoorHot(false);
          engineRef.current?.setDoorHover(false);
        }}
        onFocus={() => engineRef.current?.setDoorHover(true)}
        onBlur={() => engineRef.current?.setDoorHover(false)}
        className={cn(
          "group absolute top-0 left-0 z-[2] cursor-pointer rounded-[6px] outline-none",
          (phase !== "fachada" || flying) && "pointer-events-none invisible",
        )}
      >
        <span
          className={cn(
            "absolute top-[56%] left-[calc(100%+14px)] flex -translate-y-1/2 items-center gap-2.5 rounded-full border px-4 py-2.5 whitespace-nowrap shadow-[0_18px_40px_-20px_rgb(20_32_31/0.55)] backdrop-blur-xl transition-all duration-500 ease-out",
            "group-focus-visible:border-el-acc group-focus-visible:bg-el-acc group-focus-visible:text-white",
            doorHot ? "border-el-acc bg-el-acc text-white" : "border-white/70 bg-el-bg-2/85 text-el-ink",
          )}
        >
          <span className="relative grid size-2 place-items-center" aria-hidden>
            <span className={cn("absolute inset-0 rounded-full bg-el-acc-2 motion-safe:animate-ping", doorHot && "opacity-0")} />
            <span className={cn("relative size-2 rounded-full", doorHot ? "bg-white" : "bg-el-acc-2")} />
          </span>
          <span className="font-elo text-[14px] leading-none font-medium">Entrar</span>
          <span aria-hidden className={cn("transition-transform duration-500", doorHot && "translate-x-1")}>
            →
          </span>
        </span>
      </button>

      {/* ── planta ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[3]">
        <div
          ref={leaderRef}
          className={cn(
            "absolute top-0 left-0 h-px origin-left bg-gradient-to-r from-el-acc/70 to-el-acc/15 transition-opacity duration-300 @max-3xl:hidden",
            showFloorUi && selected ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          ref={hoverCardRef}
          className={cn(
            surface,
            "absolute top-0 left-0 w-[264px] px-5 py-4 transition-opacity duration-300 @max-3xl:hidden",
            showFloorUi && hover && hover !== selected ? "opacity-100" : "opacity-0",
          )}
        >
          {hover && <RoomHover id={hover} avail={avail} />}
          {hover && (
            <p className={cn(eyebrow, "mt-3.5 text-[10px] text-el-mute")}>{selected ? "Clique para trocar de sala" : "Clique para aproximar"}</p>
          )}
        </div>
      </div>

      <div
        ref={selCardRef}
        data-ui
        inert={!(showFloorUi && selected)}
        onPointerEnter={() => hover && hoverRoom(null)}
        className={cn(
          surface,
          "absolute top-0 left-0 z-[4] max-h-[calc(100%-220px)] w-[360px] overflow-y-auto px-6 py-5 transition-opacity duration-500 [scrollbar-width:thin] @max-3xl:hidden",
          showFloorUi && selected ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {selected && detail(selected)}
      </div>

      {/* bottom sheet on phones */}
      <div
        data-ui
        inert={!(showFloorUi && selected)}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[5] max-h-[58%] overflow-y-auto rounded-t-[24px] border-t border-el-line bg-el-bg-2/95 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-30px_rgb(20_32_31/0.45)] backdrop-blur-xl transition-transform duration-500 ease-out @3xl:hidden",
          showFloorUi && selected ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div aria-hidden className="mx-auto mb-4 h-1 w-10 rounded-full bg-el-ink/12" />
        {selected && detail(selected)}
      </div>

      <div
        data-ui
        inert={!showFloorUi}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[4] flex flex-col items-center gap-3 px-4 pb-6 transition-opacity duration-500 @max-3xl:px-3 @max-3xl:pb-4",
          showFloorUi ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <p className={cn("font-elo text-[13px] text-el-mute transition-opacity duration-500", selected && "opacity-0")}>
          <span className="@max-3xl:hidden">Passe o cursor pelas salas · clique para aproximar</span>
          <span className="@3xl:hidden">Toque numa sala · arraste para os lados</span>
        </p>
        <RoomBar
          label="Salas da clínica"
          active={selected}
          onRoom={(id) => (id === selected ? openRoom(id) : select(id))}
          onHover={(id) => {
            if (!selected) hoverRoom(id);
          }}
          back={{ label: "Fachada", onClick: exit, first: true }}
        />
      </div>

      {/* ── sala ── */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[52%] bg-gradient-to-t from-el-bg via-el-bg/70 to-transparent transition-opacity duration-700",
          showSalaUi ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        data-ui
        inert={!showSalaUi}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[4] flex flex-col items-start gap-5 px-[clamp(16px,3.4vw,48px)] pb-7 transition-opacity duration-500 @max-3xl:items-stretch @max-3xl:gap-4 @max-3xl:pb-4",
          showSalaUi ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="max-w-[460px]">
          <p className={cn(eyebrow, "flex items-center gap-2 text-el-acc")}>
            <i aria-hidden className="size-1.5 rounded-full bg-el-acc-2" />
            {roomKind(viewRoom)}
          </p>
          <h2 className="mt-3 font-elo text-[clamp(30px,3.6vw,46px)] leading-[1.04] font-medium tracking-[-0.025em] text-el-ink">{view.name}</h2>
          <p className="mt-2.5 text-[15px] leading-snug text-el-ink/80">
            {viewSpec ? `${prosOf(viewSpec.id).map((p) => p.name).join(" · ")} · ${view.note}` : view.note}
          </p>
          {sameModel && <p className="mt-1.5 text-[13px] text-el-mute">Os quatro consultórios seguem o mesmo projeto.</p>}
          {viewSpec && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button type="button" className={btnPrimary} onClick={() => book(viewSpec.id)}>
                Agendar {viewSpec.name.toLowerCase()} <span aria-hidden>→</span>
              </button>
              {avail?.[viewSpec.id]?.next && (
                <span className="text-[13px] text-el-mute">
                  Próximo horário:{" "}
                  <span className="font-elo font-medium text-el-acc tabular-nums">{slotLabel(avail[viewSpec.id]!.next!)}</span>
                </span>
              )}
            </div>
          )}
          {sent && phase === "sala" && (
            <p role="status" className="mt-2 text-[13px] text-el-acc">
              {sent}
            </p>
          )}
        </div>
        <RoomBar label="Ir para outra sala" active={viewRoom} onRoom={switchRoom} back={{ label: "Voltar à planta", short: "Planta", onClick: backToFloor }} className="@max-3xl:rounded-[22px]" />
      </div>
    </section>
  );
}
