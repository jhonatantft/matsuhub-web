import type { Metadata, Viewport } from "next";
import { Cormorant, Fraunces, JetBrains_Mono, Manrope, Sora, Unbounded } from "next/font/google";
import "./globals.css";
import { Ambient } from "@/components/layout/Ambient";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { SITE } from "@/content/site";
import { siteUrl } from "@/lib/site-url";

const display = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
// Serif for the "Aurora" demo only — not preloaded, so other pages don't pay for it.
const aurora = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", preload: false });
// Serif for the "Maré" restaurant demo only.
const mare = Cormorant({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

// Geometric sans for the "Pulso" online-store demo only.
const pulso = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE.name} — Software e agentes de IA`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE.name,
    title: `${SITE.name} — Software e agentes de IA`,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#050807", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable} ${aurora.variable} ${mare.variable} ${pulso.variable}`}>
      <body>
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <Ambient />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
