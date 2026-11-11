"use client";

import { useImperativeHandle, useRef } from "react";
import { AURORA_ROOMS } from "@/content/aurora";
import { cn } from "@/lib/cn";
import type { AuroraStageHandle } from "./stage-core";
import type { AuroraRoomId } from "./views";

export type AuroraHotspotsHandle = {
  /** Move every hotspot onto its room of the plan. Call it from the stage's `onFrame`. */
  sync(stage: AuroraStageHandle): void;
};

export type AuroraHotspotsProps = {
  ref?: React.Ref<AuroraHotspotsHandle>;
  /** Show them (they arrive one after the other). */
  open?: boolean;
  /** Room to emphasise (hovered in the list, about to be opened…). */
  active?: AuroraRoomId | null;
  /** Opens a room. Omit it and the hotspots are drawn but dead (for scripted showcases). */
  onSelect?: (room: AuroraRoomId) => void;
  onHover?: (room: AuroraRoomId | null) => void;
  className?: string;
};

const point = { x: 0, y: 0 };

/**
 * Pulsing gold dots over the cut-away plan, one per room of AURORA_ROOMS. Wide containers show
 * the room name beside the dot; narrow ones a number that matches the room list.
 */
export function AuroraHotspots({ ref, open = true, active = null, onSelect, onHover, className }: AuroraHotspotsProps) {
  const items = useRef<(HTMLElement | null)[]>([]);

  useImperativeHandle(
    ref,
    () => ({
      sync(stage) {
        for (let i = 0; i < AURORA_ROOMS.length; i++) {
          const el = items.current[i];
          if (!el) continue;
          stage.project(AURORA_ROOMS[i].plan, point);
          el.style.transform = `translate3d(${point.x}px,${point.y}px,0)`;
        }
      },
    }),
    [],
  );

  return (
    <ul aria-hidden={!open || undefined} className={cn("pointer-events-none absolute inset-0 z-[3]", className)}>
      {AURORA_ROOMS.map((room, i) => {
        const on = active === room.id;
        return (
          <li
            key={room.id}
            ref={(el) => {
              items.current[i] = el;
            }}
            className="absolute top-0 left-0 h-0 w-0 will-change-transform"
          >
            <button
              type="button"
              tabIndex={onSelect && open ? undefined : -1}
              onClick={onSelect && (() => onSelect(room.id))}
              onPointerEnter={onHover && (() => onHover(room.id))}
              onPointerLeave={onHover && (() => onHover(null))}
              onFocus={onHover && (() => onHover(room.id))}
              onBlur={onHover && (() => onHover(null))}
              aria-label={`Ver ${room.name}`}
              data-open={open}
              data-on={on}
              style={{ transitionDelay: open ? `${0.25 + i * 0.09}s` : "0s" }}
              className="group absolute top-0 left-0 flex -translate-x-[11px] -translate-y-1/2 items-center gap-2 transition-[opacity,scale] duration-500 ease-soft focus-visible:outline-au-gold data-[open=false]:scale-75 data-[open=false]:opacity-0 data-[open=true]:pointer-events-auto"
            >
              <span className="relative grid h-[22px] w-[22px] shrink-0 place-items-center">
                <i aria-hidden className="absolute inset-0 animate-ping rounded-full bg-au-gold/45 [animation-duration:2.6s]" />
                <i
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-au-gold/80 bg-au-bg/55 backdrop-blur-[2px] transition-[background-color,scale] duration-300 group-hover:scale-110 group-data-[on=true]:scale-110 group-data-[on=true]:bg-au-gold"
                />
                <i
                  aria-hidden
                  className="relative h-1.5 w-1.5 rounded-full bg-au-gold transition-colors duration-300 group-data-[on=true]:bg-au-bg @max-xl:hidden"
                />
                <span className="relative text-[10px] leading-none font-bold text-au-gold tabular-nums group-data-[on=true]:text-au-bg @xl:hidden">
                  {i + 1}
                </span>
              </span>
              <span className="hidden border border-au-line bg-au-bg/80 px-2.5 py-1.5 text-[9.5px] leading-none font-semibold tracking-[0.2em] whitespace-nowrap text-au-ink uppercase backdrop-blur-md transition-colors duration-300 group-hover:border-au-gold group-data-[on=true]:border-au-ink group-data-[on=true]:bg-au-ink group-data-[on=true]:text-au-bg @xl:block">
                {room.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
