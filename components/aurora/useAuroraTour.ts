"use client";

import { useEffect, useRef, useState } from "react";
import { AURORA_FEATURED, AURORA_ROOMS, AURORA_UNITS, auroraUnitOnFloor, type AuroraUnit } from "@/content/aurora";
import { reducedMotion } from "@/lib/env";
import { clamp, easeInOutCubic, lerp } from "@/lib/math";
import { placeFloorCard } from "./AuroraFloorCard";
import type { AuroraHotspotsHandle } from "./AuroraHotspots";
import type { AuroraStageHandle } from "./AuroraStage";
import {
  FACADE,
  FLOORS,
  floorBand,
  isExterior,
  roomOf,
  sceneOf,
  type AuroraRoomId,
  type AuroraScene,
  type AuroraView,
} from "./views";

/**
 * tower: the whole facade, floors light up under the pointer · floor: the camera has flown into
 * one floor and its residences are on the card · plan: the cut-away plan · room: a room photo.
 */
export type AuroraTourMode = "tower" | "floor" | "plan" | "room";
export type AuroraTime = "day" | "dusk";

export type UseAuroraTourOptions = {
  /** Floor lit on arrival (default: the featured residence's). */
  floor?: number;
  time?: AuroraTime;
  /**
   * Let the filmed moves play where they match the click exactly (plan → living, living ⇄ suite).
   * Default false: every move is the code camera plus the shader dissolve.
   */
  flourish?: boolean;
  /** Space (px) covered by UI above the stage: the floor card never goes higher. */
  top?: number;
  onMode?: (mode: AuroraTourMode) => void;
  onViewChange?: (view: AuroraView, unit: AuroraUnit) => void;
};

/** A code camera, as the stage understands it (see AuroraStageState). */
type Cam = { zoom: number; fx: number; fy: number; px: number; aim: number; tx: number; ty: number };
const cam = (): Cam => ({ zoom: 1, fx: 0.5, fy: 0.5, px: 0, aim: 0, tx: 0.5, ty: 0.5 });
/** The fitted camera (never mutated). */
const REST: Readonly<Cam> = cam();
const KEYS = ["zoom", "fx", "fy", "px", "aim", "tx", "ty"] as const;
function copy(out: Cam, c: Readonly<Cam>) {
  for (const key of KEYS) out[key] = c[key];
  return out;
}

const FLY = 0.9;
const DIVE = 0.62;

/**
 * Everything the interactive Aurora tour does, for any shell (AuroraTour, the demo page hero,
 * the homepage window): the visitor drives it. Hover lights a floor and its card follows; a
 * click (or tap, or Enter) flies the camera into that floor; "Ver residência" or a second click
 * dissolves into the plan from that floor; a hotspot flies into its room on the plan and
 * dissolves into the photo; back retraces every step. All moves are code (camera tweens on the
 * stage + its shader cuts); `reducedMotion()` turns them into cuts.
 *
 * Wire `stageProps` and `frame` into <AuroraStage>, the refs into the overlays, `onKeyDown` on
 * the focusable root.
 */
