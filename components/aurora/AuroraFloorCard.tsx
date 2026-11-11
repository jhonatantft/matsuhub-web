import { AURORA_STATUS_LABEL, AURORA_TYPES, brl, type AuroraUnit } from "@/content/aurora";
import { cn } from "@/lib/cn";
import type { AuroraStageHandle } from "./stage-core";
import { FLOORS } from "./views";

export type AuroraFloorCardProps = {
  /** The outer box: position it yourself, or pass it to `placeFloorCard` every frame. */
  ref?: React.Ref<HTMLDivElement>;
  unit: AuroraUnit;
  open?: boolean;
  /** "Ver residência". Omit it and the button is drawn but dead (for scripted showcases). */
  onView?: () => void;
  /** Adds ▲▼ buttons to step through floors — the keyboard and touch path to every floor. */
  onStep?: (delta: 1 | -1) => void;
  /**
   * Every residence of the floor (the camera has flown into it): the card lists them, each row
   * opening its plan through `onUnit`.
   */
  units?: readonly AuroraUnit[];
  onUnit?: (unit: AuroraUnit) => void;
  /** Adds a "← Fachada" button (zoom back out to the whole tower). */
  onBack?: () => void;
  className?: string;
};

/**
 * The card that answers "which floor is this?": floor number, residence, size, price and status.
 * Wide containers (≥ 576 px, `@xl`): a small card floating beside the tower. Narrow ones: a
 * bottom sheet. The outer box never animates on its own, so it can follow the tower frame by
 * frame; the inner one fades and slides when `open` changes.
 */
export function AuroraFloorCard({
  ref,
  unit,
  open = true,
  onView,
  onStep,
  units,
  onUnit,
  onBack,
  className,
}: AuroraFloorCardProps) {
  const type = AURORA_TYPES[unit.type];
  const sold = unit.status === "vendida";
  const list = units && units.length > 0 ? units : null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-[4] @max-xl:inset-x-2.5 @max-xl:bottom-2.5 @xl:top-0 @xl:left-0 @xl:will-change-transform",
        onStep ? "@xl:w-[286px]" : "@xl:w-[248px]",
        !open && "pointer-events-none",
        className,
      )}
    >
      <div
        data-open={open}
        className="border border-au-line bg-au-bg/82 text-au-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.75)] backdrop-blur-md transition-[opacity,transform] duration-500 ease-soft data-[open=false]:translate-y-3 data-[open=false]:opacity-0 @xl:data-[open=false]:translate-x-3 @xl:data-[open=false]:translate-y-0"
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            data-back=""
            className="group flex w-full items-center gap-2 border-b border-au-line px-4 py-2.5 text-left text-[9.5px] leading-none font-bold tracking-[0.22em] text-au-mute uppercase transition-colors hover:text-au-gold focus-visible:outline-au-gold"
          >
            <span aria-hidden className="transition-transform duration-300 ease-soft group-hover:-translate-x-0.5">
              ←
            </span>
            Fachada
            <span className="sr-only"> — voltar ao prédio inteiro</span>
          </button>
        )}
        <div className="flex items-stretch gap-4 px-4 pt-4 pb-3.5">
          <div className="flex flex-col justify-between">
            <span className="text-[8.5px] leading-none font-semibold tracking-[0.28em] text-au-mute uppercase">Andar</span>
            <span className="font-aurora text-[42px] leading-[0.9] font-light tabular-nums">
              {String(unit.floor).padStart(2, "0")}
            </span>
          </div>
          <span aria-hidden className="w-px bg-au-line" />
          <div className="min-w-0 flex-1 self-center">
            <p className="font-aurora text-[19px] leading-tight">{list ? `${list.length} residências` : type.name}</p>
            {list ? (
              <p className="mt-1 text-[11.5px] leading-snug text-au-mute">Escolha uma para abrir a planta</p>
            ) : (
              <>
                <p className="mt-1 text-[11.5px] leading-snug text-au-mute">
                  {unit.area} m² · {unit.suites} suítes · {unit.vagas} vagas
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-au-mute">{type.face}</p>
              </>
            )}
          </div>
          {onStep && (
            <div className="flex flex-col justify-center gap-1.5">
              <StepButton label="Andar acima" disabled={unit.floor >= FLOORS} onClick={() => onStep(1)} up />
              <StepButton label="Andar abaixo" disabled={unit.floor <= 1} onClick={() => onStep(-1)} />
            </div>
          )}
        </div>

        {list && (
          <ul className="border-t border-au-line">
            {list.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={onUnit && (() => onUnit(item))}
                  tabIndex={onUnit ? undefined : -1}
                  data-unit={item.id}
                  className="group flex w-full items-center gap-3 border-b border-au-line/60 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-au-ink/[0.06] focus-visible:outline-au-gold"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] leading-tight text-au-ink">
                      {item.id} · {AURORA_TYPES[item.type].name}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[9px] leading-none font-semibold tracking-[0.18em] uppercase">
                      <i
                        aria-hidden
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          item.status === "disponível" ? "bg-au-gold shadow-[0_0_8px_var(--color-au-gold)]" : "bg-au-mute/60",
                        )}
                      />
                      <span className={item.status === "disponível" ? "text-au-gold" : "text-au-mute"}>
                        {AURORA_STATUS_LABEL[item.status]}
                      </span>
                      <span className="text-au-mute">· {item.area} m²</span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[12.5px] font-semibold tabular-nums",
                      item.status === "vendida" && "text-au-mute line-through decoration-au-mute/60",
                    )}
                  >
                    {brl(item.price)}
                  </span>
                  <span aria-hidden className="text-au-mute transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:text-au-gold">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={cn("flex items-center justify-between gap-3 border-t border-au-line px-4 py-2.5", list && "hidden")}>
          <span className="flex items-center gap-2 text-[9.5px] leading-none font-semibold tracking-[0.2em] uppercase">
            <i
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                unit.status === "disponível" ? "bg-au-gold shadow-[0_0_8px_var(--color-au-gold)]" : "bg-au-mute/60",
              )}
            />
            <span className={unit.status === "disponível" ? "text-au-gold" : "text-au-mute"}>
              {AURORA_STATUS_LABEL[unit.status]}
            </span>
          </span>
          <span className={cn("text-[13px] font-semibold tabular-nums", sold && "text-au-mute line-through decoration-au-mute/60")}>
            {brl(unit.price)}
          </span>
        </div>

        <button
          type="button"
          onClick={onView}
          tabIndex={onView ? undefined : -1}
          data-cta=""
          className="group flex w-full items-center justify-between bg-au-ink px-4 py-3 text-[10px] leading-none font-bold tracking-[0.24em] text-au-bg uppercase transition-colors hover:bg-au-gold focus-visible:outline-au-gold"
        >
          Ver residência
          <span aria-hidden className="transition-transform duration-300 ease-soft group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>
    </div>
  );
}

