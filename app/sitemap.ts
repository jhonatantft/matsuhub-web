import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

const base = siteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/demos/imobiliarias`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/demos/restaurantes`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/demos/ecommerce`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
