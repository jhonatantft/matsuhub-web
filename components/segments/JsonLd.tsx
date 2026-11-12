import { SEGMENT_LIST, SEGMENT_UI, t, type Lang, type Segment, type SegmentHrefs } from "@/content/segments";
import { SITE } from "@/content/site";
import { HOME_PATH } from "@/lib/i18n/sections";
import { HTML_LANG } from "@/lib/i18n/core";

/** JSON safe inside <script>: escapes <, >, & and the JS line separators. */
const safeJson = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}

const inLanguage = (lang: Lang) => HTML_LANG[lang];
const provider = (base: string, lang: Lang) => ({
  "@type": "Organization",
  "@id": `${base}/#org`,
  name: SITE.name,
  url: base,
  description: t(SITE.description, lang),
});
const area = (lang: Lang) => ({ "@type": "Country", name: lang === "pt" ? "Brasil" : "Brazil" });
/** The page itself, so every graph states its language. */
const webPage = (url: string, name: string, description: string, lang: Lang, base: string) => ({
  "@type": "WebPage",
  "@id": `${url}#page`,
  url,
  name,
  description,
  inLanguage: inLanguage(lang),
  isPartOf: { "@id": `${base}/#site` },
});

/** Organization + WebSite + WebPage for a homepage. */
export function homeJsonLd(lang: Lang, base: string) {
  const url = `${base}${HOME_PATH[lang]}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      provider(base, lang),
      {
        "@type": "WebSite",
        "@id": `${base}/#site`,
        url: `${base}/`,
        name: SITE.name,
        inLanguage: [HTML_LANG.pt, HTML_LANG.en],
        publisher: { "@id": `${base}/#org` },
      },
      webPage(url, t(SITE.title, lang), t(SITE.description, lang), lang, base),
    ],
  };
}

/** Service + FAQPage + BreadcrumbList for one segment page. `base` is the site origin. */
export function segmentJsonLd(segment: Segment, lang: Lang, hrefs: SegmentHrefs, base: string) {
  const url = `${base}${hrefs.segment(segment.id)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: t(segment.meta.service, lang),
        serviceType: t(segment.meta.service, lang),
        description: t(segment.meta.description, lang),
        url,
        provider: provider(base, lang),
        areaServed: area(lang),
        audience: { "@type": "BusinessAudience", audienceType: t(segment.meta.audienceType, lang) },
        availableChannel: { "@type": "ServiceChannel", serviceUrl: `${base}${hrefs.contact}` },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        url,
        inLanguage: inLanguage(lang),
        mainEntity: segment.faq.map((item) => ({
          "@type": "Question",
          name: t(item.q, lang),
          acceptedAnswer: { "@type": "Answer", text: t(item.a, lang) },
        })),
      },
      breadcrumbs(base, lang, hrefs, { name: t(segment.name, lang), url }),
      webPage(url, t(segment.meta.title, lang), t(segment.meta.description, lang), lang, base),
    ],
  };
}

/** ItemList of the four services + BreadcrumbList for the /solucoes index. */
export function indexJsonLd(lang: Lang, hrefs: SegmentHrefs, base: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: t(SEGMENT_UI.index.label, lang),
        itemListElement: SEGMENT_LIST.map((segment, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Service",
            name: t(segment.meta.service, lang),
            description: t(segment.card, lang),
            url: `${base}${hrefs.segment(segment.id)}`,
            provider: provider(base, lang),
            areaServed: area(lang),
          },
        })),
      },
      breadcrumbs(base, lang, hrefs),
      webPage(`${base}${hrefs.index}`, t(SEGMENT_UI.index.metaTitle, lang), t(SEGMENT_UI.index.metaDescription, lang), lang, base),
    ],
  };
}

function breadcrumbs(base: string, lang: Lang, hrefs: SegmentHrefs, leaf?: { name: string; url: string }) {
  const items = [
    { name: t(SEGMENT_UI.home, lang), url: `${base}${hrefs.home}` },
    { name: t(SEGMENT_UI.solutions, lang), url: `${base}${hrefs.index}` },
    ...(leaf ? [leaf] : []),
  ];
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}
