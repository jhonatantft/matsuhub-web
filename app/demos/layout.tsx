import { DEMO_BAR_H } from "@/components/demo/constants";
import { DemoBar } from "@/components/demo/DemoBar";
import { DemoOutro } from "@/components/demo/DemoOutro";

/**
 * Every site-demo is framed by MatsuHub's own chrome: the demo bar on top (the demo's header sits
 * below it via `--demo-bar-h`) and the closing band after the demo's footer.
 */
export default function DemosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ "--demo-bar-h": `${DEMO_BAR_H}px` } as React.CSSProperties}>
      <DemoBar />
      {children}
      <DemoOutro />
    </div>
  );
}
