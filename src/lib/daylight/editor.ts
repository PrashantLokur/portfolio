import { dist, inPoly, nearestOnSeg, polyArea } from "./geometry";
import { hostSeg, openingSpan } from "./scene";
import { ROOM_TYPES, uid, type Host, type Opening, type Project, type Pt, type Room, type RoomType, type Wall } from "./types";

export type Tool = "select" | "room" | "rect" | "wall" | "window" | "balcdoor" | "door" | "pan" | "image" | "calib";
export type Sel = { t: "room" | "wall" | "open"; id: string } | null;

export interface Snap {
  pt: Pt;
  kind: "vertex" | "edge" | "align" | "grid" | "free";
  /** Guide lines for the alignment that was applied, in world metres. */
  gx?: number;
  gy?: number;
}

export interface SnapOpts {
  /** Snap radius in metres (screen radius divided by zoom). */
  r: number;
  last?: Pt | null;
  grid: number;
  /** Extra vertices, such as the corners already placed in the shape being drawn. */
  extra?: Pt[];
  enabled: boolean;
}

function allSegments(p: Project): [Pt, Pt][] {
  const out: [Pt, Pt][] = [];
  for (const r of p.rooms) for (let i = 0; i < r.poly.length; i++) out.push([r.poly[i], r.poly[(i + 1) % r.poly.length]]);
  for (const w of p.walls) out.push([w.a, w.b]);
  return out;
}

export function snapPoint(pt: Pt, p: Project, o: SnapOpts): Snap {
  if (!o.enabled) return { pt, kind: "free" };
  const verts: Pt[] = [...(o.extra ?? [])];
  for (const r of p.rooms) verts.push(...r.poly);
  for (const w of p.walls) verts.push(w.a, w.b);
  let best: Pt | null = null;
  let bd = o.r;
  for (const v of verts) {
    const d = dist(pt, v);
    if (d < bd) { bd = d; best = v; }
  }
  if (best) return { pt: [best[0], best[1]], kind: "vertex" };

  const ra = o.r * 0.7;
  let ax: number | null = null, ay: number | null = null;
  let dx = ra, dy = ra;
  const refs = o.last ? [...verts, o.last] : verts;
  for (const v of refs) {
    if (Math.abs(v[0] - pt[0]) < dx) { dx = Math.abs(v[0] - pt[0]); ax = v[0]; }
    if (Math.abs(v[1] - pt[1]) < dy) { dy = Math.abs(v[1] - pt[1]); ay = v[1]; }
  }
  if (ax !== null || ay !== null) return { pt: [ax ?? pt[0], ay ?? pt[1]], kind: "align", gx: ax ?? undefined, gy: ay ?? undefined };

  let eb: Pt | null = null;
  let ed = o.r * 0.8;
  for (const [a, b] of allSegments(p)) {
    const n = nearestOnSeg(pt, a, b);
    if (n.d < ed) { ed = n.d; eb = n.pt; }
  }
  if (eb) return { pt: eb, kind: "edge" };
  if (o.grid > 0) return { pt: [Math.round(pt[0] / o.grid) * o.grid, Math.round(pt[1] / o.grid) * o.grid], kind: "grid" };
  return { pt, kind: "free" };
}

export interface HostHit { host: Host; s: number; a: Pt; b: Pt; d: number }

/** The wall or room edge nearest to a point, for placing windows and doors. */
export function hostAt(p: Project, pt: Pt, r: number): HostHit | null {
  let best: HostHit | null = null;
  let bestScore = Infinity;
  const consider = (host: Host, a: Pt, b: Pt, penalty: number) => {
    const n = nearestOnSeg(pt, a, b);
    if (n.d > r) return;
    const score = n.d + penalty;
    if (score < bestScore) { bestScore = score; best = { host, s: n.t, a, b, d: n.d }; }
  };
  for (const room of p.rooms) {
    const pen = room.type === "balcony" ? r * 0.9 : 0;
    for (let i = 0; i < room.poly.length; i++) consider({ k: "r", id: room.id, i }, room.poly[i], room.poly[(i + 1) % room.poly.length], pen);
  }
  for (const w of p.walls) consider({ k: "w", id: w.id }, w.a, w.b, r * 0.3);
  return best;
}

export type VHit = { k: "room"; id: string; i: number } | { k: "wall"; id: string; end: 0 | 1 };

