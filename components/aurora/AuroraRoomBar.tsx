import { AURORA_ROOMS, AURORA_STATUS_LABEL, AURORA_TYPES, brl, type AuroraUnit } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { AuroraEyebrow } from "./AuroraChrome";
import { ordinalFloor, roomOf, type AuroraRoomId } from "./views";

export type AuroraRoomBarProps = {
  /** "plan": the residence and its rooms to choose from. "room": the room on stage, tabs to the others. */
  mode: "plan" | "room";
  unit: AuroraUnit;
  /** Room on stage (room mode) or emphasised (plan mode). */
  active: AuroraRoomId | null;
  open?: boolean;
  /** Room tabs. Omit the handlers and the bar is drawn but dead (for scripted showcases). */
  onSelect?: (room: AuroraRoomId) => void;
  onHover?: (room: AuroraRoomId | null) => void;
  /** "Voltar à planta" (room mode) / "Voltar ao prédio" (plan mode). */
  onBack?: () => void;
  className?: string;
};

/**
 * The bar along the bottom of the plan and of every room: where you are on the left, the
 * rooms on the right. It keeps its place when the plan cuts to a room, so the tabs read as
 * one control. Narrow containers stack it and let the tabs scroll sideways.
 */
export function AuroraRoomBar({ mode, unit, active, open = true, onSelect, onHover, onBack, className }: AuroraRoomBarProps) {
  const type = AURORA_TYPES[unit.type];
  const room = active ? roomOf(active) : undefined;
  const inRoom = mode === "room" && room;
  const title = inRoom ? room.name : type.name;
  const live = Boolean(onSelect);

  return (
    <div
      data-open={open}
      aria-hidden={!open || undefined}
      className={cn(
        "absolute inset-x-0 bottom-0 z-[3] transition-[opacity,translate] duration-500 ease-soft data-[open=false]:pointer-events-none data-[open=false]:translate-y-4 data-[open=false]:opacity-0",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[190%] bg-gradient-to-t from-au-bg/90 via-au-bg/45 to-transparent" />
      <div className="relative flex flex-col gap-3 px-3.5 pt-6 pb-3.5 @xl:flex-row @xl:items-end @xl:justify-between @xl:gap-6 @xl:px-6 @xl:pb-5">
        <div className="flex min-w-0 flex-1 items-end gap-4">
          <button
            type="button"
            onClick={onBack}
            tabIndex={onBack && open ? undefined : -1}
            data-back=""
            className="group flex shrink-0 items-center gap-2 border border-au-line bg-au-bg/70 px-3 py-2.5 text-[9.5px] leading-none font-bold tracking-[0.22em] text-au-ink uppercase backdrop-blur-md transition-colors hover:border-au-gold hover:text-au-gold focus-visible:outline-au-gold"
          >
            <span aria-hidden className="transition-transform duration-300 ease-soft group-hover:-translate-x-0.5">
              ←
            </span>
            {mode === "room" ? "Planta" : "Prédio"}
            <span className="sr-only">{mode === "room" ? " — voltar à planta" : " — voltar ao prédio"}</span>
          </button>
          <div className="min-w-0">
            <AuroraEyebrow className="truncate">
              {inRoom
                ? `${ordinalFloor(unit.floor)} · ${type.name}`
                : `${ordinalFloor(unit.floor)} · ${AURORA_STATUS_LABEL[unit.status]}`}
            </AuroraEyebrow>
            <p
              key={title}
              className="mt-2 truncate font-aurora text-[24px] leading-none text-au-ink transition-[opacity,translate] duration-700 ease-soft @xl:text-[30px] starting:translate-y-2 starting:opacity-0"
            >
              {title}
            </p>
            <p className="mt-1.5 truncate text-[11.5px] leading-snug text-au-mute">
              {inRoom ? room.note : `${unit.area} m² · ${unit.suites} suítes · ${unit.vagas} vagas · ${brl(unit.price)}`}
            </p>
          </div>
        </div>

        <div
          role={live ? "tablist" : undefined}
          aria-label={live ? "Ambientes" : undefined}
          className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 [scrollbar-width:none] @xl:mx-0 @xl:shrink-0 @xl:overflow-visible @xl:px-0"
        >
          {AURORA_ROOMS.map((item, i) => {
            const on = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                role={live ? "tab" : undefined}
                aria-selected={live ? on && mode === "room" : undefined}
                tabIndex={live && open ? undefined : -1}
                onClick={onSelect && (() => onSelect(item.id))}
                onPointerEnter={onHover && (() => onHover(item.id))}
                onPointerLeave={onHover && (() => onHover(null))}
                data-room={item.id}
                data-on={on}
                className="flex shrink-0 items-center gap-2 border border-au-line bg-au-bg/70 px-3 py-2.5 text-[9.5px] leading-none font-bold tracking-[0.2em] whitespace-nowrap text-au-ink uppercase backdrop-blur-md transition-colors duration-300 hover:border-au-gold focus-visible:outline-au-gold data-[on=true]:border-au-ink data-[on=true]:bg-au-ink data-[on=true]:text-au-bg"
              >
                <span className="text-au-gold tabular-nums @xl:hidden [[data-on=true]>&]:text-au-bg/70">{i + 1}</span>
                <span className="@max-xl:hidden @5xl:hidden">{item.short}</span>
                <span className="@xl:hidden @5xl:inline">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
