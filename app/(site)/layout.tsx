import { CursorGlow } from "@/components/layout/CursorGlow";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";

/** Main MatsuHub site chrome. Demo sites under /demos bring their own. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CursorGlow />
      <Nav />
      <main className="relative z-10 overflow-x-clip">{children}</main>
      <Footer />
    </>
  );
}
