import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Azelos Blueprint Seller Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #070b12 0%, #0f172a 50%, #1e3a5f 100%)",
        }}
      >
        <div style={{ fontSize: 28, color: "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>Azelos</div>
        <div style={{ fontSize: 56, fontWeight: 800, marginTop: 16, color: "#f1f5f9" }}>
          Production-ready infrastructure blueprints
        </div>
        <div style={{ fontSize: 26, marginTop: 24, color: "#94a3b8" }}>
          Azure · Docker · Kubernetes · SOC · FinOps · Private AI
        </div>
      </div>
    ),
    size,
  );
}