export function hitVertex(p: Project, sel: Sel, pt: Pt, r: number): VHit | null {
  if (!sel) return null;
  if (sel.t === "room") {
    const room = p.rooms.find((x) => x.id === sel.id);
    if (!room) return null;
    let bi = -1, bd = r;
    room.poly.forEach((v, i) => { const d = dist(pt, v); if (d < bd) { bd = d; bi = i; } });
    return bi >= 0 ? { k: "room", id: room.id, i: bi } : null;
  }
  if (sel.t === "wall") {
    const w = p.walls.find((x) => x.id === sel.id);
    if (!w) return null;
    const da = dist(pt, w.a), db = dist(pt, w.b);
    if (Math.min(da, db) > r) return null;
    return { k: "wall", id: w.id, end: da <= db ? 0 : 1 };
  }
  return null;
}

export function openingGeom(p: Project, o: Opening) {
  const hs = hostSeg(p, o.host);
  return hs ? openingSpan(hs.a, hs.b, o.s, o.w) : null;
}

export function hitOpening(p: Project, pt: Pt, r: number): Opening | null {
  let best: Opening | null = null;
  let bd = r;
  for (const o of p.openings) {
    const g = openingGeom(p, o);
    if (!g) continue;
    const n = nearestOnSeg(pt, g.p0, g.p1);
    if (n.d < bd) { bd = n.d; best = o; }
  }
  return best;
}

export function hitRoom(p: Project, pt: Pt): Room | null {
  let best: Room | null = null;
  let ba = Infinity;
  for (const r of p.rooms) {
    if (!inPoly(pt[0], pt[1], r.poly)) continue;
    const a = polyArea(r.poly);
    if (a < ba) { ba = a; best = r; }
  }
  return best;
}

export function hitWall(p: Project, pt: Pt, r: number): Wall | null {
  let best: Wall | null = null;
  let bd = r;
  for (const w of p.walls) {
    const n = nearestOnSeg(pt, w.a, w.b);
    if (n.d < bd) { bd = n.d; best = w; }
  }
  return best;
}

export function roomName(p: Project, type: RoomType): string {
  const label = ROOM_TYPES.find((t) => t.type === type)?.label.split(" ")[0].replace("/", "") ?? "Room";
  const n = p.rooms.filter((r) => r.type === type).length;
  return n === 0 ? label : `${label} ${n + 1}`;
}

export function newRoom(p: Project, type: RoomType, poly: Pt[]): Room {
  return { id: uid("r"), name: roomName(p, type), type, poly, slab: type === "balcony" ? true : undefined };
}

export function newWalls(points: Pt[]): Wall[] {
  const out: Wall[] = [];
  for (let i = 0; i + 1 < points.length; i++) out.push({ id: uid("w"), a: points[i], b: points[i + 1], t: 0.2 });
  return out;
}

export function defaultOpening(tool: "window" | "balcdoor" | "door", host: Host, s: number): Opening {
  const base = { id: uid("o"), host, s: Math.min(1, Math.max(0, s)) };
  if (tool === "window") return { ...base, kind: "window", w: 1.5, sill: 0.9, head: 2.1, glaze: "clear", free: 0.6 };
  if (tool === "balcdoor") return { ...base, kind: "window", w: 2.0, sill: 0, head: 2.1, glaze: "clear", free: 0.5 };
  return { ...base, kind: "door", w: 0.9, sill: 0, head: 2.1 };
}

export function removeRoom(p: Project, id: string): Project {
  return {
    ...p,
    rooms: p.rooms
      .filter((r) => r.id !== id)
      .map((r) => ({
        ...r,
        zone: r.zone === id ? undefined : r.zone,
        borrow: r.borrow?.from === id ? undefined : r.borrow,
      })),
    openings: p.openings.filter((o) => !(o.host.k === "r" && o.host.id === id)),
  };
}

export function removeWall(p: Project, id: string): Project {
  return {
    ...p,
    walls: p.walls.filter((w) => w.id !== id),
    openings: p.openings.filter((o) => !(o.host.k === "w" && o.host.id === id)),
  };
}

export function removeSel(p: Project, sel: Sel): Project {
  if (!sel) return p;
  if (sel.t === "room") return removeRoom(p, sel.id);
  if (sel.t === "wall") return removeWall(p, sel.id);
  return { ...p, openings: p.openings.filter((o) => o.id !== sel.id) };
}

export function translateRoom(r: Room, dx: number, dy: number): Room {
  return { ...r, poly: r.poly.map(([x, y]) => [x + dx, y + dy] as Pt) };
}

export function projectBox(p: Project): { x0: number; y0: number; x1: number; y1: number } | null {
  const pts: Pt[] = [...p.rooms.flatMap((r) => r.poly), ...p.walls.flatMap((w) => [w.a, w.b])];
  if (!pts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  return { x0, y0, x1, y1 };
}
