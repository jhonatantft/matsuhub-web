"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { MARE_MEDIA, MARE_TABLES, type MareZoneId } from "@/content/mare";
import { cn } from "@/lib/cn";
import { damp } from "@/lib/math";
import {
  DOOR,
  ITEMS,
  isZoneItem,
  partyLabel,
  shapeOf,
  statusOf,
  tableById,
  zoneById,
  zoneItem,
  zoneOfItem,
  TABLE_IDS,
  type ItemId,
  type Slot,
} from "./data";
import { createMareEngine, type MareEngine } from "./engine";
import { ControlStrip, ItemBody, ViewBar, btnGhost, btnPrimary, eyebrow, glass, statusText } from "./parts";

export type MareTourState = "fachada" | "salao" | "vista";

export type MareReserveDetail = { tableId: string; label: string; seats: number; zone: string; slot: string; party: number };
export type MareStateDetail = { state: MareTourState; zone?: string; tableId?: string };

const ZONE_IDS = ["janela", "salao", "balcao", "bar", "terraco", "adega"] as const;

/**
 * The Maré tour, the restaurant demo's hero. Fills its parent (the parent sets the height).
 *
 * fachada  the facade photo; the open door is a hotspot (hover lights it, click/Enter walks in)
 * salao    the cut-away model as an interactive map: every table and zone answers to hover with a
 *          ring + card; click zooms the camera onto it; party size and time slot dim the tables
 *          that do not fit or are taken
 * vista    the photo from a zone ("sitting down" at the table); a bar jumps between zones
 *
 * Window events — dispatches `mare:reserve` and `mare:state`; listens to `mare:show-table` and
 * `mare:show-zone` (see the types above). Keyboard: arrows move, Enter opens, Esc goes back.
 */
