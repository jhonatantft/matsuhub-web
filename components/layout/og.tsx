import { ImageResponse } from "next/og";
import type { Lang } from "@/lib/i18n/core";
import { MarkSvg } from "@/components/ui/logo-mark";

export const HOME_OG_SIZE = { width: 1200, height: 630 };

const COPY = {
  pt: { lines: ["Software que pensa.", "Agentes que trabalham."], kicker: "SOFTWARE HOUSE · WEB + IA" },
  en: { lines: ["Software that thinks.", "Agents that work."], kicker: "SOFTWARE HOUSE · WEB + AI" },
} as const;

export const HOME_OG_ALT = { pt: "MatsuHub — Software e agentes de IA", en: "MatsuHub — Software and AI agents" } as const;

/** The homepage's social card, generated at build time (app/opengraph-image and app/en/opengraph-image). */
export function homeOgImage(lang: Lang) {
  const copy = COPY[lang];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#050807",
          backgroundImage: "radial-gradient(circle at 80% 38%, rgba(185,255,75,0.24), rgba(5,8,7,0) 55%)",
          color: "#eef4ee",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700 }}>
          <MarkSvg size={56} gradientId="og-core" armColor="#eef4ee" />
          <div style={{ display: "flex" }}>
            matsu<span style={{ color: "#b9ff4b" }}>hub</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 94, fontWeight: 800, lineHeight: 1.02, letterSpacing: -4 }}>
          <div style={{ display: "flex" }}>{copy.lines[0]}</div>
          <div style={{ display: "flex", color: "#b9ff4b" }}>{copy.lines[1]}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 5, color: "#8d9a92" }}>{copy.kicker}</div>
      </div>
    ),
    HOME_OG_SIZE,
  );
}
