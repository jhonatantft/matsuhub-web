"use client";

import { ELO, type EloRoomId } from "@/content/clinica";
import type { EloSlot } from "@/lib/clinica/availability";
import { slotLabel } from "@/lib/clinica/availability";
import { cn } from "@/lib/cn";
import { ROOM_IDS, SHORT, prosOf, roomById, specialtyOf, type Availability } from "./data";

/** Presentational pieces of the Elo tour (cards, room bar). No state here. */

export const eyebrow = "font-elo text-[11px] leading-none font-medium tracking-[0.16em] uppercase";

export const surface =
  "rounded-[20px] border border-el-line bg-el-bg-2/92 shadow-[0_30px_70px_-34px_rgb(20_32_31/0.5)] backdrop-blur-xl";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 font-elo text-[13.5px] leading-none font-medium transition-[background-color,border-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-el-acc";
export const btnPrimary = cn(btn, "bg-el-acc text-white hover:bg-[#0b4642]");
export const btnGhost = cn(btn, "border border-el-ink/15 bg-el-bg-2 text-el-ink hover:border-el-acc hover:text-el-acc");

/** Eyebrow of a room: its specialty, or what the space is for. */
export function roomKind(id: EloRoomId) {
  const s = specialtyOf(id);
  if (s) return s.name;
  return id === "recepcao" ? "Chegada" : "Acolhimento";
}

function Kind({ id, className }: { id: EloRoomId; className?: string }) {
  return (
    <p className={cn(eyebrow, "flex items-center gap-2 text-el-acc", className)}>
      <i aria-hidden className="size-1.5 rounded-full bg-el-acc-2" />
      {roomKind(id)}
    </p>
  );
}

const weekday = (slot: EloSlot) => slotLabel(slot).split(" · ")[0];
const hour = (slot: EloSlot) => slotLabel(slot).split(" · ")[1];

/** The small card that follows a hovered room. */
export function RoomHover({ id, avail }: { id: EloRoomId; avail: Availability | null }) {
  const room = roomById(id);
  const spec = specialtyOf(id);
  const next = spec ? avail?.[spec.id]?.next : null;
  return (
    <>
      <Kind id={id} />
      <h3 className="mt-2.5 font-elo text-[20px] leading-tight font-medium tracking-[-0.01em] text-el-ink">{room.name}</h3>
      {spec ? (
        <p className="mt-1.5 text-[13px] leading-snug text-el-mute">{prosOf(spec.id).map((p) => p.name).join(" · ")}</p>
      ) : (
        <p className="mt-1.5 text-[13px] leading-snug text-el-mute">{room.note}</p>
      )}
      {spec && (
        <p className="mt-3.5 border-t border-el-line pt-3 text-[13px] text-el-ink">
          {next ? (
            <>
              <span className="text-el-mute">Próximo horário: </span>
              <span className="font-elo font-medium text-el-acc tabular-nums">{slotLabel(next)}</span>
            </>
          ) : avail ? (
            <span className="text-el-mute">Sem horários livres nas próximas semanas</span>
          ) : (
            <span className="text-el-mute">Consultando a agenda…</span>
          )}
        </p>
      )}
    </>
  );
}

/** The card of a selected room: who works there, their next free times, and the actions. */
export function RoomDetail({
  id,
  avail,
  sent,
  onSlot,
  onBook,
  onView,
  onClose,
}: {
  id: EloRoomId;
  avail: Availability | null;
  sent: string | null;
  onSlot: (professionalId: string, slot: EloSlot) => void;
  onBook: () => void;
  onView: () => void;
  onClose: () => void;
}) {
  const room = roomById(id);
  const spec = specialtyOf(id);
  const data = spec ? avail?.[spec.id] : null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar e voltar à planta inteira"
        className="absolute -top-1.5 -right-2 grid size-9 place-items-center rounded-full text-[20px] leading-none text-el-mute transition-colors hover:bg-el-bg hover:text-el-acc focus-visible:outline-2 focus-visible:outline-el-acc"
      >
        ×
      </button>
      <Kind id={id} />
      <h3 className="mt-3 pr-8 font-elo text-[26px] leading-[1.1] font-medium tracking-[-0.02em] text-el-ink">{room.name}</h3>
      <p className="mt-2 text-[14px] leading-snug text-el-mute">{spec ? spec.short : room.note}</p>

      {spec ? (
        <div className="mt-4 space-y-4 border-t border-el-line pt-4">
          {(data?.pros ?? prosOf(spec.id).map((p) => ({ id: p.id, name: p.name, slots: [] as EloSlot[] }))).map((pro) => (
            <div key={pro.id}>
              <p className="font-elo text-[14px] font-medium text-el-ink">{pro.name}</p>
              {pro.slots.length ? (
                <ul aria-label={`Próximos horários de ${pro.name}`} className="mt-2 grid grid-cols-3 gap-1.5">
                  {pro.slots.map((slot) => (
                    <li key={slot.start.getTime()}>
                      <button
                        type="button"
                        onClick={() => onSlot(pro.id, slot)}
                        aria-label={`Agendar com ${pro.name}: ${slotLabel(slot)}`}
                        className="flex w-full flex-col items-center gap-1 rounded-[12px] border border-el-acc/20 bg-el-acc/[0.05] px-1 py-2 text-el-acc transition-colors duration-300 hover:border-el-acc hover:bg-el-acc hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-el-acc"
                      >
                        <span className="text-[11px] leading-none opacity-75">{weekday(slot)}</span>
                        <span className="font-elo text-[15px] leading-none font-medium tabular-nums">{hour(slot)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[13px] text-el-mute">{avail ? "Sem horários livres nas próximas semanas" : "Consultando a agenda…"}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 border-t border-el-line pt-4 text-[13.5px] leading-relaxed text-el-ink/85">
          {id === "recepcao"
            ? ELO.hours.map((h) => `${h.days}, ${h.time}`).join(" · ")
            : "Quando chegar a sua vez, você é chamado pelo nome no painel."}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={btnGhost} onClick={onView}>
          Ver a sala
        </button>
        {spec && (
          <button type="button" className={btnPrimary} onClick={onBook}>
            Agendar <span aria-hidden>→</span>
          </button>
        )}
      </div>
      {sent && (
        <p role="status" className="mt-3 text-[13px] leading-snug text-el-acc">
          {sent}
        </p>
      )}
    </div>
  );
}

/** Every room as a button, plus a way back. Used on the floor (select) and inside a room (jump). */
export function RoomBar({
  active,
  onRoom,
  onHover,
  back,
  label,
  className,
}: {
  active: EloRoomId | null;
  onRoom: (id: EloRoomId) => void;
  onHover?: (id: EloRoomId | null) => void;
  back: { label: string; short?: string; onClick: () => void; first?: boolean };
  label: string;
  className?: string;
}) {
  const backBtn = (
    <button
      type="button"
      onClick={back.onClick}
      className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 font-elo text-[13px] leading-none text-el-mute transition-colors hover:text-el-acc focus-visible:outline-2 focus-visible:outline-el-acc"
    >
      {back.first && <span aria-hidden>←</span>}
      {back.short ? (
        <>
          <span className="@max-3xl:hidden">{back.label}</span>
          <span className="@3xl:hidden">{back.short}</span>
        </>
      ) : (
        back.label
      )}
      {!back.first && <span aria-hidden>↺</span>}
    </button>
  );
  return (
    <div
      className={cn(
        "flex max-w-full items-center gap-1 rounded-full border border-el-line bg-el-bg-2/88 p-1.5 shadow-[0_20px_50px_-30px_rgb(20_32_31/0.45)] backdrop-blur-xl",
        className,
      )}
    >
      {back.first && backBtn}
      {back.first && <span aria-hidden className="h-5 w-px shrink-0 bg-el-line" />}
      <div
        role="group"
        aria-label={label}
        className="flex min-w-0 snap-x items-center gap-0.5 overflow-x-auto [scrollbar-width:none] @max-3xl:[mask-image:linear-gradient(to_right,#000_82%,transparent)] [&::-webkit-scrollbar]:hidden"
        onPointerLeave={() => onHover?.(null)}
      >
        {ROOM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === active}
            onClick={() => onRoom(id)}
            onPointerEnter={(event) => event.pointerType === "mouse" && onHover?.(id)}
            onFocus={() => onHover?.(id)}
            onBlur={() => onHover?.(null)}
            className="shrink-0 snap-start rounded-full px-3 py-2.5 font-elo text-[13px] leading-none whitespace-nowrap text-el-ink/80 transition-colors duration-300 hover:bg-el-bg hover:text-el-acc focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-el-acc aria-pressed:bg-el-acc aria-pressed:text-white"
          >
            {SHORT[id]}
          </button>
        ))}
      </div>
      {!back.first && <span aria-hidden className="h-5 w-px shrink-0 bg-el-line" />}
      {!back.first && backBtn}
    </div>
  );
}
