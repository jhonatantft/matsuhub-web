import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Text-only social card in MatsuHub style (same frame as app/opengraph-image.tsx): logo, a
 * mono kicker, the headline with its lime second line, and the page's chips at the bottom.
 */
export function segmentOgImage({ kicker, title, accent, chips }: { kicker: string; title: string; accent: string; chips: string[] }) {
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
          backgroundImage:
            "radial-gradient(circle at 84% 30%, rgba(185,255,75,0.22), rgba(5,8,7,0) 52%), radial-gradient(circle at 10% 110%, rgba(62,242,196,0.16), rgba(5,8,7,0) 45%)",
          color: "#eef4ee",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 3 20h18L12 3Zm0 11-9 6m9-6 9 6m-9-6V3" stroke="#b9ff4b" strokeWidth="1.5" />
              <circle cx="12" cy="14" r="2.2" fill="#b9ff4b" />
            </svg>
            <div style={{ display: "flex" }}>
              matsu<span style={{ color: "#b9ff4b" }}>hub</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, letterSpacing: 4, color: "#b9ff4b", textTransform: "uppercase" }}>
            <div style={{ width: 12, height: 12, borderRadius: 12, background: "#b9ff4b" }} />
            {kicker}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, lineHeight: 1.04, letterSpacing: -3 }}>
          <div style={{ display: "flex" }}>{title}</div>
          <div style={{ display: "flex", color: "#b9ff4b" }}>{accent}</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {chips.map((chip) => (
            <div
              key={chip}
              style={{ display: "flex", padding: "10px 20px", border: "1px solid rgba(190,255,215,0.28)", borderRadius: 999, fontSize: 24, color: "#c9d4cc" }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
