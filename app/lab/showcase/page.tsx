import { notFound } from "next/navigation";
import { AuroraTour } from "@/components/aurora/AuroraTour";
import { LabJump } from "@/components/aurora/lab/LabJump";
import { StageLab } from "@/components/aurora/lab/StageLab";
import { DemoShowcase } from "@/components/home/DemoShowcase";

export const metadata = { title: "Lab · Showcase", robots: { index: false } };

/**
 * Dev-only bench for the Aurora pieces.
 *   ?p=0..1  the pinned homepage showcase, forced to that progress (and scrolled to it)
 *   ?s=1     the interactive tour (<AuroraTour>) on its own screen
 *   ?s=2     the bare <AuroraStage> driven by URL numbers (see components/aurora/lab/StageLab)
 */
export default function LabShowcase() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative z-10">
      <DemoShowcase />
      <div className="h-[40vh]" />
      <div id="lab-tour">
        <AuroraTour className="h-svh" />
      </div>
      <div className="h-[20vh]" />
      <StageLab />
      <LabJump />
    </main>
  );
}
