import type { Pt } from "./types";

export const D2R = Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function inPoly(x: number, y: number, p: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i];
    const b = p[j];
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

export function polyArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += p[j][0] * p[i][1] - p[i][0] * p[j][1];
  return Math.abs(s) / 2;
}

/** Signed area; positive when the vertices run clockwise on a y-down screen. */
export function polySigned(p: Pt[]): number {
  let s = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += p[j][0] * p[i][1] - p[i][0] * p[j][1];
  return s / 2;
}

export function polyPerim(p: Pt[]): number {
  let s = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += dist(p[i], p[j]);
  return s;
}

export function bbox(pts: Pt[]) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p[0]);
    y0 = Math.min(y0, p[1]);
    x1 = Math.max(x1, p[0]);
    y1 = Math.max(y1, p[1]);
  }
  return { x0, y0, x1, y1 };
}

export function segInt(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1x = bx - ax, d1y = by - ay, d2x = dx - cx, d2y = dy - cy;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return false;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / den;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / den;
  return t > 0 && t < 1 && u >= 0 && u <= 1;
}

/** Closest point on segment ab to p, with the parameter along it. */
export function nearestOnSeg(p: Pt, a: Pt, b: Pt): { pt: Pt; t: number; d: number } {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const l2 = vx * vx + vy * vy;
  const t = l2 < 1e-12 ? 0 : clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2, 0, 1);
  const pt: Pt = [a[0] + vx * t, a[1] + vy * t];
  return { pt, t, d: dist(p, pt) };
}

/**
 * A point inside the polygon far from its edges (a cheap pole of inaccessibility):
 * used as the anchor for labels and air paths, since a centroid can fall outside an L shape.
 */
export function anchorPoint(poly: Pt[]): Pt {
  const b = bbox(poly);
  const n = 18;
  let best: Pt = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  let bestD = -1;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = b.x0 + ((b.x1 - b.x0) * i) / n;
      const y = b.y0 + ((b.y1 - b.y0) * j) / n;
      if (!inPoly(x, y, poly)) continue;
      let d = Infinity;
      for (let k = 0, m = poly.length - 1; k < poly.length; m = k++) d = Math.min(d, nearestOnSeg([x, y], poly[m], poly[k]).d);
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
  }
  return best;
}

export const wrap180 = (a: number) => ((((a % 360) + 540) % 360) - 180);
export const bearingOf = (dx: number, dy: number) => (((Math.atan2(dx, -dy) / D2R) % 360) + 360) % 360;
export const DIRS16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const dirName = (az: number) => DIRS16[Math.round((((az % 360) + 360) % 360) / 22.5) % 16];
export const fmtT = (h: number) => {
  const m = Math.round(h * 60);
  return String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};
export const fmtLx = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v) + "");
