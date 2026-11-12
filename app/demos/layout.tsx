import { DEMO_BAR_H } from "@/components/demo/constants";
import { DemoBar } from "@/components/demo/DemoBar";
import { DemoOutro } from "@/components/demo/DemoOutro";
import { RootDocument } from "@/components/layout/RootDocument";
import { rootMetadata, VIEWPORT } from "@/lib/i18n/metadata";

export const metadata = rootMetadata("pt");
export const viewport = VIEWPORT;

/**
 * Root layout of the site-demos: they are Portuguese sites (`<html lang="pt-BR">`), framed by
 * MatsuHub's own chrome — the demo bar on top (the demo's header sits below it via
 * `--demo-bar-h`) and the closing band after the demo's footer. The chrome follows the visitor's
 * site language on its own (lib/i18n/cookie).
 */
export default function DemosLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootDocument lang="pt">
      <div style={{ "--demo-bar-h": `${DEMO_BAR_H}px` } as React.CSSProperties}>
        <DemoBar />
        {children}
        <DemoOutro />
      </div>
    </RootDocument>
  );
}
