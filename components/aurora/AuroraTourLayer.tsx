"use client";

import { AURORA_TYPES } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { AuroraFloorCard, AuroraLeader } from "./AuroraFloorCard";
import { AuroraHotspots } from "./AuroraHotspots";
import { AuroraRoomBar } from "./AuroraRoomBar";
import type { AuroraTourApi } from "./useAuroraTour";
import { ordinalFloor, roomOf } from "./views";

/**
 * The overlays every interactive tour shares, driven by useAuroraTour: the floor card and its
 * leader (tower and floor), the plan hotspots and the room bar. Put it inside <AuroraStage>.
 * `card: false` hides the card (e.g. a phone hero that shows its intro first).
 */
export function AuroraTourLayer({
  tour,
  card = true,
  cardClassName,
}: {
  tour: AuroraTourApi;
  card?: boolean;
  cardClassName?: string;
}) {
  const { mode, unit, units, room, hot, floor, flying, cardRef, leaderRef, spotsRef, actions } = tour;
  const outside = mode === "tower" || mode === "floor";
  const showCard = outside && card && !flying;
  const title =
    mode === "tower"
      ? `Fachada. ${ordinalFloor(floor)}, ${AURORA_TYPES[unit.type].name}. Clique ou Enter para entrar no andar.`
      : mode === "floor"
        ? `${ordinalFloor(floor)}, ${units.length} residências. Enter de novo para ver a planta, Esc para voltar.`
        : mode === "plan"
          ? `Planta da ${AURORA_TYPES[unit.type].name}, ${ordinalFloor(floor)}.`
          : `${roomOf(room)?.name ?? ""}.`;

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {title}
      </p>
      <AuroraLeader ref={leaderRef} open={showCard} />
      <div inert={!showCard}>
        <AuroraFloorCard
          ref={cardRef}
          unit={unit}
          open={showCard}
          units={mode === "floor" ? units : undefined}
          onUnit={(picked) => actions.openPlan(picked)}
          onBack={mode === "floor" ? actions.back : undefined}
          onView={() => actions.openPlan()}
          onStep={(delta) => actions.step(delta)}
          className={cardClassName}
        />
      </div>
      <AuroraHotspots
        ref={spotsRef}
        open={mode === "plan" && !flying}
        active={mode === "plan" ? hot : null}
        onSelect={actions.openRoom}
        onHover={actions.setHot}
      />
      <AuroraRoomBar
        mode={mode === "room" ? "room" : "plan"}
        unit={unit}
        active={mode === "room" ? room : hot}
        open={!outside && !flying}
        onSelect={actions.openRoom}
        onHover={mode === "plan" ? actions.setHot : undefined}
        onBack={actions.back}
      />
    </>
  );
}

/** "Passe o cursor…" / "Toque…", worded for the step the visitor is on. */
export function AuroraTourHint({ tour, className }: { tour: AuroraTourApi; className?: string }) {
  const inside = tour.mode === "floor";
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[9.5px] leading-none font-semibold tracking-[0.24em] text-au-ink uppercase [text-shadow:0_1px_10px_rgb(0_0_0/0.8)]",
        className,
      )}
    >
      <i aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-au-gold shadow-[0_0_8px_var(--color-au-gold)]" />
      <span className="[@media(pointer:coarse)]:hidden">
        {inside ? "Clique de novo para ver a planta" : "Passe o cursor e clique num andar"}
      </span>
      <span className="hidden [@media(pointer:coarse)]:inline">{inside ? "Toque de novo para a planta" : "Toque em um andar"}</span>
    </p>
  );
}
