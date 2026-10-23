import { ImageResponse } from "next/og";

export const alt = "Daylight and ventilation check for your flat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const rooms = [
  { x: 0, y: 0, w: 150, h: 130, c: "rgba(245,158,11,0.55)" },
  { x: 156, y: 0, w: 100, h: 130, c: "rgba(249,115,22,0.45)" },
  { x: 0, y: 136, w: 100, h: 110, c: "rgba(139,92,246,0.5)" },
  { x: 106, y: 136, w: 150, h: 110, c: "rgba(34,211,238,0.35)" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          backgroundColor: "#05070b",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 660 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase", color: "#67e8f9" }}>
              Side project · Building physics
            </div>
            <div style={{ marginTop: 36, fontSize: 70, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
              Daylight and airflow in your flat
            </div>
            <div style={{ marginTop: 28, fontSize: 30, color: "#94a3b8", lineHeight: 1.35 }}>
              Trace a floor plan, set the address, and watch sun and wind move through the rooms.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#64748b" }}>prashantlokur.com/daylight</div>
        </div>

        <div style={{ display: "flex", position: "relative", width: 300, height: 360, marginTop: 40 }}>
          <div style={{ position: "absolute", left: 20, top: 0, width: 130, height: 130, borderRadius: 65, background: "rgba(251,191,36,0.9)", display: "flex" }} />
          <div style={{ position: "absolute", left: 20, top: 90, width: 260, height: 250, display: "flex", border: "3px solid #cbd5e1" }}>
            {rooms.map((r, i) => (
              <div key={i} style={{ position: "absolute", left: r.x + 2, top: r.y + 2, width: r.w, height: r.h, background: r.c, display: "flex" }} />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
