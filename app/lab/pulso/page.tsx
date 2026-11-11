import { notFound } from "next/navigation";
import { LabBench } from "@/components/pulso/product3d/LabBench";

export const metadata = { title: "Lab · Pulso", robots: { index: false } };

/**
 * Dev-only bench for the Pulso One 3D stage (components/pulso/product3d).
 *   ?nogl=1  force the no-WebGL fallback (studio photo)
 *   ?t=4     freeze animation time (lib/ticker)
 */
export default function LabPulso() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative z-10 min-h-svh bg-pu-bg">
      <LabBench />
    </main>
  );
}
