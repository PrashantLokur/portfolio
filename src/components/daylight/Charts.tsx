"use client";

import { memo, useRef } from "react";
import { NST, STEP, T0, T1 } from "../../lib/daylight/daylight";
import { clamp, fmtLx, fmtT } from "../../lib/daylight/geometry";
import { fmtA } from "../../lib/daylight/wind";
import type { Rose } from "../../lib/daylight/wind";

const MONO = "var(--font-geist-mono), ui-monospace, monospace";

/** Time-of-day slider drawn as a sky strip with the outdoor light curve. */
export function Scrubber({ hour, onChange, onGrab, out, rise, set }: {
  hour: number; onChange: (h: number) => void; onGrab: () => void; out: Float32Array | null; rise: number; set: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const Wd = 700, Hd = 84;
  const X = (h: number) => ((h - T0) / (T1 - T0)) * Wd;
  let mx = 1;
  if (out) for (let s = 0; s < NST; s++) mx = Math.max(mx, out[s]);
  const Y = (v: number) => 58 - (v / mx) * 44;
  let d = "";
  if (out) for (let s = 0; s < NST; s++) d += (s ? "L" : "M") + X(T0 + s * STEP).toFixed(1) + "," + Y(out[s]).toFixed(1);
  const setFrom = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    onChange(T0 + clamp((e.clientX - r.left) / r.width, 0, 1) * (T1 - T0));
  };
  const rs = X(rise), ss = X(set);
  const f = (v: number) => clamp(v / Wd, 0, 1);
  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label="Time of day"
      aria-valuemin={T0 * 60}
      aria-valuemax={T1 * 60}
      aria-valuenow={Math.round(hour * 60)}
      aria-valuetext={fmtT(hour)}
      className="touch-none cursor-ew-resize rounded-xl outline-offset-4"
      onPointerDown={(e) => { drag.current = true; try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ } onGrab(); setFrom(e); }}
      onPointerMove={(e) => { if (drag.current) setFrom(e); }}
      onPointerUp={() => { drag.current = false; }}
      onPointerCancel={() => { drag.current = false; }}
      onKeyDown={(e) => {
        let h = hour;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") h += e.shiftKey ? 1 : 0.25;
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") h -= e.shiftKey ? 1 : 0.25;
        else if (e.key === "Home") h = T0; else if (e.key === "End") h = T1; else return;
        e.preventDefault();
        onGrab();
        onChange(clamp(h, T0, T1));
      }}
    >
      <svg viewBox={`0 0 ${Wd} ${Hd}`} preserveAspectRatio="none" className="block h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="skyg" x1="0" x2="1">
            <stop offset="0" stopColor="#1B2640" />
            <stop offset={f(rs - 2)} stopColor="#1B2640" />
            <stop offset={f(rs + 30)} stopColor="#F7C57A" />
            <stop offset={f(rs + 120)} stopColor="#CFE6F7" />
            <stop offset={f(ss - 120)} stopColor="#CFE6F7" />
            <stop offset={f(ss - 30)} stopColor="#F29B5C" />
            <stop offset={f(ss + 30)} stopColor="#1B2640" />
            <stop offset="1" stopColor="#1B2640" />
          </linearGradient>
        </defs>
        <rect width={Wd} height={Hd} rx={8} fill="url(#skyg)" />
        {out && <path d={`${d}L${X(T1)},${Hd}L${X(T0)},${Hd}Z`} fill="#fff" opacity={0.55} />}
        {out && <path d={d} fill="none" stroke="#fff" strokeWidth={2} />}
        <line x1={X(hour)} x2={X(hour)} y1={0} y2={Hd} stroke="#E8960C" strokeWidth={3} />
        <circle cx={X(hour)} cy={Hd / 2} r={8} fill="#FFC83D" stroke="#fff" strokeWidth={2.5} />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400" style={{ fontFamily: MONO }}>
        <span>05:00</span><span>↑ {fmtT(rise)}</span><span>12:00</span><span>↓ {fmtT(set)}</span><span>19:00</span>
      </div>
    </div>
  );
}

