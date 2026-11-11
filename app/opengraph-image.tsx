import { ImageResponse } from "next/og";

export const alt = "MatsuHub — Software e agentes de IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card, generated at build time. */
export default function OpengraphImage() {
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
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 3 20h18L12 3Zm0 11-9 6m9-6 9 6m-9-6V3" stroke="#b9ff4b" strokeWidth="1.5" />
            <circle cx="12" cy="14" r="2.2" fill="#b9ff4b" />
          </svg>
          <div style={{ display: "flex" }}>
            matsu<span style={{ color: "#b9ff4b" }}>hub</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 94, fontWeight: 800, lineHeight: 1.02, letterSpacing: -4 }}>
          <div style={{ display: "flex" }}>Software que pensa.</div>
          <div style={{ display: "flex", color: "#b9ff4b" }}>Agentes que trabalham.</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 5, color: "#8d9a92" }}>SOFTWARE HOUSE · WEB + IA</div>
      </div>
    ),
    size,
  );
}
