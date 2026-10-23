"use client";

import { memo, useEffect, useMemo } from "react";
import { D2R, bbox, clamp, dirName } from "../../lib/daylight/geometry";
import { faceCp } from "../../lib/daylight/wind";
import type { Scene } from "../../lib/daylight/scene";
import type { Project } from "../../lib/daylight/types";
import { cx } from "./ui";

export interface StageProps {
  sc: Scene;
  project: Project;
  mode: "light" | "wind";
  /** Value text drawn in each room. */
  values: string[];
  selId: string | null;
  onSelect: (id: string) => void;
  sun: { alt: number; az: number } | null;
  windDir: number;
  windSpd: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  particleRef: React.RefObject<HTMLCanvasElement | null>;
  stageRef: React.RefObject<HTMLDivElement | null>;
  label: string;
}

export function stageBox(sc: Scene) {
  const g = sc.grid;
  const w = g.x1 - g.x0, h = g.y1 - g.y0;
  const pad = Math.max(1.3, Math.max(w, h) * 0.075);
  return { x: g.x0 - pad, y: g.y0 - pad, w: w + 2 * pad, h: h + 2 * pad, pad };
}

/** Edge point of the padded stage in the direction (ux, uy) from the centre. */
function edgePoint(vb: { x: number; y: number; w: number; h: number; pad: number }, ux: number, uy: number, inset: number) {
  const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
  const xmin = vb.x + inset, xmax = vb.x + vb.w - inset, ymin = vb.y + inset, ymax = vb.y + vb.h - inset;
  const sx = ux > 0 ? (xmax - cx) / ux : ux < 0 ? (xmin - cx) / ux : 1e9;
  const sy = uy > 0 ? (ymax - cy) / uy : uy < 0 ? (ymin - cy) / uy : 1e9;
  const s = Math.min(sx, sy);
  return [cx + ux * s, cy + uy * s] as const;
}