export function SalonTour({ className, initial = "fachada" }: { className?: string; initial?: "fachada" | "salao" }) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);
  const doorRef = useRef<HTMLButtonElement>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const selCardRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MareEngine | null>(null);
  const live = useRef({ phase: initial as MareTourState, hover: null as ItemId | null, selected: null as ItemId | null, flying: false });
  const lastState = useRef("");
  const drag = useRef({ id: -1, x: 0, y: 0, moved: false, type: "mouse" });

  const [phase, setPhase] = useState<MareTourState>(initial);
  const [flying, setFlying] = useState(false);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<ItemId | null>(null);
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [viewZone, setViewZone] = useState<MareZoneId>("janela");
  const [viewTable, setViewTable] = useState<string | null>(null);
  const [party, setParty] = useState(2);
  const [slot, setSlot] = useState<Slot>("20h");
  const [doorHot, setDoorHot] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [grab, setGrab] = useState(false);

  /* ───────────── Engine ───────────── */

  useEffect(() => {
    const root = rootRef.current!;
    const box = { x: 0, y: 0, w: 0, h: 0 };
    const sizes = new Map<Element, { w: number; h: number }>();
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) sizes.set(e.target, { w: e.borderBoxSize[0].inlineSize, h: e.borderBoxSize[0].blockSize });
    });
    for (const el of [hoverCardRef.current, selCardRef.current]) if (el) ro.observe(el);
    const cards = {
      hover: { x: 0, y: 0, on: false, key: "" },
      sel: { x: 0, y: 0, on: false, key: "", side: 1 },
    };
    let last = 0;
    let doorKey = "";

    /** Put a card beside an item: to its right, or its left when there is no room. Eased, so it follows. */
    function place(el: HTMLElement | null, id: ItemId | null, st: { x: number; y: number; on: boolean; key: string }, e: MareEngine, dt: number) {
      if (!el) return 1;
      if (!id) {
        st.on = false;
        return 1;
      }
      const size = sizes.get(el) ?? { w: el.offsetWidth, h: el.offsetHeight };
      const { width: W, height: H } = e.size;
      e.projectShape(shapeOf(id), box);
      const gap = 22;
      let side = 1;
      let x = box.x + box.w + gap;
      if (x + size.w > W - 20) {
        side = -1;
        x = box.x - gap - size.w;
      }
      x = Math.max(20, Math.min(W - 20 - size.w, x));
      const y = Math.max(84, Math.min(H - 124 - size.h, box.y + box.h / 2 - size.h / 2));
      if (!st.on) {
        st.x = x;
        st.y = y;
        st.on = true;
      } else {
        st.x = damp(st.x, x, 16, dt);
        st.y = damp(st.y, y, 16, dt);
      }
      const key = `${st.x.toFixed(1)},${st.y.toFixed(1)}`;
      if (key !== st.key) {
        st.key = key;
        el.style.transform = `translate3d(${st.x}px,${st.y}px,0)`;
      }
      return side;
    }

    const engine = createMareEngine({
      root,
      canvas: canvasRef.current!,
      imgA: imgARef.current!,
      imgB: imgBRef.current!,
      initial: initial === "salao" ? "salon" : "facade",
      onReady: () => setReady(true),
      onFrame: (e) => {
        const dt = Math.min(0.1, Math.max(0, e.clock - last)) || 1;
        last = e.clock;
        const L = live.current;
        // the door hotspot follows the facade camera
        const door = doorRef.current;
        if (door && e.scene === "facade") {
          e.projectShape(DOOR, box);
          const key = `${box.x.toFixed(1)},${box.y.toFixed(1)},${box.w.toFixed(1)},${box.h.toFixed(1)}`;
          if (key !== doorKey) {
            doorKey = key;
            door.style.transform = `translate3d(${box.x}px,${box.y}px,0)`;
            door.style.width = `${box.w}px`;
            door.style.height = `${box.h}px`;
          }
        }
        const onSalon = e.scene === "salon" && !e.busy && L.phase === "salao";
        place(hoverCardRef.current, onSalon && L.hover !== L.selected ? L.hover : null, cards.hover, e, dt);
        const side = place(selCardRef.current, onSalon ? L.selected : null, cards.sel, e, dt);
        // a hairline from the selected item to its card
        const leader = leaderRef.current;
        if (leader && onSalon && L.selected && cards.sel.on) {
          e.projectShape(shapeOf(L.selected), box);
          const size = sizes.get(selCardRef.current!) ?? { w: 320, h: 200 };
          const x0 = side > 0 ? box.x + box.w + 4 : box.x - 4;
          const y0 = box.y + box.h / 2;
          const x1 = side > 0 ? cards.sel.x : cards.sel.x + size.w;
          const y1 = Math.max(cards.sel.y + 18, Math.min(cards.sel.y + size.h - 18, y0));
          const len = Math.hypot(x1 - x0, y1 - y0);
          const angle = Math.atan2(y1 - y0, x1 - x0);
          leader.style.width = `${len}px`;
          leader.style.transform = `translate3d(${x0}px,${y0}px,0) rotate(${angle}rad)`;
        }
      },
    });
    engineRef.current = engine;
    // lab/screenshot hook: document.querySelector("[data-phase]").mareEngine
    if (process.env.NODE_ENV !== "production") Object.assign(root, { mareEngine: engine });
    if (initial === "salao") engine.preloadAll();
    return () => {
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [initial]);

  // mirror the state the frame hook reads
  useEffect(() => {
    live.current = { phase, hover, selected, flying };
  }, [phase, hover, selected, flying]);

  // tables that fit the party and are free at that time light up; the others dim
  useEffect(() => {
    engineRef.current?.setFit(TABLE_IDS.map((id) => (statusOf(tableById(id)!, party, slot) === "livre" ? 1 : 0)));
  }, [party, slot]);

  // tell the page where the visitor is
  useEffect(() => {
    const detail: MareStateDetail = { state: phase };
    if (phase === "vista") {
      detail.zone = viewZone;
      if (viewTable) detail.tableId = viewTable;
    } else if (phase === "salao" && selected) {
      detail.zone = zoneOfItem(selected);
      if (!isZoneItem(selected)) detail.tableId = selected;
    }
    const key = JSON.stringify(detail);
    if (key === lastState.current) return;
    lastState.current = key;
    window.dispatchEvent(new CustomEvent<MareStateDetail>("mare:state", { detail }));
  }, [phase, viewZone, viewTable, selected]);

  /* ───────────── Actions ───────────── */

  const freeCount = MARE_TABLES.filter((t) => statusOf(t, party, slot) === "livre").length;
  const salonIntro = `Salão do Maré, em corte. ${freeCount} mesas livres às ${slot} para ${partyLabel(party)}. Setas percorrem as mesas, Enter aproxima, Esc volta.`;

  function selectable(id: ItemId) {
    if (isZoneItem(id)) return true;
    return statusOf(tableById(id)!, party, slot) === "livre";
  }

  function describe(id: ItemId) {
    if (isZoneItem(id)) {
      const zone = zoneById(id.slice(5) as MareZoneId);
      return `${zone.name}. ${zone.note}.`;
    }
    const t = tableById(id)!;
    return `${t.label}, ${t.seats} lugares. ${statusText(t, party, slot).text}.`;
  }

  function hoverItem(id: ItemId | null) {
    setHover(id);
    engineRef.current?.setHover(id && id !== selected ? id : null);
  }

  function enter(item: ItemId | null = null) {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setFlying(true);
    setPhase("salao");
    setDoorHot(false);
    e.setDoorHover(false);
    setSelected(item);
    e.setSelected(item);
    hoverItem(null);
    setMessage(item ? `${describe(item)}` : salonIntro);
    e.enter(item, () => {
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
    hoverItem(null);
    setMessage("Fachada do Maré. Enter para entrar.");
    e.exit(() => setFlying(false));
  }

  function select(id: ItemId, force = false) {
    const e = engineRef.current;
    if (!e || e.busy) return;
    if (!force && !selectable(id)) {
      setMessage(describe(id));
      return;
    }
    setSelected(id);
    setSent(null);
    e.setSelected(id);
    e.setHover(null);
    e.focus(id);
    setMessage(`${describe(id)} ${isZoneItem(id) ? "Enter mostra o ambiente." : "Tab leva às ações da mesa."}`);
  }

  function deselect() {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setSelected(null);
    e.setSelected(null);
    e.focus(null);
    setMessage(salonIntro);
  }

  function openView(zone: MareZoneId, from: ItemId | null) {
    const e = engineRef.current;
    if (!e || e.busy) return;
    setFlying(true);
    setPhase("vista");
    setViewZone(zone);
    setViewTable(from && !isZoneItem(from) ? from : null);
    hoverItem(null);
    setMessage(`Vista: ${zoneById(zone).name}. Setas trocam o ambiente, Esc volta ao salão.`);
    e.toView(zone, from, () => {
      setFlying(false);
      setSelected(null);
      e.setSelected(null);
    });
  }

  function switchView(zone: MareZoneId) {
    const e = engineRef.current;
    if (!e || e.busy || zone === viewZone) return;
    setFlying(true);
    setViewZone(zone);
    if (viewTable && tableById(viewTable)!.zone !== zone) setViewTable(null);
    setMessage(`Vista: ${zoneById(zone).name}.`);
    e.switchView(zone, () => setFlying(false));
  }

  /** Vista → salão, landing on the table (or zone) the view belongs to, then easing back out. */
  function backToSalon() {
    const e = engineRef.current;
    if (!e || e.busy) return;
    const item = viewTable ?? zoneItem(viewZone);
    setFlying(true);
    setPhase("salao");
    setSelected(null);
    e.setSelected(null);
    setHover(item);
    e.setHover(item);
    setMessage(salonIntro);
    e.toSalon(item, true, () => setFlying(false));
  }

  /** Show an item on the map from anywhere (the page's links use this). */
  function showItem(id: ItemId) {
    const e = engineRef.current;
    if (!e) return;
    if (e.busy) return;
    if (phase === "fachada") return enter(id);
    if (phase === "vista") {
      setFlying(true);
      setPhase("salao");
      setSelected(id);
      e.setSelected(id);
      hoverItem(null);
      setMessage(describe(id));
      e.toSalon(id, false, () => setFlying(false));
      return;
    }
    select(id, true);
  }

  function reserve(tableId: string) {
    const t = tableById(tableId);
    if (!t) return;
    const detail: MareReserveDetail = { tableId: t.id, label: t.label, seats: t.seats, zone: t.zone, slot, party };
    window.dispatchEvent(new CustomEvent<MareReserveDetail>("mare:reserve", { detail }));
    setSent(t.id);
    setMessage(`${t.label} às ${slot} para ${partyLabel(party)}: siga para a reserva.`);
  }

  const onShowTable = useEffectEvent((event: Event) => {
    const id = (event as CustomEvent<{ tableId?: string }>).detail?.tableId;
    if (id && tableById(id)) showItem(id);
  });
  const onShowZone = useEffectEvent((event: Event) => {
    const zone = (event as CustomEvent<{ zone?: string }>).detail?.zone;
    if (zone && (ZONE_IDS as readonly string[]).includes(zone)) showItem(zoneItem(zone as MareZoneId));
  });
  useEffect(() => {
    const table = (event: Event) => onShowTable(event);
    const zone = (event: Event) => onShowZone(event);
    window.addEventListener("mare:show-table", table);
    window.addEventListener("mare:show-zone", zone);
    return () => {
      window.removeEventListener("mare:show-table", table);
      window.removeEventListener("mare:show-zone", zone);
    };
  }, []);

  /* ───────────── Pointer & keyboard ───────────── */

  const local = (event: React.PointerEvent) => {
    const r = rootRef.current!.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  };
  const onUi = (event: React.SyntheticEvent) => (event.target as Element).closest?.("[data-ui]") !== null;

  function onPointerDown(event: React.PointerEvent) {
    if (onUi(event) || phase !== "salao") return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, type: event.pointerType };
  }

  function onPointerMove(event: React.PointerEvent) {
    const e = engineRef.current;
    if (!e) return;
    const d = drag.current;
    if (d.id === event.pointerId && phase === "salao") {
      const dx = event.clientX - d.x;
      const dy = event.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 7) {
        d.moved = true;
        setGrab(true);
        hoverItem(null);
      }
      if (d.moved) {
        e.pan(dx, d.type === "touch" ? 0 : dy);
        d.x = event.clientX;
        d.y = event.clientY;
        return;
      }
    }
    if (event.pointerType !== "mouse" || flying) return;
    if (phase !== "salao" || onUi(event)) {
      if (hover) hoverItem(null);
      return;
    }
    const { x, y } = local(event);
    const id = e.hit(x, y);
    if (id !== hover) hoverItem(id);
  }

  function onPointerUp(event: React.PointerEvent) {
    const d = drag.current;
    const wasDrag = d.id === event.pointerId && d.moved;
    const mine = d.id === event.pointerId;
    drag.current = { ...d, id: -1, moved: false };
    setGrab(false);
    if (!mine || wasDrag || phase !== "salao" || flying) return;
    const e = engineRef.current;
    if (!e) return;
    const { x, y } = local(event);
    const id = e.hit(x, y);
    if (!id) {
      if (selected) deselect();
      return;
    }
    if (id === selected) {
      if (isZoneItem(id) || selectable(id)) openView(zoneOfItem(id), id);
      return;
    }
    select(id);
  }

  /** Nearest item in a direction (arrows), weighting distance across the direction more. */
  function neighbour(from: ItemId | null, dx: number, dy: number, filter: (id: ItemId) => boolean) {
    if (!from) return ITEMS.find(filter) ?? null;
    const a = shapeOf(from);
    let best: ItemId | null = null;
    let score = Infinity;
    for (const id of ITEMS) {
      if (id === from || !filter(id)) continue;
      const b = shapeOf(id);
      const vx = b.x - a.x;
      const vy = (b.y - a.y) * 0.5655;
      const along = vx * dx + vy * dy;
      if (along <= 0.004) continue;
      const s = along + Math.abs(vx * dy - vy * dx) * 2.4;
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
      if (phase === "vista") backToSalon();
      else if (phase === "salao" && selected) deselect();
      else if (phase === "salao") exit();
      rootRef.current?.focus();
      return;
    }
    if (!self || flying) return;
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (phase === "fachada" && (key === "Enter" || key === " ")) {
      event.preventDefault();
      enter();
    } else if (phase === "vista" && (key === "ArrowLeft" || key === "ArrowRight")) {
      event.preventDefault();
      const i = ZONE_IDS.indexOf(viewZone);
      switchView(ZONE_IDS[(i + (key === "ArrowLeft" ? ZONE_IDS.length - 1 : 1)) % ZONE_IDS.length]);
    } else if (phase === "salao" && dir[key]) {
      event.preventDefault();
      const [dx, dy] = dir[key];
      if (selected) {
        const next = neighbour(selected, dx, dy, selectable);
        if (next) select(next);
      } else {
        const next = neighbour(hover ?? "J3", dx, dy, () => true) ?? hover ?? "J3";
        hoverItem(next);
        setMessage(describe(next));
      }
    } else if (phase === "salao" && (key === "Enter" || key === " ")) {
      event.preventDefault();
      if (selected) openView(zoneOfItem(selected), selected);
      else if (hover) select(hover);
      else hoverItem("J3");
    }
  }

  /* ───────────── Render ───────────── */

  const initialImage = initial === "salao" ? MARE_MEDIA.salon : MARE_MEDIA.facade;
  const showSalonUi = phase === "salao" && !flying;
  const selTable = selected && !isZoneItem(selected) ? tableById(selected)! : null;
  const selFree = selTable ? statusOf(selTable, party, slot) === "livre" : false;
  const hoverBlocked = hover && !isZoneItem(hover) && !selectable(hover);
  const viewT = viewTable ? tableById(viewTable)! : null;
  const zoneInfo = zoneById(viewZone);

  const selActions = selected && (
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" className={btnGhost} onClick={() => openView(zoneOfItem(selected), selected)}>
        {selTable ? "Ver a vista desta mesa" : "Ver o ambiente"}
      </button>
      {selTable && (
        <button type="button" className={btnPrimary} disabled={!selFree} onClick={() => reserve(selTable.id)}>
          Reservar esta mesa
        </button>
      )}
    </div>
  );
  const sentNote = selTable && sent === selTable.id && (
    <p role="status" className="mt-3 text-[12px] text-ma-ember">
      Pedido iniciado: {selTable.label}, {slot}, {partyLabel(party)}.
    </p>
  );

  return (
    <section
      ref={rootRef}
      tabIndex={0}
      aria-label="Tour pelo Maré: Enter entra; no salão, setas percorrem as mesas, Enter aproxima, Esc volta"
      aria-roledescription="tour interativo"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && hover && phase === "salao" && !drag.current.moved) hoverItem(null);
      }}
      data-phase={phase}
      className={cn(
        "@container relative isolate overflow-hidden bg-ma-bg font-sans text-ma-ink outline-none select-none focus-visible:ring-1 focus-visible:ring-ma-ember/50 focus-visible:ring-inset",
        phase === "salao" ? "touch-pan-y" : "touch-auto",
        phase === "salao" && (grab ? "cursor-grabbing" : hover ? (hoverBlocked ? "cursor-not-allowed" : "cursor-pointer") : "cursor-default"),
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
          initial === "salao" ? "object-contain px-12 pt-[84px] pb-[112px] @max-3xl:object-cover @max-3xl:pt-[68px] @max-3xl:pb-[156px]" : "object-cover",
          ready && "opacity-0",
        )}
      />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block h-full w-full" />
      {/* eslint-disable-next-line @next/next/no-img-element -- fallback layer, driven by the engine */}
      <img ref={imgARef} alt="" aria-hidden className="pointer-events-none absolute top-0 left-0 hidden max-w-none origin-top-left [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_2.5%,#000_97.5%,transparent),linear-gradient(to_bottom,transparent,#000_4%,#000_96%,transparent)]" />
      {/* eslint-disable-next-line @next/next/no-img-element -- fallback layer, driven by the engine */}
      <img ref={imgBRef} alt="" aria-hidden className="pointer-events-none absolute top-0 left-0 hidden max-w-none origin-top-left [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_2.5%,#000_97.5%,transparent),linear-gradient(to_bottom,transparent,#000_4%,#000_96%,transparent)] opacity-0" />
      <p className="sr-only" role="img" aria-label={phase === "fachada" ? MARE_MEDIA.facade.alt : phase === "salao" ? MARE_MEDIA.salon.alt : zoneInfo.view.alt} />

      <p className="sr-only" aria-live="polite">
        {message}
      </p>

      {/* ── fachada ── */}
      <button
        ref={doorRef}
        type="button"
        data-ui
        tabIndex={phase === "fachada" ? 0 : -1}
        aria-label="Entrar no Maré"
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
          "group absolute top-0 left-0 z-[2] cursor-pointer outline-none",
          (phase !== "fachada" || flying) && "pointer-events-none invisible",
        )}
      >
        <span
          className={cn(
            glass,
            "absolute bottom-[16%] left-[65%] flex -translate-x-1/2 items-center gap-3 px-5 py-3 whitespace-nowrap transition-all duration-500 ease-out",
            "group-focus-visible:border-ma-ember group-focus-visible:bg-ma-ember group-focus-visible:text-ma-bg",
            doorHot ? "border-ma-ember bg-ma-ember text-ma-bg" : "text-ma-ink",
          )}
        >
          <span className={cn(eyebrow, "tracking-[0.3em]")}>Entrar</span>
          <span aria-hidden className={cn("transition-transform duration-500", doorHot && "translate-x-1")}>
            →
          </span>
        </span>
      </button>

      {/* ── salão ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[3]">
        <div
          ref={leaderRef}
          className={cn(
            "absolute top-0 left-0 h-px origin-left bg-gradient-to-r from-ma-ember/80 to-ma-ember/20 transition-opacity duration-300 @max-3xl:hidden",
            showSalonUi && selected ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          ref={hoverCardRef}
          className={cn(
            glass,
            "absolute top-0 left-0 w-[244px] px-5 py-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] transition-opacity duration-300 @max-3xl:hidden",
            showSalonUi && hover && hover !== selected ? "opacity-100" : "opacity-0",
          )}
        >
          {hover && <ItemBody id={hover} party={party} slot={slot} />}
          {hover && (
            <p className={cn(eyebrow, "mt-4 border-t border-ma-line pt-3 text-ma-mute")}>
              {hoverBlocked ? "Mude pessoas ou horário" : "Clique para aproximar"}
            </p>
          )}
        </div>
      </div>

      <div
        ref={selCardRef}
        data-ui
        inert={!(showSalonUi && selected)}
        className={cn(
          glass,
          "absolute top-0 left-0 z-[4] w-[320px] px-6 py-5 shadow-[0_30px_80px_-24px_rgb(0_0_0/0.85)] transition-opacity duration-500 @max-3xl:hidden",
          showSalonUi && selected ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {selected && (
          <>
            <button
              type="button"
              onClick={deselect}
              aria-label="Fechar e voltar ao salão inteiro"
              className="absolute top-3 right-3 grid size-8 place-items-center text-ma-mute transition-colors hover:text-ma-ember focus-visible:outline-1 focus-visible:outline-ma-ember"
            >
              ×
            </button>
            <ItemBody id={selected} party={party} slot={slot} large />
            {selActions}
            {sentNote}
          </>
        )}
      </div>

      {/* bottom sheet on phones */}
      <div
        data-ui
        inert={!(showSalonUi && selected)}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[5] border-t border-ma-line bg-ma-bg/92 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-500 ease-out @3xl:hidden",
          showSalonUi && selected ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div aria-hidden className="mx-auto mb-4 h-[3px] w-10 rounded-full bg-ma-line" />
        {selected && (
          <div className="relative">
            <button
              type="button"
              onClick={deselect}
              aria-label="Fechar"
              className="absolute -top-2 right-0 grid size-9 place-items-center text-lg text-ma-mute"
            >
              ×
            </button>
            <ItemBody id={selected} party={party} slot={slot} />
            {selActions}
            {sentNote}
          </div>
        )}
      </div>

      <div
        data-ui
        inert={!showSalonUi}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[4] flex flex-col items-center gap-3 px-4 pb-6 transition-opacity duration-500 @max-3xl:pb-4",
          showSalonUi ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <p
          className={cn(
            eyebrow,
            "text-ma-mute/90 transition-opacity duration-500 [text-shadow:0_1px_8px_rgb(0_0_0/0.9)]",
            selected && "opacity-0",
          )}
        >
          <span className="@max-3xl:hidden">Passe o cursor pelas mesas · clique para aproximar</span>
          <span className="@3xl:hidden">Toque numa mesa · arraste para os lados</span>
        </p>
        <ControlStrip
          party={party}
          slot={slot}
          onParty={(n) => {
            setParty(n);
            setSent(null);
          }}
          onSlot={(s) => {
            setSlot(s);
            setSent(null);
          }}
          onExit={exit}
        />
      </div>

      {/* ── vista ── */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[46%] bg-gradient-to-t from-ma-bg/90 via-ma-bg/45 to-transparent transition-opacity duration-700",
          phase === "vista" && !flying ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        data-ui
        inert={!(phase === "vista" && !flying)}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[4] flex items-end justify-between gap-6 px-[clamp(16px,3vw,40px)] pb-6 transition-opacity duration-500 @max-3xl:flex-col @max-3xl:items-stretch @max-3xl:gap-4 @max-3xl:pb-4",
          phase === "vista" && !flying ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="max-w-[440px] [text-shadow:0_2px_18px_rgb(0_0_0/0.85)]">
          <p className={cn(eyebrow, "text-ma-ember")}>{viewT ? `Vista · ${viewT.label}` : "Vista"}</p>
          <h2 className="mt-2 font-mare text-[clamp(34px,4.4vw,56px)] leading-[0.98] text-ma-ink italic">{zoneInfo.name}</h2>
          <p className="mt-2 text-[14px] leading-snug text-ma-ink/80">{zoneInfo.note}</p>
          {viewT && statusOf(viewT, party, slot) === "livre" && (
            <div className="mt-4 flex items-center gap-3">
              <button type="button" className={btnPrimary} onClick={() => reserve(viewT.id)}>
                Reservar esta mesa
              </button>
              <span className="text-[12px] text-ma-ink/70">
                {slot} · {partyLabel(party)}
              </span>
            </div>
          )}
          {viewT && sent === viewT.id && (
            <p role="status" className="mt-2 text-[12px] text-ma-ember">
              Pedido iniciado: {viewT.label}, {slot}, {partyLabel(party)}.
            </p>
          )}
        </div>
        <ViewBar zone={viewZone} onZone={switchView} onBack={backToSalon} />
      </div>
    </section>
  );
}
