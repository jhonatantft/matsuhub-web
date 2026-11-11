import type { Metadata } from "next";
import { PulsoJsonLd } from "@/components/pulso/agents/PulsoJsonLd";
import { SiteAgents } from "@/components/pulso/site/SiteAgents";
import { SiteCart } from "@/components/pulso/site/SiteCart";
import { SiteCompare } from "@/components/pulso/site/SiteCompare";
import { SiteEco } from "@/components/pulso/site/SiteEco";
import { SiteFooter } from "@/components/pulso/site/SiteFooter";
import { SiteHeader } from "@/components/pulso/site/SiteHeader";
import { SiteHero } from "@/components/pulso/site/SiteHero";
import { SiteProducts } from "@/components/pulso/site/SiteProducts";
import { SiteSearch } from "@/components/pulso/site/SiteSearch";
import { PULSO, pulsoById } from "@/content/pulso";

const title = "Demo · E-commerce — Pulso, áudio";
const description =
  "Site-demo de loja online: produto em 3D que desmonta, busca por intenção em português, comparador, vendedor de IA, checkout simulado e uma camada pronta para agentes (MCP e UCP).";
const one = pulsoById("one")!;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/demos/ecommerce" },
  openGraph: {
    title: `${PULSO.name} · site-demo MatsuHub`,
    description,
    url: "/demos/ecommerce",
    images: [{ url: one.image.small, width: 1000, height: 1000, alt: one.image.alt }],
  },
  twitter: { card: "summary_large_image", title: `${PULSO.name} · site-demo MatsuHub`, description },
};

/** The full sample store a retailer would get: "Pulso", consumer audio (fictional). */
export default function PulsoDemoPage() {
  return (
    <main className="relative z-10 min-h-svh overflow-x-clip bg-pu-bg font-sans text-pu-ink lining-nums selection:bg-pu-acc selection:text-white [&_:focus-visible]:outline-pu-acc">
      <PulsoJsonLd />
      <SiteHeader />
      <SiteHero />
      <SiteSearch />
      <SiteProducts />
      <SiteCompare />
      <SiteAgents />
      <SiteFooter />
      <SiteCart />
      <SiteEco />
    </main>
  );
}
