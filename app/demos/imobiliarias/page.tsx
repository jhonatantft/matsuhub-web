import type { Metadata } from "next";
import { SiteAmenities } from "@/components/aurora/site/SiteAmenities";
import { RANGE_CSS, SiteFinance } from "@/components/aurora/site/SiteFinance";
import { SiteFooter } from "@/components/aurora/site/SiteFooter";
import { SiteHeader } from "@/components/aurora/site/SiteHeader";
import { SiteLia } from "@/components/aurora/site/SiteLia";
import { SiteLocation } from "@/components/aurora/site/SiteLocation";
import { SitePlans } from "@/components/aurora/site/SitePlans";
import { SiteTour } from "@/components/aurora/site/SiteTour";
import { SiteUnits } from "@/components/aurora/site/SiteUnits";
import { SiteVisit } from "@/components/aurora/site/SiteVisit";
import { AURORA, AURORA_MEDIA } from "@/content/aurora";

const title = "Demo · Imobiliárias — Aurora Residence";
const description =
  "Site-demo para imobiliárias e incorporadoras: tour imersivo pela fachada, plantas e ambientes, unidades com filtros, simulador de financiamento e uma corretora virtual de IA.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/demos/imobiliarias" },
  openGraph: {
    title: `${AURORA.name} · site-demo MatsuHub`,
    description,
    url: "/demos/imobiliarias",
    images: [{ url: AURORA_MEDIA.exterior.dusk.small, width: 1600, height: 905, alt: AURORA_MEDIA.exterior.dusk.alt }],
  },
  twitter: { card: "summary_large_image", title: `${AURORA.name} · site-demo MatsuHub`, description },
};

/** The full sample site a property developer would get: "Aurora Residence", by the fictional Aurora Imóveis. */
export default function AuroraDemoPage() {
  return (
    <main className="relative z-10 min-h-svh overflow-x-clip bg-au-bg font-sans text-au-ink selection:bg-au-gold selection:text-au-bg">
      <style>{RANGE_CSS}</style>
      <SiteHeader />
      <SiteTour />
      <SiteUnits />
      <SitePlans />
      <SiteAmenities />
      <SiteLocation />
      <SiteFinance />
      <SiteVisit />
      <SiteFooter />
      <SiteLia />
    </main>
  );
}