function StepButton({ label, up, disabled, onClick }: { label: string; up?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center border border-au-line text-au-ink transition-colors hover:border-au-gold hover:text-au-gold focus-visible:outline-au-gold disabled:opacity-30"
    >
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden className={up ? "" : "rotate-180"}>
        <path d="M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </button>
  );
}

/** A hairline from a point on the picture to a card: gold dot at the start, line to the end. */
export function AuroraLeader({
  ref,
  open = true,
  className,
}: {
  ref?: React.Ref<HTMLDivElement>;
  open?: boolean;
  className?: string;
}) {
  return (
    <div
      ref={ref}
      aria-hidden
      data-open={open}
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-[3] h-0 w-0 transition-opacity duration-500 will-change-transform data-[open=false]:opacity-0",
        className,
      )}
    >
      <i className="absolute top-0 left-0 block h-px w-[100px] origin-left bg-gradient-to-r from-au-gold to-au-gold/50" />
      <i className="absolute -top-[3px] -left-[3px] block h-[7px] w-[7px] rounded-full bg-au-gold shadow-[0_0_10px_2px_rgb(231_197_138/0.6)]" />
    </div>
  );
}

/** Draw a leader between two points (CSS px inside the stage). */
export function placeLeader(el: HTMLElement, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  el.style.transform = `translate3d(${x1}px,${y1}px,0) rotate(${Math.atan2(dy, dx)}rad)`;
  const line = el.firstElementChild as HTMLElement | null;
  if (line) line.style.transform = `scaleX(${Math.hypot(dx, dy) / 100})`;
}

const box = { x: 0, y: 0, w: 0, h: 0 };

/**
 * Keep a floor card (and its leader) attached to a floor of the tower. Call it every frame
 * from the stage's `onFrame`. Wide stages: the card sits beside the band, on the side with
 * more room, clamped inside the stage. Narrow stages: the card is a bottom sheet (CSS) and the
 * leader drops from the band to it.
 * `out`, when given, receives the card's box in stage px (e.g. to aim a pointer at its button).
 */
export function placeFloorCard(
  stage: AuroraStageHandle,
  card: HTMLElement,
  leader: HTMLElement | null,
  floor: number,
  options: { gap?: number; top?: number } = {},
  out?: { x: number; y: number; w: number; h: number },
) {
  const { width, height } = stage.size;
  stage.floorBox(floor, box);
  const mid = box.y + box.h / 2;
  const cw = card.offsetWidth;
  const ch = card.offsetHeight;
  let x = (width - cw) / 2;
  let y = height - ch - 10;
  if (width < 576) {
    card.style.transform = "";
    if (leader) placeLeader(leader, box.x + box.w / 2, box.y + box.h, box.x + box.w / 2, y);
  } else {
    const gap = options.gap ?? 34;
    const right = width - (box.x + box.w) >= box.x;
    x = right ? Math.min(box.x + box.w + gap, width - cw - 14) : Math.max(box.x - gap - cw, 14);
    y = Math.min(Math.max(mid - ch * 0.42, options.top ?? 64), height - ch - 14);
    card.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (leader) placeLeader(leader, right ? box.x + box.w : box.x, mid, right ? x : x + cw, mid);
  }
  if (out) {
    out.x = x;
    out.y = y;
    out.w = cw;
    out.h = ch;
  }
}
