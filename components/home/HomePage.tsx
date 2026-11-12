import { JsonLd, homeJsonLd } from "@/components/segments/JsonLd";
import type { Lang } from "@/lib/i18n/core";
import { siteUrl } from "@/lib/site-url";
import { Agents } from "./Agents";
import { Contact } from "./Contact";
import { DemoShowcase } from "./DemoShowcase";
import { Hero } from "./Hero";
import { Marquee } from "./Marquee";
import { Process } from "./Process";
import { Services } from "./Services";

/** The homepage, top to bottom, in one language (/ and /en render this). */
export function HomePage({ lang }: { lang: Lang }) {
  return (
    <>
      <JsonLd data={homeJsonLd(lang, siteUrl())} />
      <Hero lang={lang} />
      <Marquee lang={lang} />
      <Services lang={lang} />
      <DemoShowcase lang={lang} />
      <Agents lang={lang} />
      <Process lang={lang} />
      <Contact lang={lang} />
    </>
  );
}
