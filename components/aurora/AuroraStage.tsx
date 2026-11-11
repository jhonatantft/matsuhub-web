"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/cn";
import {
  createAuroraStage,
  DEFAULT_STAGE_STATE,
  type AuroraInsets,
  type AuroraStageCore,
  type AuroraStageHandle,
  type AuroraStageLive,
  type AuroraStagePatch,
} from "./stage-core";
import { imageOf, type AuroraScene, type AuroraView, type Box, type Point } from "./views";

export type {
  AuroraCamera,
  AuroraGoToOptions,
  AuroraInsets,
  AuroraStageHandle,
  AuroraStagePatch,
  AuroraStageState,
} from "./stage-core";

export type AuroraStageProps = {
  ref?: React.Ref<AuroraStageHandle>;
  /** State on mount, e.g. `{ view: "blueprint" }` or `{ view: "dusk", floor: 18 }`. Read once. */
  initial?: AuroraStagePatch;
  /** Let the pointer pick floors on the exterior (reports through onFloorHover / onFloorSelect). */
  interactive?: boolean;
  /**
   * Per-scene space (CSS px) covered by your own UI. The plan is fitted inside what is left;
   * photographs keep their focus point in the middle of it.
   */
  padding?: Partial<Record<AuroraScene, AuroraInsets>>;
  /** Pictures to fetch ahead, in order, once the stage is near the viewport. Default: every view. */
  preload?: readonly AuroraView[];
  /** Server-render the initial picture as an <img> under the canvas (for a stage that is the page's hero). */
  poster?: boolean;
  onFloorHover?: (floor: number | null) => void;
  onFloorSelect?: (floor: number, info: { pointerType: string }) => void;
  /** A cut (or exterior tween) towards `view` has started. */
  onViewChange?: (view: AuroraView, previous: AuroraView) => void;
  /** The cut has finished and `view` is the only picture on stage. */
  onSettle?: (view: AuroraView) => void;
  onResize?: (width: number, height: number) => void;
  /**
   * Runs inside the stage's frame, right before it draws: `set()` what the frame should show,
   * then `project()` your overlays — both land on the same frame as the picture.
   */
  onFrame?: (stage: AuroraStageHandle, time: number, dt: number) => void;
  /**
   * Let goTo() play the filmed camera moves (content/aurora-video.ts) between the stills that have
   * one — dusk ⇄ plan ⇄ living ⇄ suite — instead of the shader cut. Default true.
   */
  clips?: boolean;
  /** A clip played by goTo() starts (`true`) or has handed over to its still (`false`): hide overlays meanwhile. */
  onClip?: (playing: boolean, from: AuroraView, to: AuroraView) => void;
  className?: string;
  /** Overlays. They sit above the picture and share its box, so `project()` px map 1:1 to `left/top`. */
  children?: React.ReactNode;
};

/**
 * Full-bleed stage for the Aurora pictures: blueprint → photo "build", day → dusk, floor
 * highlight and cinematic cuts between tower, plan and rooms. WebGL (plain three.js, loaded on
 * demand) with an <img> cross-fade fallback. It fills its nearest positioned ancestor
 * (`absolute inset-0`); drive it through the ref (`set`, `goTo`, `project`…). It only touches
 * the DOM inside effects, so it can be imported directly — no `next/dynamic` needed.
 */
export function AuroraStage({
  ref,
  initial,
  interactive = false,
  padding,
  preload,
  poster = false,
  onFloorHover,
  onFloorSelect,
  onViewChange,
  onSettle,
  onResize,
  onFrame,
  clips = true,
  onClip,
  className,
  children,
}: AuroraStageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<AuroraStageCore | null>(null);
  const initialRef = useRef(initial);
  const liveRef = useRef<AuroraStageLive>({ interactive });

  // Keep the engine's view of the props fresh without re-creating it.
  useEffect(() => {
    liveRef.current = {
      interactive,
      padding,
      preload,
      onFloorHover,
      onFloorSelect,
      onViewChange,
      onSettle,
      onResize,
      onFrame,
      clips,
      onClip,
    };
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const layer = layerRef.current;
    if (!wrap || !layer) return;
    const core = createAuroraStage(wrap, layer, liveRef, initialRef.current);
    coreRef.current = core;
    return () => {
      coreRef.current = null;
      core.destroy();
    };
  }, []);

  useImperativeHandle(
    ref,
    (): AuroraStageHandle => ({
      set: (patch) => coreRef.current?.set(patch),
      goTo: (view, options) => coreRef.current?.goTo(view, options),
      project: (point, out = { x: 0, y: 0 }) => coreRef.current?.project(point, out) ?? out,
      unproject: (px, out = { x: 0, y: 0 }) => coreRef.current?.unproject(px, out) ?? out,
      floorAt: (px: Point) => coreRef.current?.floorAt(px) ?? null,
      floorBox: (floor, out: Box = { x: 0, y: 0, w: 0, h: 0 }) => coreRef.current?.floorBox(floor, out) ?? out,
      loaded: (view) => coreRef.current?.loaded(view) ?? false,
      preload: (views) => coreRef.current?.preload(views),
      primeClip: (from, to) => coreRef.current?.primeClip(from, to) ?? false,
      scrub: (from, to, progress, cameras) => coreRef.current?.scrub(from, to, progress, cameras) ?? false,
      get state() {
        return coreRef.current?.state ?? DEFAULT_STAGE_STATE;
      },
      get size() {
        return coreRef.current?.size ?? ZERO_SIZE;
      },
      get cutting() {
        return coreRef.current?.cutting ?? false;
      },
      get clipping() {
        return coreRef.current?.clipping ?? false;
      },
    }),
    [],
  );

  const first = imageOf(initial?.view ?? DEFAULT_STAGE_STATE.view);

  return (
    <div
      ref={wrapRef}
      data-aurora-stage=""
      className={cn("absolute inset-0 isolate overflow-hidden bg-au-bg", className)}
    >
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element -- a plain poster under the canvas: the texture loader fetches the same file
        <img
          src={first.small}
          alt=""
          aria-hidden
          decoding="async"
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0" />
      {children}
    </div>
  );
}

const ZERO_SIZE = { width: 0, height: 0 } as const;
