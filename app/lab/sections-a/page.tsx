import { notFound } from "next/navigation";
import { Marquee } from "@/components/home/Marquee";
import { Process } from "@/components/home/Process";
import { Services } from "@/components/home/Services";

export const metadata = { title: "Lab · Sections A", robots: { index: false } };

/** Dev-only: Marquee, Services and Process without the rest of the page. */
export default function LabSectionsA() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative z-10 pt-24">
      <Marquee />
      <Services />
      <Process />
    </main>
  );
}
