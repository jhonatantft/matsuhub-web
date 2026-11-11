import { notFound } from "next/navigation";
import { Hero } from "@/components/home/Hero";

export const metadata = { title: "Lab · Hero", robots: { index: false } };

/** Dev-only: the hero alone, with room to scroll. */
export default function LabHub() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative z-10">
      <Hero />
      <div className="h-[120vh]" />
    </main>
  );
}
