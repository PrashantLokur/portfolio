"use client";

import { useRef } from "react";
import { bbox } from "../../lib/daylight/geometry";
import type { Project } from "../../lib/daylight/types";
import { dirName } from "../../lib/daylight/geometry";

interface Props { north: number; onChange: (v: number) => void; project: Project }

/** Compass: the plan sits fixed with its top up, and the N arrow is dragged to where north points on the drawing. */
export function NorthDial({ north, onChange, project }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const R = 92;
  const theta = -north; // clockwise from plan-up
  const ax = Math.sin((theta * Math.PI) / 180), ay = -Math.cos((theta * Math.PI) / 180);

  const fromPointer = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 6) return;
    const a = (Math.atan2(dx, -dy) * 180) / Math.PI;
    onChange((((Math.round(-a) % 360) + 360) % 360));
  };

  const all = project.rooms.flatMap((r) => r.poly);
  let thumb: React.ReactNode = null;
  if (all.length) {
    const b = bbox(all);
    const s = 100 / Math.max(b.x1 - b.x0, b.y1 - b.y0, 1);
    const ox = -((b.x0 + b.x1) / 2) * s, oy = -((b.y0 + b.y1) / 2) * s;
    thumb = project.rooms.map((r) => (
      <polygon key={r.id} points={r.poly.map(([x, y]) => `${x * s + ox},${y * s + oy}`).join(" ")} fill={r.type === "balcony" ? "rgba(52,211,153,0.18)" : "rgba(148,163,184,0.2)"} stroke="rgba(203,213,225,0.7)" strokeWidth={1} />
    ));
  }

  return (
    <svg
      ref={svg}
      viewBox="-120 -120 240 240"
      className="mx-auto block w-full max-w-[260px] touch-none select-none"
      role="slider"
      tabIndex={0}
      aria-label="Which way north points on your drawing. Drag the N arrow."
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={Math.round(north)}
      aria-valuetext={`Top of the plan faces ${Math.round(north)} degrees, ${dirName(north)}`}
      onPointerDown={(e) => { try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ } fromPointer(e); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType !== "mouse") { if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) fromPointer(e); } }}
      onKeyDown={(e) => {
        const st = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange((north + st + 360) % 360); }
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange((north - st + 360) % 360); }
      }}
    >
      <circle r={R} fill="rgba(255,255,255,0.02)" stroke="rgba(148,163,184,0.45)" strokeWidth={1.5} />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1={Math.sin((a * Math.PI) / 180) * (R - 6)} y1={-Math.cos((a * Math.PI) / 180) * (R - 6)} x2={Math.sin((a * Math.PI) / 180) * R} y2={-Math.cos((a * Math.PI) / 180) * R} stroke="rgba(148,163,184,0.7)" strokeWidth={2} />
      ))}
      <g>{thumb}</g>
      <line x1={0} y1={0} x2={ax * R} y2={ay * R} stroke="#67e8f9" strokeWidth={2} />
      <g transform={`translate(${ax * R},${ay * R}) rotate(${theta})`}>
        <circle r={15} fill="#05070b" stroke="#67e8f9" strokeWidth={2} />
        <text y={5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#67e8f9">N</text>
      </g>
      <circle r={3} fill="#67e8f9" />
    </svg>
  );
}