export function useAuroraTour({
  floor: initialFloor = AURORA_FEATURED.floor,
  time: initialTime = "dusk",
  flourish = false,
  top = 64,
  onMode,
  onViewChange,
}: UseAuroraTourOptions = {}) {
  const [mode, setModeState] = useState<AuroraTourMode>("tower");
  const [floor, setFloor] = useState(initialFloor);
  const [kind, setKind] = useState<AuroraUnit["type"]>("A");
  const [room, setRoom] = useState<AuroraRoomId>("living");
  const [hot, setHot] = useState<AuroraRoomId | null>(null);
  const [time, setTimeState] = useState<AuroraTime>(initialTime);
  const [wide, setWide] = useState(true);
  /** A filmed flourish is playing: overlays step aside until it lands. */
  const [flying, setFlying] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<AuroraStageHandle>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<HTMLDivElement>(null);
  const spotsRef = useRef<AuroraHotspotsHandle>(null);

  const units = AURORA_UNITS.filter((u) => u.floor === floor);
  const unit = units.find((u) => u.type === kind) ?? auroraUnitOnFloor(floor);

  // what the frame loop and the handlers need, refreshed after every render
  const live = useRef({ mode, floor, room, hot, time, wide, top, flourish, onMode, onViewChange, unit });
  useEffect(() => {
    live.current = { mode, floor, room, hot, time, wide, top, flourish, onMode, onViewChange, unit };
  });

  /** The camera director: one eased tween, re-aimed by every click. Never read during render. */
  const dir = useRef({
    cur: cam(),
    from: cam(),
    to: cam(),
    t: 1,
    dur: 1,
    then: null as (() => void) | null,
    scene: null as AuroraScene | null,
    /** Mode as the frame loop knows it (state updates land a render later). */
    mode: "tower" as AuroraTourMode,
    floor: initialFloor,
    room: "living" as AuroraRoomId,
    /** Set by adopt(): the next frame starts from whatever camera the stage has. */
    adopt: false,
    /** A dive has landed on a room's spot: keep that camera until the dissolve takes over. */
    hold: false,
    box: { x: 0, y: 0, w: 0, h: 0 },
    band: { top: 0, bottom: 0 },
    patch: {
      floor: initialFloor as number | null,
      zoom: 1,
      focus: { x: 0.5, y: 0.5 },
      pan: { x: 0, y: 0 },
      aim: 0,
      aimAt: { x: 0.5, y: 0.5 },
    },
  });

  const setMode = (next: AuroraTourMode) => {
    dir.current.mode = next;
    setModeState(next);
    live.current.onMode?.(next);
  };

  /* ───────── camera targets ───────── */

  const towerCam = (out: Cam) => {
    copy(out, REST);
    out.px = live.current.wide ? 0.5 : 0;
    return out;
  };

  /** Fly into one floor: the facade fills about half the stage (all of it on phones), card beside it. */
  const floorCam = (out: Cam, target: number) => {
    const stage = stageRef.current;
    const isWide = live.current.wide;
    towerCam(out);
    floorBand(target, dir.current.band);
    out.fx = (FACADE.left + FACADE.right) / 2;
    out.fy = (dir.current.band.top + dir.current.band.bottom) / 2;
    let zoom = isWide ? 2.2 : 2;
    if (stage && stage.size.width > 0 && isExterior(stage.state.view)) {
      stage.floorBox(target, dir.current.box);
      const atOne = dir.current.box.w / Math.max(0.5, stage.state.zoom);
      if (atOne > 1) zoom = (stage.size.width * (isWide ? 0.5 : 0.94)) / atOne;
    }
    out.zoom = clamp(zoom, 1.5, 3.4);
    out.aim = 1;
    out.tx = isWide ? 0.35 : 0.5;
    out.ty = isWide ? 0.5 : 0.34;
    return out;
  };

  const planCam = (out: Cam) => {
    copy(out, REST);
    // phones enlarge the plan a little: the four rooms stay in view, the service wing is cropped
    if (!live.current.wide) {
      out.zoom = 1.45;
      out.fx = 0.36;
    }
    return out;
  };

  /** The plan, flown into one room's spot (the dissolve to the photo starts from here). */
  const roomCam = (out: Cam, id: AuroraRoomId) => {
    planCam(out);
    const spot = roomOf(id)?.plan ?? { x: 0.5, y: 0.5 };
    out.zoom *= 2.5;
    out.fx = spot.x;
    out.fy = spot.y;
    out.aim = 1;
    out.tx = 0.5;
    out.ty = 0.46;
    return out;
  };

  const TMP = useRef(cam());

  /** Ease the camera from where it is to `target` in `seconds`, then run `then`. */
  const fly = (target: Cam, seconds: number, then: (() => void) | null = null) => {
    const d = dir.current;
    copy(d.from, d.cur);
    copy(d.to, target);
    d.t = 0;
    d.dur = reducedMotion() ? 0 : seconds;
    d.then = then;
  };
  /** Put the camera somewhere at once. */
  const jump = (target: Readonly<Cam>) => {
    const d = dir.current;
    copy(d.cur, target);
    copy(d.from, target);
    copy(d.to, target);
    d.t = 1;
    d.then = null;
  };

  /* ───────── actions ───────── */

  const go = (view: AuroraView, options?: { duration?: number; clip?: boolean }) =>
    stageRef.current?.goTo(view, { clip: false, ...options });

  /** Click, tap or Enter on a floor. */
  const select = (picked: number) => {
    const d = dir.current;
    const target = clamp(Math.round(picked), 1, FLOORS);
    if (d.mode === "floor" && target === d.floor) return openPlan();
    if (d.mode !== "tower" && d.mode !== "floor") return;
    d.floor = target;
    setFloor(target);
    setKind("A");
    fly(floorCam(TMP.current, target), d.mode === "floor" ? 0.75 : FLY);
    if (d.mode !== "floor") setMode("floor");
  };

  const hover = (hovered: number | null) => {
    // hover only browses on the whole facade; once inside a floor it takes a click to move
    if (hovered === null || dir.current.mode !== "tower") return;
    dir.current.floor = hovered;
    setFloor(hovered);
  };

  const step = (delta: number) => {
    const d = dir.current;
    const next = clamp(d.floor + delta, 1, FLOORS);
    if (next === d.floor) return;
    d.floor = next;
    setFloor(next);
    setKind("A");
    if (d.mode === "floor") fly(floorCam(TMP.current, next), 0.6);
  };

  const openPlan = (pick?: AuroraUnit) => {
    if (pick) setKind(pick.type);
    const view = stageRef.current?.state.view;
    if (view && isExterior(view)) go("plan");
  };

  const openRoom = (id: AuroraRoomId) => {
    const d = dir.current;
    const stage = stageRef.current;
    if (!stage) return;
    const now = stage.state.view;
    const film = live.current.flourish && ((now === "plan" && id === "living") || (now === "living" && id === "suite") || (now === "suite" && id === "living"));
    if (now === "plan") {
      setHot(id);
      d.room = id;
      if (film) return stage.goTo(id);
      // fly into the room's spot on the plan, then dissolve into the photo from there
      fly(roomCam(TMP.current, id), DIVE, () => {
        d.hold = true;
        go(id, { duration: 0.95 });
      });
    } else if (!isExterior(now) && now !== id) {
      d.room = id;
      if (film) stage.goTo(id);
      else go(id, { duration: 0.8 });
    }
  };

  const back = () => {
    const d = dir.current;
    const view = stageRef.current?.state.view;
    if (!view) return;
    if (d.mode === "room" || (!isExterior(view) && view !== "plan")) return go("plan");
    if (d.mode === "plan" || view === "plan") return go(live.current.time);
    if (d.mode === "floor") {
      setMode("tower");
      fly(towerCam(TMP.current), FLY);
    }
  };

  const setTime = (next: AuroraTime) => {
    setTimeState(next);
    stageRef.current?.goTo(next);
  };

  /** Back to the facade at once (e.g. a showcase scrolled back into its intro). */
  const reset = (to: number = initialFloor) => {
    const d = dir.current;
    d.floor = to;
    d.then = null;
    d.adopt = true;
    setFloor(to);
    setHot(null);
    if (d.mode !== "tower") setMode("tower");
  };

  /** Point the tour at another floor from outside (explorer, chat): back to the facade, that floor lit. */
  const show = (target: number, type?: AuroraUnit["type"]) => {
    const d = dir.current;
    d.floor = target;
    setFloor(target);
    if (type) setKind(type);
    const view = stageRef.current?.state.view;
    if (view && !isExterior(view)) go(live.current.time);
    else if (d.mode === "floor") fly(floorCam(TMP.current, target), 0.75);
  };

  /** The tour takes over a stage some other code was driving: start from its current camera. */
  const adopt = () => {
    dir.current.adopt = true;
  };

  /* ───────── stage callbacks ───────── */

  const changed = (view: AuroraView, previous: AuroraView) => {
    const d = dir.current;
    const next: AuroraTourMode = isExterior(view)
      ? isExterior(previous) || d.adopt // a reset jumps straight to the facade
        ? d.mode === "floor"
          ? "floor"
          : "tower"
        : "floor"
      : view === "plan"
        ? "plan"
        : "room";
    if (next !== d.mode) setMode(next);
    if (next !== "plan") setHot(null);
    if (next === "room") {
      d.room = view as AuroraRoomId;
      setRoom(view as AuroraRoomId);
    }
    // keyboard users: never leave the focus on a control that has just faded out
    const root = rootRef.current;
    if (root && root.contains(document.activeElement) && document.activeElement !== root) root.focus({ preventScroll: true });
    live.current.onViewChange?.(view, live.current.unit);
  };

  /** Called by the stage every frame (from your onFrame). Drives the camera and glues the card. */
  const frame = (stage: AuroraStageHandle, _time: number, dt: number) => {
    const d = dir.current;
    const view = stage.state.view;
    const scene = sceneOf(view);

    if (d.adopt) {
      // take the camera the stage has now, then ease to where this mode wants it
      d.adopt = false;
      const s = stage.state;
      d.cur.zoom = s.zoom;
      d.cur.fx = s.focus.x;
      d.cur.fy = s.focus.y;
      d.cur.px = s.pan.x;
      d.cur.aim = s.aim;
      d.cur.tx = s.aimAt.x;
      d.cur.ty = s.aimAt.y;
      d.scene = scene;
      fly(isExterior(view) ? towerCam(TMP.current) : planCam(TMP.current), FLY);
    } else if (scene !== d.scene) {
      // a cut has started: give the arriving picture its first camera
      const previous = d.scene;
      d.scene = scene;
      d.hold = false;
      if (scene === "exterior") {
        if (previous === null || d.mode === "tower") jump(towerCam(TMP.current));
        else jump(floorCam(TMP.current, d.floor)); // back from the plan: inside the floor again
      } else if (scene === "plan") {
        if (previous === "exterior") {
          // arrive a little close and settle: the push of the dissolve carries on
          jump(planCam(TMP.current));
          d.cur.zoom *= 1.22;
          fly(planCam(TMP.current), 1.3);
        } else if (previous !== null) {
          // back from a room: the plan opens up from that room's spot
          jump(roomCam(TMP.current, d.room));
          fly(planCam(TMP.current), 1.25);
        } else jump(planCam(TMP.current));
      } else {
        jump(REST);
      }
    }

    // step the tween
    if (d.t < 1) {
      d.t = d.dur <= 0 ? 1 : Math.min(1, d.t + dt / d.dur);
      const k = easeInOutCubic(d.t);
      for (const key of KEYS) d.cur[key] = lerp(d.from[key], d.to[key], k);
      if (d.t >= 1 && d.then) {
        const then = d.then;
        d.then = null;
        then();
      }
    } else if (!d.hold && !d.then) {
      // at rest: follow the mode's camera, so a resize (or a phone's first measure) reframes it
      if (scene === "exterior") {
        if (d.mode === "floor") floorCam(d.cur, d.floor);
        else if (d.mode === "tower") towerCam(d.cur);
      } else if (scene === "plan") planCam(d.cur);
    }

    if (scene === "exterior" || scene === "plan") {
      const p = d.patch;
      p.floor = d.floor;
      p.zoom = d.cur.zoom;
      p.focus.x = d.cur.fx;
      p.focus.y = d.cur.fy;
      p.pan.x = d.cur.px;
      p.pan.y = 0;
      p.aim = d.cur.aim;
      p.aimAt.x = d.cur.tx;
      p.aimAt.y = d.cur.ty;
      stage.set(p);
    }
    if (scene === "exterior") {
      if (cardRef.current) placeFloorCard(stage, cardRef.current, leaderRef.current, d.floor, { top: live.current.top });
    } else if (scene === "plan") {
      spotsRef.current?.sync(stage);
    }
  };

  /** Keyboard on the tour's root: arrows browse floors (or rooms on the plan), Enter opens, Esc goes back. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const m = dir.current.mode;
    if (event.key === "Escape") {
      if (m !== "tower") {
        event.preventDefault();
        back();
      }
      return;
    }
    // only when the tour itself has the focus: buttons and tabs keep their own keys
    if (event.target !== event.currentTarget) return;
    const up = event.key === "ArrowUp" || event.key === "ArrowRight";
    const down = event.key === "ArrowDown" || event.key === "ArrowLeft";
    if (m === "tower" || m === "floor") {
      if (up || down) {
        event.preventDefault();
        step(up ? 1 : -1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(dir.current.floor);
      }
    } else if (m === "plan") {
      if (up || down) {
        event.preventDefault();
        const i = AURORA_ROOMS.findIndex((r) => r.id === live.current.hot);
        const n = AURORA_ROOMS.length;
        setHot(AURORA_ROOMS[(i < 0 ? (up ? 0 : n - 1) : i + (up ? 1 : -1) + n) % n].id);
      } else if ((event.key === "Enter" || event.key === " ") && live.current.hot) {
        event.preventDefault();
        openRoom(live.current.hot);
      }
    }
  };

  return {
    mode,
    floor,
    unit,
    units,
    room,
    hot,
    time,
    wide,
    flying,
    rootRef,
    stageRef,
    cardRef,
    leaderRef,
    spotsRef,
    /** Spread on <AuroraStage> (add your own onFrame that calls `frame`, and onResize that calls `resized`). */
    stageProps: {
      ref: stageRef,
      clips: flourish,
      onFloorHover: hover,
      onFloorSelect: (picked: number) => select(picked),
      onViewChange: changed,
      onClip: (playing: boolean) => setFlying(playing),
    },
    resized: (width: number) => setWide(width >= 576),
    frame,
    onKeyDown,
    actions: { select, hover, step, openPlan, openRoom, back, setTime, setHot, reset, show, adopt },
  };
}

export type AuroraTourApi = ReturnType<typeof useAuroraTour>;
