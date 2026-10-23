import { anchorPoint, bbox, dist, inPoly, lerpPt, polyArea, polyPerim } from "./geometry";
import { GLAZE, roomTarget, type Host, type Project, type Pt, type Room, type RoomType } from "./types";

export const Z0 = 0.75; // work plane height, m

export type DoorGroup = "bed" | "kit" | "toi" | null;

export interface CRoom {
  id: string;
  name: string;
  type: RoomType;
  outdoor: boolean;
  poly: Pt[];
  target: number;
  /** Index into Scene.zones for indoor rooms, -1 for balconies. */
  zone: number;
  areaM2: number;
  /** Interreflection share: 1.05 A / (2 A + perimeter x height). */
  k: number;
  anchor: Pt;
  slab: boolean;
  /** Balconies: unit vector pointing away from the building. */
  bn: Pt | null;
  borrow: { from: number; f: number } | null;
  cells: Int32Array;
}

export interface CWin {
  id: string;
  room: number;
  p0: Pt;
  p1: Pt;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  len: number;
  mid: Pt;
  zs: number;
  zh: number;
  tau: number;
  diffuseOnly: boolean;
  /** Free area when fully open, m2. */
  area: number;
  fixed: boolean;
  shelter: boolean;
}

export interface CDoor {
  id: string;
  a: number;
  b: number;
  mid: Pt;
  nx: number;
  ny: number;
  w: number;
  group: DoorGroup;
  doorway: boolean;
}

export interface Adjacency { a: number; b: number; len: number; doors: number }

export interface Scene {
  H: number;
  rooms: CRoom[];
  zones: number[][];
  windows: CWin[];
  doors: CDoor[];
  /** x1 y1 x2 y2 per blocking wall segment. */
  walls: Float64Array;
  wallBox: Float64Array;
  slabs: Pt[][];
  adjacency: Adjacency[];
  order: number[];
  warnings: string[];
  grid: { x0: number; y0: number; s: number; cols: number; rows: number; x1: number; y1: number };
  N: number;
  CX: Float32Array;
  CY: Float32Array;
  CR: Int16Array;
  CG: Int32Array;
}

export function hostSeg(p: Project, h: Host): { a: Pt; b: Pt; room?: Room } | null {
  if (h.k === "w") {
    const w = p.walls.find((x) => x.id === h.id);
    return w ? { a: w.a, b: w.b } : null;
  }
  const r = p.rooms.find((x) => x.id === h.id);
  if (!r || h.i < 0 || h.i >= r.poly.length) return null;
  return { a: r.poly[h.i], b: r.poly[(h.i + 1) % r.poly.length], room: r };
}

/** Where an opening of width w centred at fraction s sits on a segment. */
export function openingSpan(a: Pt, b: Pt, s: number, w: number) {
  const L = dist(a, b) || 1e-6;
  const ww = Math.min(w, L);
  const c = L > ww ? Math.min(L - ww / 2, Math.max(ww / 2, s * L)) : L / 2;
  const tx = (b[0] - a[0]) / L;
  const ty = (b[1] - a[1]) / L;
  const p0: Pt = [a[0] + tx * (c - ww / 2), a[1] + ty * (c - ww / 2)];
  const p1: Pt = [a[0] + tx * (c + ww / 2), a[1] + ty * (c + ww / 2)];
  return { p0, p1, tx, ty, len: ww, mid: lerpPt(p0, p1, 0.5) as Pt };
}

const PROBES = [0.1, 0.2, 0.3, 0.45];

function roomAt(rooms: Room[], x: number, y: number): number {
  for (let i = 0; i < rooms.length; i++) if (inPoly(x, y, rooms[i].poly)) return i;
  return -1;
}

function probe(rooms: Room[], mid: Pt, nx: number, ny: number, sign: number): number {
  for (const d of PROBES) {
    const i = roomAt(rooms, mid[0] + sign * nx * d, mid[1] + sign * ny * d);
    if (i >= 0) return i;
  }
  return -1;
}

/** Rooms on both sides of a point on a wall (index into project rooms, -1 for none). */
export function sidesAt(rooms: Room[], mid: Pt, nx: number, ny: number): [number, number] {
  return [probe(rooms, mid, nx, ny, 1), probe(rooms, mid, nx, ny, -1)];
}

