import { ImageResponse } from "next/og";

export const alt = "Prashant Lokur — Vehicle controls and electrification";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#05070b",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#67e8f9",
            }}
          >
            Vehicle Intelligence · Electrification
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 82,
              fontWeight: 700,
              color: "#f8fafc",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            Prashant Lokur
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 34,
              color: "#94a3b8",
              lineHeight: 1.35,
            }}
          >
            Automotive controls engineer and Industrial PhD researcher —
            BEV thermal management, energy optimization, predictive control.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 28,
            color: "#64748b",
          }}
        >
          prashantlokur.com
        </div>
      </div>
    ),
    size
  );
}
