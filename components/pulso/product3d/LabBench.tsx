"use client";

import { useState } from "react";
import { PULSO_ONE_COLORS } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { ProductStage } from "./ProductStage";

/** Dev bench for ProductStage: the stage full-screen plus a colourway switcher. */
export function LabBench() {
  const [color, setColor] = useState<string>(PULSO_ONE_COLORS[0].id);
  return (
    <>
      <ProductStage className="h-svh" colorId={color} />
      <div className="fixed top-4 right-4 z-30 flex gap-1 rounded-full border border-pu-line bg-pu-bg-2/90 p-1 backdrop-blur md:top-6 md:right-6">
        {PULSO_ONE_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === color}
            onClick={() => setColor(c.id)}
            data-color={c.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-pu-ink transition-colors",
              c.id === color ? "bg-pu-bg" : "hover:bg-pu-bg/60",
            )}
          >
            <span className="size-3 rounded-full border border-pu-line" style={{ background: c.body, boxShadow: `inset 0 0 0 1.5px ${c.ring}` }} />
            {c.name}
          </button>
        ))}
      </div>
    </>
  );
}