function cutSegments(segs: Pt[][], c: Pt, tx: number, ty: number, halfW: number): Pt[][] {
  const out: Pt[][] = [];
  for (const sg of segs) {
    const [P, Q] = sg;
    const L = dist(P, Q);
    if (L < 1e-6) continue;
    const ux = (Q[0] - P[0]) / L;
    const uy = (Q[1] - P[1]) / L;
    const cross = Math.abs(ux * ty - uy * tx);
    const perp = Math.abs((c[0] - P[0]) * -uy + (c[1] - P[1]) * ux);
    if (cross > 0.14 || perp > 0.4) { out.push(sg); continue; }
    const along = (c[0] - P[0]) * ux + (c[1] - P[1]) * uy;
    const lo = along - halfW;
    const hi = along + halfW;
    if (hi <= 0 || lo >= L) { out.push(sg); continue; }
    if (lo > 0.01) out.push([P, [P[0] + ux * lo, P[1] + uy * lo]]);
    if (hi < L - 0.01) out.push([[P[0] + ux * hi, P[1] + uy * hi], Q]);
  }
  return out;
}

/** Remove the parts of segment e that lie along any segment in `others` (collinear within tol). */
function subtractShared(e: Pt[], others: Pt[][], tol: number): Pt[][] {
  let segs: Pt[][] = [e];
  for (const [P, Q] of others) {
    const L = dist(P, Q);
    if (L < 1e-6) continue;
    const tx = (Q[0] - P[0]) / L;
    const ty = (Q[1] - P[1]) / L;
    const next: Pt[][] = [];
    for (const sg of segs) {
      const [A, B] = sg;
      const l = dist(A, B);
      if (l < 1e-6) continue;
      const ux = (B[0] - A[0]) / l;
      const uy = (B[1] - A[1]) / l;
      if (Math.abs(ux * ty - uy * tx) > 0.14) { next.push(sg); continue; }
      const perp = Math.abs((P[0] - A[0]) * -uy + (P[1] - A[1]) * ux);
      if (perp > tol) { next.push(sg); continue; }
      const p0 = (P[0] - A[0]) * ux + (P[1] - A[1]) * uy;
      const p1 = (Q[0] - A[0]) * ux + (Q[1] - A[1]) * uy;
      const lo = Math.min(p0, p1);
      const hi = Math.max(p0, p1);
      if (hi <= 0 || lo >= l) { next.push(sg); continue; }
      if (lo > 0.02) next.push([A, [A[0] + ux * lo, A[1] + uy * lo]]);
      if (hi < l - 0.02) next.push([[A[0] + ux * hi, A[1] + uy * hi], B]);
    }
    segs = next;
  }
  return segs;
}

/** Length of the stretch where two segments run side by side within tol. */
function overlapLen(a: Pt[], b: Pt[], tol: number): number {
  const L = dist(a[0], a[1]);
  const M = dist(b[0], b[1]);
  if (L < 1e-6 || M < 1e-6) return 0;
  const ux = (a[1][0] - a[0][0]) / L;
  const uy = (a[1][1] - a[0][1]) / L;
  const vx = (b[1][0] - b[0][0]) / M;
  const vy = (b[1][1] - b[0][1]) / M;
  if (Math.abs(ux * vy - uy * vx) > 0.14) return 0;
  const perp = Math.abs((b[0][0] - a[0][0]) * -uy + (b[0][1] - a[0][1]) * ux);
  if (perp > tol) return 0;
  const p0 = (b[0][0] - a[0][0]) * ux + (b[0][1] - a[0][1]) * uy;
  const p1 = (b[1][0] - a[0][0]) * ux + (b[1][1] - a[0][1]) * uy;
  return Math.max(0, Math.min(L, Math.max(p0, p1)) - Math.max(0, Math.min(p0, p1)));
}

