import type { Metadata } from "next";
import { SiteBooking } from "@/components/clinica/site/SiteBooking";
import { SiteExams } from "@/components/clinica/site/SiteExams";
import { SiteFooter } from "@/components/clinica/site/SiteFooter";
import { SiteHeader } from "@/components/clinica/site/SiteHeader";
import { SiteHero } from "@/components/clinica/site/SiteHero";
import { SiteIris } from "@/components/clinica/site/SiteIris";
import { SitePrecheck } from "@/components/clinica/site/SitePrecheck";
import { SiteSpecialties } from "@/components/clinica/site/SiteSpecialties";
import { SiteWhere } from "@/components/clinica/site/SiteWhere";
import { ELO, ELO_MEDIA } from "@/content/clinica";

const title = "Demo · Clínicas — Elo Clínica Integrada";
const description =
  "Site-demo para clínicas: tour interativo pela clínica, agendamento online com a agenda à vista, teleconsulta, pré-consulta que fica no aparelho do paciente e uma recepcionista virtual de IA.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/demos/clinicas" },
  openGraph: {
    title: `${ELO.full} · site-demo MatsuHub`,
    description,
    url: "/demos/clinicas",
    images: [{ url: ELO_MEDIA.facade.small, width: 1600, height: 904, alt: ELO_MEDIA.facade.alt }],
  },
  twitter: { card: "summary_large_image", title: `${ELO.full} · site-demo MatsuHub`, description },
};

/** The full sample site a clinic would get: "Elo Clínica Integrada" (fictional). */
export default function EloDemoPage() {
  return (
    <main className="relative z-10 min-h-svh overflow-x-clip bg-el-bg font-sans text-el-ink lining-nums selection:bg-el-acc selection:text-white [&_:focus-visible]:outline-el-acc">
      <SiteHeader />
      <SiteHero />
      <SiteSpecialties />
      <SiteBooking />
      <SitePrecheck />
      <SiteExams />
      <SiteWhere />
      <SiteFooter />
      <SiteIris />
    </main>
  );
}
