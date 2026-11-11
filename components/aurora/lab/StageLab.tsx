"use client";

import { useRef } from "react";
import { labParam } from "@/lib/lab";
import { AuroraStage, type AuroraStageHandle } from "../AuroraStage";
import { AURORA_VIEWS } from "../views";

/**
 * Dev-only bench for <AuroraStage>: drives it straight from URL numbers so any state can be
 * screenshotted. /lab/showcase?s=2 scrolls here.
 *   v=0..7     view index in AURORA_VIEWS (blueprint, day, dusk, plan, living, suite, bath, varanda)
 *   from=0..7  with mix=0..1: freeze a cut from → v at that progress
 *   build, dusk, floor, zoom, panx, pany, fx, fy   the matching state fields
 *   floors=1   draw the measured slab lines over the facade; nogl=1 forces the <img> fallback
 */
export function StageLab() {
  const done = useRef(false);

  const frame = (stage: AuroraStageHandle) => {
    const v = labParam("v");
    const from = labParam("from");
    const mix = labParam("mix");
    const view = AURORA_VIEWS[v ?? 2] ?? "dusk";
    if (from !== null && mix !== null) {
      // show the outgoing picture first so its camera is the one the cut leaves from
      if (!done.current) {
        stage.set({ view: AURORA_VIEWS[from] ?? "dusk", floor: labParam("floor") });
        done.current = true;
      }
      stage.set({ view, from: AURORA_VIEWS[from] ?? "dusk", mix });
    } else if (!done.current || stage.state.view !== view) {
      stage.set({ view });
      done.current = true;
    }
    const build = labParam("build");
    const dusk = labParam("dusk");
    const zoom = labParam("zoom");
    if (build !== null) stage.set({ build });
    if (dusk !== null) stage.set({ dusk });
    if (zoom !== null) stage.set({ zoom, focus: { x: labParam("fx") ?? 0.5, y: labParam("fy") ?? 0.5 } });
    stage.set({ floor: labParam("floor"), pan: { x: labParam("panx") ?? 0, y: labParam("pany") ?? 0 } });
  };

  return (
    <section id="lab-stage" className="relative h-svh">
      <AuroraStage onFrame={frame} />
    </section>
  );
}
