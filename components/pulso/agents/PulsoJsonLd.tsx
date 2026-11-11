import { PULSO, PULSO_PRODUCTS } from "@/content/pulso";
import { siteUrl } from "@/lib/site-url";

/**
 * schema.org JSON-LD for the Pulso demo store: the store itself plus an ItemList of its
 * products with offers. No ratings or reviews (there are none). Server component.
 */

const origin = () => {
  try {
    return new URL(siteUrl()).origin;
  } catch {
    return "http://localhost:3000";
  }
};

/** JSON safe inside <script>: escapes <, >, & and the JS line separators. */
const safeJson = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

export function PulsoJsonLd() {
  const o = origin();
  const storeUrl = `${o}/demos/ecommerce`;
  const storeId = `${storeUrl}#loja`;

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": storeId,
        name: `${PULSO.name} (loja de demonstração)`,
        description: `${PULSO.tagline} Marca fictícia criada pela MatsuHub para demonstrar uma loja online pronta para agentes de IA.`,
        url: storeUrl,
        currenciesAccepted: PULSO.currency,
      },
      {
        "@type": "ItemList",
        name: `Catálogo ${PULSO.name}`,
        numberOfItems: PULSO_PRODUCTS.length,
        itemListElement: PULSO_PRODUCTS.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            "@id": `${storeUrl}#produto-${p.id}`,
            name: p.name,
            sku: p.sku,
            description: p.text,
            category: p.category,
            image: o + p.image.src,
            brand: { "@type": "Brand", name: PULSO.name },
            weight: { "@type": "QuantitativeValue", value: p.specs.pesoG, unitCode: "GRM" },
            offers: {
              "@type": "Offer",
              price: p.price.toFixed(2),
              priceCurrency: PULSO.currency,
              availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              url: storeUrl,
              seller: { "@id": storeId },
            },
          },
        })),
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}
