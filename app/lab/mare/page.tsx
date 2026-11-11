import { notFound } from "next/navigation";
import { SalonTour } from "@/components/mare/tour/SalonTour";

export const metadata = { title: "Lab · Maré", robots: { index: false } };

/**
 * Dev-only bench for the Maré tour (components/mare/tour).
 *   ?hot=1  draw every table (magenta) and zone (cyan) target over the cut-away
 *   ?t=4    freeze animation time (lib/ticker)
 */
export default function LabMare() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative z-10 min-h-svh bg-ma-bg">
      <SalonTour className="h-svh" />
    </main>
  );
}
