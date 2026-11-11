import Image from "next/image";
import type { MareDish } from "@/content/mare";
import { cn } from "@/lib/cn";
import { DISH_SPOTS } from "./dish-spots";

/**
 * A dish photo with its ingredient hotspots. `spots`:
 *   "hover"  – hidden until the parent `group/dish` is hovered or focused (menu cards)
 *   "always" – shown, with a staggered entrance (detail view)
 */
export function DishPhoto({
  dish,
  sizes,
  spots,
  priority,
  className,
}: {
  dish: MareDish;
  sizes: string;
  spots: "hover" | "always";
  priority?: boolean;
  className?: string;
}) {
  const list = DISH_SPOTS[dish.id] ?? [];
  return (
    <span className={cn("relative block aspect-square overflow-hidden bg-ma-bg-2", className)}>
      <Image
        src={dish.image.small}
        alt={dish.image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
      <span aria-hidden className="absolute inset-0">
        {list.map((s, i) => {
          const left = s.side ? s.side === "left" : s.x > 58;
          return (
            <span
              key={s.label}
              className="absolute"
              style={{ left: `${s.x}%`, top: `${s.y}%`, translate: left ? "calc(-100% + 7px) -50%" : "-7px -50%" }}
            >
              <span
                className={cn(
                  "flex items-center gap-1.5 transition-[opacity,translate] duration-500 ease-soft",
                  left && "flex-row-reverse",
                  spots === "hover"
                    ? "translate-y-1 opacity-0 group-hover/dish:translate-y-0 group-hover/dish:opacity-100 group-focus-visible/dish:translate-y-0 group-focus-visible/dish:opacity-100"
                    : "starting:translate-y-1 starting:opacity-0",
                )}
                style={{ transitionDelay: `${80 + i * 70}ms` }}
              >
                <span className="relative grid h-3.5 w-3.5 shrink-0 place-items-center">
                  <i className="absolute inset-0 rounded-full border border-ma-ink/80 bg-ma-bg/30" />
                  <i className="h-1.5 w-1.5 rounded-full bg-ma-ember shadow-[0_0_10px_2px_rgb(240_138_75/0.7)]" />
                </span>
                <span
                  className={cn(
                    "rounded-full bg-ma-bg/80 px-2.5 py-1 leading-none whitespace-nowrap text-ma-ink backdrop-blur-md",
                    spots === "hover" ? "text-[10.5px]" : "text-[11px] sm:text-[12.5px]",
                  )}
                >
                  {s.label}
                </span>
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