export const DayCurve = memo(function DayCurve({ med, target, hour, name }: { med: Float32Array; target: number; hour: number; name: string }) {
  const Wd = 520, Hd = 210, L = 44, R = 12, Tp = 12, B = 30;
  let ymax = 0;
  for (let s = 0; s < NST; s++) ymax = Math.max(ymax, med[s]);
  if (target) ymax = Math.max(ymax, target * 1.6);
  const step = ymax > 6000 ? 2000 : ymax > 2500 ? 1000 : ymax > 1200 ? 500 : ymax > 600 ? 200 : ymax > 250 ? 100 : 50;
  ymax = Math.max(step, Math.ceil(ymax / step) * step);
  const X = (h: number) => L + ((h - T0) / (T1 - T0)) * (Wd - L - R);
  const Y = (v: number) => Hd - B - (v / ymax) * (Hd - B - Tp);
  let d = "";
  for (let s = 0; s < NST; s++) d += (s ? "L" : "M") + X(T0 + s * STEP).toFixed(1) + "," + Y(med[s]).toFixed(1);
  const s = clamp((hour - T0) / STEP, 0, NST - 1), s0 = Math.floor(s), s1 = Math.min(NST - 1, s0 + 1), u = s - s0;
  const v = med[s0] * (1 - u) + med[s1] * u;
  const ticks: number[] = [];
  for (let v2 = 0; v2 <= ymax; v2 += step) ticks.push(v2);
  const hrs: number[] = [];
  for (let h = T0; h <= T1; h += 2) hrs.push(h);
  return (
    <svg viewBox={`0 0 ${Wd} ${Hd}`} className="block h-auto w-full" role="img" aria-label={`Typical illuminance in ${name} through the day`}>
      <g fontFamily={MONO} fontSize={10} fill="#94a3b8">
        {ticks.map((t) => <g key={t}><line x1={L} x2={Wd - R} y1={Y(t)} y2={Y(t)} stroke="rgba(148,163,184,0.2)" /><text x={L - 6} y={Y(t) + 4} textAnchor="end">{fmtLx(t)}</text></g>)}
        {hrs.map((h) => <text key={h} x={X(h)} y={Hd - 10} textAnchor="middle">{String(h).padStart(2, "0")}</text>)}
        <path d={`${d}L${X(T1)},${Y(0)}L${X(T0)},${Y(0)}Z`} fill="#F3AE2E" opacity={0.16} />
        <path d={d} fill="none" stroke="#F3AE2E" strokeWidth={2.4} strokeLinejoin="round" />
        {target > 0 && (
          <>
            <line x1={L} x2={Wd - R} y1={Y(target)} y2={Y(target)} stroke="#e2e8f0" strokeWidth={1.2} strokeDasharray="5 4" />
            <text x={Wd - R} y={Y(target) - 5} textAnchor="end" fill="#e2e8f0">target {target} lx</text>
          </>
        )}
        <line x1={X(hour)} x2={X(hour)} y1={Tp} y2={Hd - B} stroke="#e2e8f0" strokeWidth={1.5} />
        <circle cx={X(hour)} cy={Y(v)} r={4.5} fill="#e2e8f0" />
      </g>
    </svg>
  );
});

export const WindChart = memo(function WindChart({ vals, rose, avg, dir, name }: { vals: number[]; rose: Rose | null; avg: number | null; dir: number; name: string }) {
  const Wd = 520, Hd = 310, L = 40, R = 10, pw = Wd - L - R;
  const fTop = 30, fBot = 112, aTop = 170, aBot = Hd - 30;
  const fmax = rose ? Math.max(20, Math.ceil(Math.max(...rose.f) / 10) * 10) : 20;
  let ymax = Math.max(18, ...vals);
  const step = ymax > 120 ? 40 : ymax > 60 ? 20 : ymax > 30 ? 10 : 5;
  ymax = Math.ceil(ymax / step) * step;
  const YF = (v: number) => fBot - (v / fmax) * (fBot - fTop);
  const YA = (v: number) => aBot - (v / ymax) * (aBot - aTop);
  const X = (deg: number) => L + ((deg + 11.25) / 360) * pw;
  const bw = (pw / 16) * 0.76;
  const aticks: number[] = [];
  for (let v = 0; v <= ymax; v += step) aticks.push(v);
  return (
    <svg viewBox={`0 0 ${Wd} ${Hd}`} className="block h-auto w-full" role="img" aria-label={`How often the wind blows from each direction, and air changes per hour in ${name} for each direction`}>
      <g fontFamily={MONO} fontSize={10} fill="#94a3b8">
        <text x={L} y={16} fill="#e2e8f0">{rose ? "How often the wind blows from each direction, % of hours" : "No wind record loaded yet"}</text>
        {rose && [0, fmax / 2, fmax].map((v) => <g key={v}><line x1={L} x2={Wd - R} y1={YF(v)} y2={YF(v)} stroke="rgba(148,163,184,0.2)" /><text x={L - 6} y={YF(v) + 4} textAnchor="end">{v}</text></g>)}
        {rose && rose.f.map((v, k) => <rect key={k} x={X(k * 22.5) - bw / 2} y={YF(v)} width={bw} height={Math.max(0, fBot - YF(v))} rx={2} fill="#F3AE2E" />)}
        <text x={L} y={aTop - 14} fill="#e2e8f0">Air changes per hour in this room, by wind direction</text>
        {avg !== null && <text x={Wd - R} y={aTop - 14} textAnchor="end" fill="#e2e8f0">season average {fmtA(avg)}/h</text>}
        {aticks.map((v) => <g key={v}><line x1={L} x2={Wd - R} y1={YA(v)} y2={YA(v)} stroke="rgba(148,163,184,0.2)" /><text x={L - 6} y={YA(v) + 4} textAnchor="end">{v}</text></g>)}
        {[6, 15].map((v) => (v < ymax ? <line key={v} x1={L} x2={Wd - R} y1={YA(v)} y2={YA(v)} stroke="#e2e8f0" strokeDasharray="4 4" opacity={0.5} /> : null))}
        {vals.map((v, k) => <rect key={k} x={X(k * 22.5) - bw / 2} y={YA(v)} width={bw} height={Math.max(0, aBot - YA(v))} rx={2} fill="#38bdf8" />)}
        {["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map((n, k) => <text key={n} x={X(k * 45)} y={Hd - 10} textAnchor="middle">{n}</text>)}
        <line x1={X(dir)} x2={X(dir)} y1={fTop - 4} y2={aBot} stroke="#e2e8f0" strokeWidth={2} opacity={0.8} />
      </g>
    </svg>
  );
});
