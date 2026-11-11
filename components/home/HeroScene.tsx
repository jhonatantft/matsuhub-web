"use client";

import dynamic from "next/dynamic";

const HubScene = dynamic(() => import("@/components/three/hub/HubScene"), { ssr: false });

/** Lazy client-only mount of the hero WebGL scene; fills its positioned parent. */
export function HeroScene() {
  return (
    <div aria-hidden className="absolute inset-0">
      <HubScene className="h-full w-full" />
    </div>
  );
}
