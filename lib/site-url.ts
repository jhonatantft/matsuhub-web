/** The public address of the site in production. */
const PRODUCTION_URL = "https://www.matsuhub.com";

/**
 * The site's public origin, without a trailing slash. Used for metadata, the sitemap, robots
 * and structured data, which are generated at build time. NEXT_PUBLIC_SITE_URL overrides it;
 * otherwise production builds use the real domain and development uses the local server.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000";
}
