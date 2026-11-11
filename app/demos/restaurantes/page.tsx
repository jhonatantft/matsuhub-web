import type { Metadata } from "next";
import { SiteFire } from "@/components/mare/site/SiteFire";
import { SiteFooter } from "@/components/mare/site/SiteFooter";
import { SiteHeader } from "@/components/mare/site/SiteHeader";
import { SiteMenu } from "@/components/mare/site/SiteMenu";
import { SiteNina } from "@/components/mare/site/SiteNina";
import { SiteReserve } from "@/components/mare/site/SiteReserve";
import { SiteSalon } from "@/components/mare/site/SiteSalon";
import { SiteWhere } from "@/components/mare/site/SiteWhere";
import { MARE, MARE_MEDIA } from "@/content/mare";

const title = "Demo · Restaurantes — Maré, fogo & mar";
const description =
  "Site-demo para restaurantes: tour interativo pelo salão, cardápio vivo com ingredientes e alergênicos, comanda, reserva de mesa e uma maître virtual de IA.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/demos/restaurantes" },
  openGraph: {
    title: `${MARE.name} · site-demo MatsuHub`,
    description,
    url: "/demos/restaurantes",
    images: [{ url: MARE_MEDIA.facade.small, width: 1600, height: 904, alt: MARE_MEDIA.facade.alt }],
  },
  twitter: { card: "summary_large_image", title: `${MARE.name} · site-demo MatsuHub`, description },
};

/** The full sample site a restaurant would get: "Maré — fogo & mar" (fictional). */
export default function MareDemoPage() {
  return (
    <main className="relative z-10 min-h-svh overflow-x-clip bg-ma-bg font-sans text-ma-ink lining-nums selection:bg-ma-ember selection:text-ma-bg [&_:focus-visible]:outline-ma-ember">
      <SiteHeader />
      <SiteSalon />
      <SiteMenu />
      <SiteFire />
      <SiteReserve />
      <SiteWhere />
      <SiteFooter />
      <SiteNina />
    </main>
  );
}