export function compile(p: Project): Scene {
  const warnings: string[] = [];
  const H = p.ceiling;
  const idxOf = new Map<string, number>();
  p.rooms.forEach((r, i) => idxOf.set(r.id, i));

  // zones: union-find over the open-plan links
  const par = p.rooms.map((_, i) => i);
  const find = (i: number): number => (par[i] === i ? i : (par[i] = find(par[i])));
  p.rooms.forEach((r, i) => {
    const j = r.zone ? idxOf.get(r.zone) : undefined;
    if (j !== undefined && r.type !== "balcony" && p.rooms[j].type !== "balcony") par[find(i)] = find(j);
  });
  const zoneMap = new Map<number, number>();
  const zones: number[][] = [];
  const zoneOf = p.rooms.map((r, i) => {
    if (r.type === "balcony") return -1;
    const root = find(i);
    if (!zoneMap.has(root)) { zoneMap.set(root, zones.length); zones.push([]); }
    const z = zoneMap.get(root)!;
    zones[z].push(i);
    return z;
  });

  // openings
  const windows: CWin[] = [];
  const doors: CDoor[] = [];
  const cuts: { c: Pt; tx: number; ty: number; half: number }[] = [];
  for (const o of p.openings) {
    const hs = hostSeg(p, o.host);
    if (!hs) { warnings.push("An opening lost its wall and was skipped."); continue; }
    const sp = openingSpan(hs.a, hs.b, o.s, o.w);
    let nx = -sp.ty;
    let ny = sp.tx;
    const [sa, sb] = sidesAt(p.rooms, sp.mid, nx, ny);
    const indoorA = sa >= 0 && p.rooms[sa].type !== "balcony";
    const indoorB = sb >= 0 && p.rooms[sb].type !== "balcony";
    if (o.kind === "window") {
      if (indoorA === indoorB) {
        warnings.push(indoorA ? "A window sits between two rooms and was ignored." : "A window is not on the edge of any room and was ignored.");
        continue;
      }
      // the normal must point away from the indoor side
      if (indoorA) { nx = -nx; ny = -ny; }
      const room = indoorA ? sa : sb;
      const g = GLAZE[o.glaze ?? "clear"];
      const hgt = Math.max(0.1, o.head - o.sill);
      windows.push({
        id: o.id, room, p0: sp.p0, p1: sp.p1, tx: sp.tx, ty: sp.ty, nx, ny, len: sp.len, mid: sp.mid,
        zs: o.sill, zh: o.head, tau: g.tau, diffuseOnly: g.diffuseOnly,
        area: sp.len * hgt * (o.free ?? 0.6), fixed: !!o.fixed, shelter: !!o.shelter,
      });
      cuts.push({ c: sp.mid, tx: sp.tx, ty: sp.ty, half: sp.len / 2 });
    } else {
      if (!indoorA || !indoorB || sa === sb) continue; // entry doors and doors to nowhere are not part of the model
      const types = [p.rooms[sa].type, p.rooms[sb].type];
      const group: DoorGroup = types.includes("toilet") ? "toi" : types.includes("kitchen") || types.includes("utility") ? "kit" : types.includes("bedroom") ? "bed" : null;
      doors.push({ id: o.id, a: sa, b: sb, mid: sp.mid, nx, ny, w: sp.len, group, doorway: !!o.doorway });
      if (o.doorway) cuts.push({ c: sp.mid, tx: sp.tx, ty: sp.ty, half: sp.len / 2 });
    }
  }

  // blocking walls: indoor room edges (except open-plan stretches) plus drawn walls, minus openings
  let segs: Pt[][] = [];
  p.rooms.forEach((r, i) => {
    if (r.type === "balcony") return;
    const mates: Pt[][] = [];
    zones[zoneOf[i]].forEach((j) => {
      if (j === i) return;
      const q = p.rooms[j].poly;
      for (let k = 0; k < q.length; k++) mates.push([q[k], q[(k + 1) % q.length]]);
    });
    for (let k = 0; k < r.poly.length; k++) {
      const e: Pt[] = [r.poly[k], r.poly[(k + 1) % r.poly.length]];
      segs.push(...(mates.length ? subtractShared(e, mates, 0.45) : [e]));
    }
  });
  for (const w of p.walls) segs.push([w.a, w.b]);
  for (const c of cuts) segs = cutSegments(segs, c.c, c.tx, c.ty, c.half);
  const walls = new Float64Array(segs.length * 4);
  const wallBox = new Float64Array(segs.length * 4);
  segs.forEach(([a, b], i) => {
    walls.set([a[0], a[1], b[0], b[1]], i * 4);
    wallBox.set([Math.min(a[0], b[0]) - 0.01, Math.min(a[1], b[1]) - 0.01, Math.max(a[0], b[0]) + 0.01, Math.max(a[1], b[1]) + 0.01], i * 4);
  });

  // adjacency from shared walls and doors
  const adjacency: Adjacency[] = [];
  const edges = p.rooms.map((r) => r.poly.map((_, k) => [r.poly[k], r.poly[(k + 1) % r.poly.length]] as Pt[]));
  for (let i = 0; i < p.rooms.length; i++) {
    for (let j = i + 1; j < p.rooms.length; j++) {
      let len = 0;
      for (const e of edges[i]) for (const f of edges[j]) len += overlapLen(e, f, 0.45);
      const nd = doors.filter((d) => (d.a === i && d.b === j) || (d.a === j && d.b === i)).length;
      if (len > 0.2 || nd) adjacency.push({ a: i, b: j, len, doors: nd });
    }
  }

  // balconies: outward direction from the indoor room they share a wall with
  const balcNormal = (bi: number): Pt | null => {
    let best = 0;
    let n: Pt | null = null;
    for (let i = 0; i < p.rooms.length; i++) {
      if (p.rooms[i].type === "balcony") continue;
      for (const e of edges[i]) for (const f of edges[bi]) {
        const l = overlapLen(e, f, 0.45);
        if (l > best) {
          best = l;
          const L = dist(e[0], e[1]) || 1;
          let nx = -(e[1][1] - e[0][1]) / L;
          let ny = (e[1][0] - e[0][0]) / L;
          const m = lerpPt(e[0], e[1], 0.5);
          if (inPoly(m[0] + nx * 0.2, m[1] + ny * 0.2, p.rooms[i].poly)) { nx = -nx; ny = -ny; }
          n = [nx, ny];
        }
      }
    }
    return n;
  };

  const rooms: CRoom[] = p.rooms.map((r, i) => {
    const outdoor = r.type === "balcony";
    const A = polyArea(r.poly);
    const bn = outdoor ? balcNormal(i) : null;
    if (outdoor && !bn) warnings.push(`${r.name} does not touch a room, so its sky view is not modelled.`);
    return {
      id: r.id, name: r.name, type: r.type, outdoor, poly: r.poly,
      target: r.target ?? roomTarget(r.type), zone: zoneOf[i], areaM2: A,
      k: outdoor ? 0 : (1.05 * A) / (2 * A + polyPerim(r.poly) * H),
      anchor: anchorPoint(r.poly), slab: !!r.slab, bn, borrow: null, cells: new Int32Array(0),
    };
  });

  // borrowed light: explicit, otherwise windowless rooms borrow from the room their door opens to
  const hasGlass = new Set(windows.map((w) => w.room));
  rooms.forEach((r, i) => {
    const pr = p.rooms[i];
    if (r.outdoor) return;
    if (pr.borrow) {
      const j = idxOf.get(pr.borrow.from);
      if (j !== undefined && j !== i && !rooms[j].outdoor) r.borrow = { from: j, f: pr.borrow.f };
      return;
    }
    if (hasGlass.has(i)) return;
    let best = -1;
    let bestScore = 0;
    for (const a of adjacency) {
      const j = a.a === i ? a.b : a.b === i ? a.a : -1;
      if (j < 0 || rooms[j].outdoor || rooms[j].zone === r.zone) continue;
      const score = (a.doors ? 1000 : 0) + (hasGlass.has(j) ? 100 : 0) + rooms[j].areaM2;
      if (score > bestScore) { bestScore = score; best = j; }
    }
    if (best >= 0) r.borrow = { from: best, f: 0.12 };
  });
  // processing order: sources before borrowers, cycles broken
  const order: number[] = [];
  const state = new Array(rooms.length).fill(0);
  const visit = (i: number) => {
    if (state[i] === 2) return;
    if (state[i] === 1) { rooms[i].borrow = null; return; }
    state[i] = 1;
    const b = rooms[i].borrow;
    if (b) visit(b.from);
    if (state[i] === 1) { state[i] = 2; order.push(i); }
  };
  rooms.forEach((_, i) => visit(i));

  // work-plane cells
  const all = p.rooms.flatMap((r) => r.poly);
  const box = all.length ? bbox(all) : { x0: 0, y0: 0, x1: 1, y1: 1 };
  const totalA = rooms.reduce((s, r) => s + r.areaM2, 0) || 1;
  const s = Math.min(0.2, Math.max(0.08, Math.sqrt(totalA / 9000)));
  const x0 = box.x0 - 0.05;
  const y0 = box.y0 - 0.05;
  const cols = Math.max(1, Math.ceil((box.x1 - x0 + 0.05) / s));
  const rows = Math.max(1, Math.ceil((box.y1 - y0 + 0.05) / s));
  const cx: number[] = [], cy: number[] = [], cr: number[] = [], cg: number[] = [];
  const boxes = rooms.map((r) => bbox(r.poly));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = x0 + (i + 0.5) * s;
      const y = y0 + (j + 0.5) * s;
      for (let r = 0; r < rooms.length; r++) {
        const b = boxes[r];
        if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
        if (inPoly(x, y, rooms[r].poly)) { cx.push(x); cy.push(y); cr.push(r); cg.push(j * cols + i); break; }
      }
    }
  }
  const N = cx.length;
  const CR = Int16Array.from(cr);
  rooms.forEach((r, ri) => {
    const idx: number[] = [];
    for (let i = 0; i < N; i++) if (CR[i] === ri) idx.push(i);
    r.cells = Int32Array.from(idx);
  });

  return {
    H, rooms, zones, windows, doors, walls, wallBox,
    slabs: rooms.filter((r) => r.outdoor && r.slab).map((r) => r.poly),
    adjacency, order, warnings,
    grid: { x0, y0, s, cols, rows, x1: x0 + cols * s, y1: y0 + rows * s },
    N, CX: Float32Array.from(cx), CY: Float32Array.from(cy), CR, CG: Int32Array.from(cg),
  };
}