function StageImpl({ sc, project, mode, values, selId, onSelect, sun, windDir, windSpd, canvasRef, particleRef, stageRef, label }: StageProps) {
  const vb = useMemo(() => stageBox(sc), [sc]);
  const g = sc.grid;
  const fs = vb.w / 44;
  const north = project.north;

  // canvases keep their pixel size in step with the stage
  useEffect(() => {
    const el = stageRef.current, pc = particleRef.current;
    if (!el || !pc) return;
    const size = () => {
      const r = el.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      pc.width = Math.max(1, Math.round(r.width * dpr));
      pc.height = Math.max(1, Math.round(r.height * dpr));
    };
    const ro = new ResizeObserver(size);
    ro.observe(el);
    size();
    return () => ro.disconnect();
  }, [stageRef, particleRef]);

  const sunPos = useMemo(() => {
    if (!sun) return null;
    const phi = (sun.az - north) * D2R;
    return edgePoint(vb, Math.sin(phi), -Math.cos(phi), vb.pad * 0.62);
  }, [sun, north, vb]);

  const windArrow = useMemo(() => {
    const phi = (windDir - north) * D2R;
    const [x, y] = edgePoint(vb, Math.sin(phi), -Math.cos(phi), vb.pad * 0.7);
    const ang = Math.atan2(vb.y + vb.h / 2 - y, vb.x + vb.w / 2 - x) / D2R;
    return { x, y, ang, sc: 0.55 + 0.5 * Math.min(1, windSpd / 9) };
  }, [windDir, windSpd, north, vb]);

  const faces = useMemo(() => [0, 90, 180, 270].map((off) => {
    const b = (north + off) % 360;
    return { off, name: dirName(b), cp: faceCp(b, windDir) };
  }), [north, windDir]);

  // room names fitted to the room: wrapped onto two lines and shrunk when the room is narrow
  const roomLabels = useMemo(() => sc.rooms.map((r) => {
    const b = bbox(r.poly);
    const w = b.x1 - b.x0;
    const cw = 0.58 * fs;
    let lines = [r.name];
    if (r.name.length * cw > w * 0.92 && r.name.includes(" ")) {
      const parts = r.name.split(" ");
      let best = 1, bd = Infinity;
      for (let k = 1; k < parts.length; k++) {
        const d = Math.abs(parts.slice(0, k).join(" ").length - parts.slice(k).join(" ").length);
        if (d < bd) { bd = d; best = k; }
      }
      lines = [parts.slice(0, best).join(" "), parts.slice(best).join(" ")];
    }
    const longest = Math.max(...lines.map((l) => l.length));
    return { lines, w, k: Math.min(1, Math.max(0.62, (w * 0.92) / (longest * cw))) };
  }), [sc, fs]);

  const walls = useMemo(() => {
    const out: React.ReactNode[] = [];
    project.walls.forEach((w) => out.push(<line key={w.id} x1={w.a[0]} y1={w.a[1]} x2={w.b[0]} y2={w.b[1]} stroke="#cbd5e1" strokeWidth={Math.max(w.t, 0.1)} strokeLinecap="square" opacity={0.9} />));
    return out;
  }, [project.walls]);

  const R = vb.pad * 0.5;
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#080c13]">
      <div ref={stageRef} className="relative min-w-[520px]" style={{ aspectRatio: `${vb.w} / ${vb.h}` }}>
        <canvas
          ref={canvasRef}
          width={g.cols}
          height={g.rows}
          aria-label={mode === "light" ? "Illuminance map of the flat" : "Air changes per hour map of the flat"}
          className="absolute block"
          style={{ left: `${((g.x0 - vb.x) / vb.w) * 100}%`, top: `${((g.y0 - vb.y) / vb.h) * 100}%`, width: `${((g.x1 - g.x0) / vb.w) * 100}%`, height: `${((g.y1 - g.y0) / vb.h) * 100}%`, imageRendering: "auto" }}
        />
        <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="absolute inset-0 block h-full w-full" role="img" aria-label={label}>
          <defs>
            <pattern id="hatch" width={0.18} height={0.18} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={0.18} stroke="#94a3b8" strokeWidth={0.02} opacity={0.35} />
            </pattern>
          </defs>
          {sc.rooms.map((r, i) => {
            const sel = selId === r.id;
            return (
              <g key={r.id}>
                {r.outdoor && <polygon points={r.poly.map((q) => q.join(",")).join(" ")} fill="none" stroke="#94a3b8" strokeWidth={0.05} strokeDasharray="0.22 0.12" opacity={0.7} />}
                <polygon
                  points={r.poly.map((q) => q.join(",")).join(" ")}
                  fill="transparent"
                  stroke={sel ? "#fbbf24" : "none"}
                  strokeWidth={0.07}
                  strokeDasharray="0.2 0.1"
                  className="cursor-pointer hover:fill-white/10"
                  onClick={() => onSelect(r.id)}
                  data-room={i}
                />
              </g>
            );
          })}
          {walls}
          {sc.rooms.filter((r) => !r.outdoor).map((r) => (
            <polygon key={"o" + r.id} points={r.poly.map((q) => q.join(",")).join(" ")} fill="none" stroke="#cbd5e1" strokeWidth={0.07} strokeLinejoin="round" opacity={0.8} pointerEvents="none" />
          ))}
          {sc.windows.map((w) => (
            <line key={w.id} x1={w.p0[0]} y1={w.p0[1]} x2={w.p1[0]} y2={w.p1[1]} stroke="#38bdf8" strokeWidth={w.diffuseOnly ? 0.08 : 0.11} strokeDasharray={w.diffuseOnly ? "0.12 0.08" : undefined} pointerEvents="none" />
          ))}
          {sc.doors.map((d) => (
            <circle key={d.id} cx={d.mid[0]} cy={d.mid[1]} r={0.1} fill="#fbbf24" opacity={d.doorway ? 0.5 : 0.9} pointerEvents="none" />
          ))}

          {sc.rooms.map((r, i) => {
            const L = roomLabels[i];
            const val = values[i] ?? "";
            const vs = Math.min(1, Math.max(0.6, (L.w * 0.92) / (Math.max(val.length, 1) * 0.66 * fs * 1.18)));
            const nf = fs * L.k;
            const first = r.anchor[1] - nf * 0.35 - (L.lines.length - 1) * nf * 1.1;
            return (
              <g key={"t" + r.id} pointerEvents="none" textAnchor="middle">
                <text fontSize={nf} fontWeight={600} fill="#fff" stroke="rgba(8,12,18,0.85)" strokeWidth={nf * 0.28} strokeLinejoin="round" paintOrder="stroke">
                  {L.lines.map((ln, j) => <tspan key={j} x={r.anchor[0]} y={first + j * nf * 1.1}>{ln}</tspan>)}
                </text>
                <text x={r.anchor[0]} y={r.anchor[1] + nf * 1.0 + fs * 0.1} fontSize={fs * 1.18 * vs} fontFamily="var(--font-geist-mono), ui-monospace, monospace" fontWeight={500} fill="#fff" stroke="rgba(8,12,18,0.85)" strokeWidth={fs * 0.32 * vs} strokeLinejoin="round" paintOrder="stroke">{val}</text>
              </g>
            );
          })}

          {/* compass: the arrow shows where north lies on the plan */}
          <g transform={`translate(${vb.x + R + fs * 1.7},${vb.y + R + fs * 1.7})`} pointerEvents="none">
            <circle r={R} fill="none" stroke="#64748b" strokeWidth={0.05} />
            <g transform={`rotate(${-north})`}>
              <path d={`M0,${-R * 0.85} L${R * 0.2},0 L0,${-R * 0.15} L${-R * 0.2},0 Z`} fill="#e2e8f0" />
              <text y={-R - fs * 0.35} textAnchor="middle" fontSize={fs * 1.1} fontWeight={700} fill="#e2e8f0">N</text>
            </g>
          </g>

          {mode === "light" && sunPos && sun && (
            <g transform={`translate(${sunPos[0]},${sunPos[1]}) scale(${(0.75 + 0.25 * clamp(sun.alt / 60, 0, 1)) * vb.pad * 0.011})`} opacity={sun.alt > 0 ? 1 : 0} pointerEvents="none">
              {Array.from({ length: 12 }, (_, k) => {
                const a = k * 30 * D2R;
                return <line key={k} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * 42} y2={Math.sin(a) * 42} stroke="#F3AE2E" strokeWidth={5} strokeLinecap="round" />;
              })}
              <circle r={23} fill="#FFC83D" stroke="#E8960C" strokeWidth={3} />
            </g>
          )}

          {mode === "wind" && (
            <g pointerEvents="none">
              <g transform={`translate(${windArrow.x},${windArrow.y}) rotate(${windArrow.ang}) scale(${windArrow.sc * vb.pad * 0.0105})`}>
                {[-26, 0, 26].map((y) => (
                  <g key={y}>
                    <line x1={-70} y1={y} x2={22} y2={y} stroke="#38bdf8" strokeWidth={7} strokeLinecap="round" />
                    <path d={`M36,${y} L14,${y - 13} L14,${y + 13} Z`} fill="#38bdf8" />
                  </g>
                ))}
              </g>
              {faces.map((f) => {
                const phi = f.off * D2R;
                const vert = f.off === 90 || f.off === 270;
                let [x, y] = edgePoint(vb, Math.sin(phi), -Math.cos(phi), vb.pad * 0.12);
                // keep the label clear of the wind arrow
                const away = vb.pad * 2.8;
                if (Math.hypot(x - windArrow.x, y - windArrow.y) < away) {
                  if (vert) y += (y >= windArrow.y ? 1 : -1) * (away - Math.abs(y - windArrow.y));
                  else x += (x >= windArrow.x ? 1 : -1) * (away - Math.abs(x - windArrow.x));
                }
                const t = (f.cp >= 0 ? "+" : "−") + Math.abs(f.cp).toFixed(2);
                const anchor = f.off === 90 ? "end" : f.off === 270 ? "start" : "middle";
                return (
                  <text key={f.off} x={x} y={vert ? y - fs * 0.6 : y + fs * 0.35} textAnchor={anchor} fontSize={fs * 0.95} fontFamily="var(--font-geist-mono), ui-monospace, monospace" fontWeight={600} fill={f.cp >= 0 ? "#38bdf8" : "#fbbf24"}>
                    <tspan x={x}>{f.name}</tspan>
                    <tspan x={x} dy={fs * 1.1}>{t}</tspan>
                  </text>
                );
              })}
            </g>
          )}
        </svg>
        <canvas ref={particleRef} aria-hidden="true" className={cx("pointer-events-none absolute inset-0 h-full w-full", mode === "wind" ? "block" : "hidden")} />
      </div>
    </div>
  );
}

export const Stage = memo(StageImpl);
