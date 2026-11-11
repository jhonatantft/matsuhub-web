import { notFound } from "next/navigation";
import { Agents } from "@/components/home/Agents";
import { Contact } from "@/components/home/Contact";

export const metadata = { title: "Lab · Sections B", robots: { index: false } };

/** Dev-only: Agents and Contact without the rest of the page. */
export default function LabSectionsB() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative z-10 pt-24">
      <Agents />
      <Contact />
    </main>
  );
}
