import { notFound } from "next/navigation";
import { ClinicTour } from "@/components/clinica/tour/ClinicTour";

export const metadata = { title: "Lab · Elo", robots: { index: false } };

/**
 * Dev-only bench for the Elo tour (components/clinica/tour).
 *   ?hot=1  draw every room outline (magenta), door hit area (cyan) and the model's edge (orange)
 *   ?gl=0   force the <img> fallback
 *   ?t=4    freeze animation time (lib/ticker)
 */
export default function LabClinica() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative z-10 min-h-svh bg-el-bg">
      <ClinicTour className="h-svh" />
    </main>
  );
}
