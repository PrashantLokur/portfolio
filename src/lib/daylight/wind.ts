import { bearingOf, clamp, dist, wrap180 } from "./geometry";
import type { Scene } from "./scene";
import type { Pt } from "./types";

const RHO = 1.2;
const CDW = 0.6;
const DOOR_H = 2.0;
const LEAK = 0.03;
const SHELTER_CP = -0.35;

export type WindowState = "open" | "half" | "closed";
export interface WindSettings {
  win: WindowState;
  doors: { bed: boolean; kit: boolean; toi: boolean };
}
const WF: Record<WindowState, number> = { open: 1, half: 0.5, closed: 0.02 };

export interface WNode {
  name: string;
  V: number;
  rooms: number[];
  anchor: Pt;
}

export interface WEdge {
  kind: "win" | "door";
  /** Node index, or -1 for the outdoors (windows only). Positive flow runs a to b. */
  a: number;
  b: number;
  idx: number; // index into scene.windows or scene.doors
  /** Plan-relative outward bearing (windows). */
  normal: number;
  pts: Pt[];
  cum: number[];
  len: number;
  /** Index in pts of the opening itself, for single-sided exchange puffs. */
  oi: number;
}

export interface WindGraph {
  nodes: WNode[];
  edges: WEdge[];
  nodeOfRoom: Int16Array;
  /** Node per work-plane cell, -1 for balconies. */
  cellNode: Int16Array;
}

export function buildWindGraph(sc: Scene): WindGraph {
  const nodes: WNode[] = sc.zones.map((rs) => {
    const main = rs.reduce((b, r) => (sc.rooms[r].areaM2 > sc.rooms[b].areaM2 ? r : b), rs[0]);
    const area = rs.reduce((s, r) => s + sc.rooms[r].areaM2, 0);
    return { name: rs.map((r) => sc.rooms[r].name).join(" + "), V: area * sc.H, rooms: rs, anchor: sc.rooms[main].anchor };
  });
  const nodeOfRoom = new Int16Array(sc.rooms.length).fill(-1);
  sc.rooms.forEach((r, i) => { nodeOfRoom[i] = r.outdoor ? -1 : r.zone; });
  const cellNode = new Int16Array(sc.N);
  for (let i = 0; i < sc.N; i++) cellNode[i] = nodeOfRoom[sc.CR[i]];

  const withLen = (pts: Pt[], oi: number, rest: Omit<WEdge, "pts" | "cum" | "len" | "oi">): WEdge => {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i], pts[i - 1]));
    return { ...rest, pts, cum, len: cum[cum.length - 1], oi };
  };
  const edges: WEdge[] = [];
  const near = (a: Pt, b: Pt) => dist(a, b) < 0.4;
  sc.windows.forEach((w, wi) => {
    const nd = nodeOfRoom[w.room];
    if (nd < 0) return;
    const n = nodes[nd];
    const ra = sc.rooms[w.room].anchor;
    const pts: Pt[] = [
      [w.mid[0] + w.nx * 2.4, w.mid[1] + w.ny * 2.4],
      [w.mid[0] + w.nx * 0.05, w.mid[1] + w.ny * 0.05],
      [w.mid[0] - w.nx * 0.5, w.mid[1] - w.ny * 0.5],
      ra,
    ];
    if (!near(ra, n.anchor)) pts.push(n.anchor);
    edges.push(withLen(pts, 1, { kind: "win", a: -1, b: nd, idx: wi, normal: bearingOf(w.nx, w.ny) }));
  });
  sc.doors.forEach((d, di) => {
    const na = nodeOfRoom[d.a];
    const nb = nodeOfRoom[d.b];
    if (na < 0 || nb < 0 || na === nb) return;
    const pts: Pt[] = [nodes[na].anchor];
    const aa = sc.rooms[d.a].anchor;
    const ab = sc.rooms[d.b].anchor;
    if (!near(aa, nodes[na].anchor)) pts.push(aa);
    pts.push([d.mid[0] + d.nx * 0.5, d.mid[1] + d.ny * 0.5], d.mid, [d.mid[0] - d.nx * 0.5, d.mid[1] - d.ny * 0.5]);
    if (!near(ab, nodes[nb].anchor)) pts.push(ab);
    pts.push(nodes[nb].anchor);
    edges.push(withLen(pts, 0, { kind: "door", a: na, b: nb, idx: di, normal: 0 }));
  });
  return { nodes, edges, nodeOfRoom, cellNode };
}

const CP_TAB: [number, number][] = [[0, 0.6], [30, 0.45], [60, 0.1], [90, -0.45], [120, -0.45], [150, -0.35], [180, -0.3]];
export function cpAt(a: number): number {
  a = Math.abs(a);
  for (let i = 1; i < CP_TAB.length; i++) {
    if (a <= CP_TAB[i][0]) {
      const p = CP_TAB[i - 1], q = CP_TAB[i];
      return p[1] + ((q[1] - p[1]) * (a - p[0])) / (q[0] - p[0]);
    }
  }
  return -0.3;
}
/** Pressure coefficient on a face whose outward normal points to bearing `normal`, for wind from `from`. */
export const faceCp = (normal: number, from: number) => cpAt(wrap180(from - normal));

export interface WindResult {
  /** Flow through each edge, m3/s, positive a to b. */
  Q: number[];
  /** Effective opening area per edge, m2. */
  A: number[];
  /** Single-sided exchange per edge, m3/s (windows only). */
  pq: number[];
  /** Cp per window edge. */
  cp: number[];
  /** Through-flow into each node, m3/s. */
  inn: number[];
  ach: number[];
  hasExt: boolean[];
}

export function edgeArea(sc: Scene, e: WEdge, set: WindSettings): number {
  if (e.kind === "win") {
    const w = sc.windows[e.idx];
    return w.area * (w.fixed ? 1 : WF[set.win]);
  }
  const d = sc.doors[e.idx];
  if (d.doorway) return d.w * DOOR_H;
  if (d.group) return set.doors[d.group] ? d.w * DOOR_H : LEAK;
  return d.w * DOOR_H;
}

/** Pressure-network solve: nodes are rooms (or open-plan groups), edges are openings. */
export function solveWind(sc: Scene, g: WindGraph, north: number, dir: number, U: number, set: WindSettings): WindResult {
  const q = 0.5 * RHO * U * U;
  const nN = g.nodes.length;
  const A = g.edges.map((e) => edgeArea(sc, e, set));
  const C = A.map((a) => CDW * a * Math.sqrt(2 / RHO));
  const extP = g.edges.map((e) => (e.kind === "win" ? q * (sc.windows[e.idx].shelter ? SHELTER_CP : faceCp(north + e.normal, dir)) : 0));
  const cp = extP.map((p) => (q > 0 ? p / q : 0));
  const p = new Array<number>(nN).fill(0);
  const nbr: { o: number; ext: number; c: number }[][] = g.nodes.map(() => []);
  g.edges.forEach((e, k) => {
    if (e.a < 0) nbr[e.b].push({ o: -1, ext: extP[k], c: C[k] });
    else { nbr[e.a].push({ o: e.b, ext: 0, c: C[k] }); nbr[e.b].push({ o: e.a, ext: 0, c: C[k] }); }
  });
  for (let sweep = 0; sweep < 120; sweep++) {
    let md = 0;
    for (let i = 0; i < nN; i++) {
      if (!nbr[i].length) continue;
      const nb = nbr[i].map((n) => [n.o < 0 ? n.ext : p[n.o], n.c] as const);
      let lo = Infinity, hi = -Infinity;
      for (const [pp] of nb) { lo = Math.min(lo, pp); hi = Math.max(hi, pp); }
      let a = lo, b = hi;
      for (let it = 0; it < 26; it++) {
        const m = (a + b) / 2;
        let f = 0;
        for (const [pp, c] of nb) { const d = pp - m; f += c * Math.sign(d) * Math.sqrt(Math.abs(d)); }
        if (f > 0) a = m; else b = m;
      }
      const np = (a + b) / 2;
      md = Math.max(md, Math.abs(np - p[i]));
      p[i] = np;
    }
    if (md < 1e-5) break;
  }
  const press = (e: WEdge, k: number, side: "a" | "b") => (side === "a" ? (e.a < 0 ? extP[k] : p[e.a]) : p[e.b]);
  const Q = g.edges.map((e, k) => {
    const d = press(e, k, "a") - press(e, k, "b");
    return C[k] * Math.sign(d) * Math.sqrt(Math.abs(d));
  });
  const inn = new Array<number>(nN).fill(0);
  const pul = new Array<number>(nN).fill(0);
  const pq = g.edges.map(() => 0);
  const hasExt = new Array<boolean>(nN).fill(false);
  g.edges.forEach((e, k) => {
    inn[e.b] += Math.max(Q[k], 0);
    if (e.a >= 0) inn[e.a] += Math.max(-Q[k], 0);
    if (e.kind === "win") { pq[k] = 0.025 * A[k] * U; pul[e.b] += pq[k]; hasExt[e.b] = true; }
  });
  const ach = g.nodes.map((n, i) => (3600 * Math.sqrt(inn[i] * inn[i] + pul[i] * pul[i])) / n.V);
  return { Q, A, pq, cp, inn, ach, hasExt };
}

export interface Rose { f: number[]; v: number[]; mean: number }

export interface WindTables {
  /** Seasonal tables keyed by season id, plus "all". */
  [id: string]: Rose;
}

/** Air changes per hour for every 22.5 degree sector at one speed. */
export function directionChart(sc: Scene, g: WindGraph, north: number, U: number, set: WindSettings): number[][] {
  const out: number[][] = [];
  for (let k = 0; k < 16; k++) out.push(solveWind(sc, g, north, k * 22.5, U, set).ach);
  return out;
}

/** Frequency-weighted air changes per hour, each sector at its own mean speed (already scaled to the flat). */
export function seasonAverage(sc: Scene, g: WindGraph, north: number, rose: Rose, uf: number, set: WindSettings): number[] {
  const tot = rose.f.reduce((a, b) => a + b, 0) || 1;
  const avg = g.nodes.map(() => 0);
  for (let k = 0; k < 16; k++) {
    if (rose.f[k] <= 0) continue;
    const a = solveWind(sc, g, north, k * 22.5, (rose.v[k] || rose.mean) * uf, set).ach;
    for (let i = 0; i < avg.length; i++) avg[i] += (a[i] * rose.f[k]) / tot;
  }
  return avg;
}

interface Particle { e: number; s: number; dir: 1 | -1; pulse: boolean; left: number; a: number }

/** Air parcels that follow the solved flows from opening to opening. */
export class ParticleSim {
  list: Particle[] = [];
  private acc: number[] = [];
  private pul: number[] = [];

  constructor(private g: WindGraph) {
    this.acc = g.edges.map(() => 0);
    this.pul = g.edges.map(() => 0);
  }

  clear() { this.list.length = 0; }

  step(dt: number, r: WindResult) {
    const { g, list } = this;
    const { Q, A } = r;
    g.edges.forEach((e, k) => {
      const aq = Math.abs(Q[k]);
      if (aq > 1e-3) {
        const srcExt = Q[k] > 0 ? e.a < 0 : e.b < 0;
        if (srcExt) {
          this.acc[k] += 30 * Math.sqrt(aq) * dt;
          while (this.acc[k] >= 1) { this.acc[k] -= 1; if (list.length < 700) list.push({ e: k, s: Q[k] > 0 ? 0 : e.len, dir: Q[k] > 0 ? 1 : -1, pulse: false, left: 0, a: 1 }); }
        }
      }
      if (e.kind === "win" && r.pq[k] > 1e-4 && aq < 2 * r.pq[k]) {
        this.pul[k] += 3.5 * Math.sqrt(r.pq[k]) * dt;
        while (this.pul[k] >= 1) { this.pul[k] -= 1; if (list.length < 700) list.push({ e: k, s: e.cum[e.oi], dir: 1, pulse: true, left: 1.22, a: 1 }); }
      }
    });
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const e = g.edges[p.e];
      if (p.pulse) {
        const v = 0.385 * dt;
        p.s += p.dir * v; p.left -= v; p.a = Math.max(0, p.left / 1.22);
        if (p.left <= 0 || p.s < 0 || p.s > e.len) list.splice(i, 1);
        continue;
      }
      p.s += p.dir * clamp(Math.abs(Q[p.e]) / Math.max(A[p.e], 0.05), 0.3, 6) * 0.705 * dt;
      if (p.s >= e.len || p.s <= 0) {
        const end = p.dir > 0 ? e.b : e.a;
        if (end < 0) { list.splice(i, 1); continue; }
        const cand: [number, number][] = [];
        let tot = 0;
        g.edges.forEach((e2, k2) => {
          const out = e2.a === end ? Q[k2] : e2.b === end ? -Q[k2] : 0;
          if (out > 1e-3) { cand.push([k2, out]); tot += out; }
        });
        if (!cand.length) { list.splice(i, 1); continue; }
        let rr = Math.random() * tot;
        let pick = cand[0];
        for (const c of cand) { rr -= c[1]; if (rr <= 0) { pick = c; break; } }
        const e2 = g.edges[pick[0]];
        const fwd = e2.a === end;
        p.e = pick[0]; p.dir = fwd ? 1 : -1; p.s = fwd ? 0 : e2.len;
      }
    }
  }

  private posAt(e: WEdge, s: number): [number, number, number, number] {
    const c = e.cum;
    let i = 1;
    while (i < c.length - 1 && c[i] < s) i++;
    const t = clamp((s - c[i - 1]) / (c[i] - c[i - 1] || 1), 0, 1);
    const a = e.pts[i - 1], b = e.pts[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, b[0] - a[0], b[1] - a[1]];
  }

  /** Draw in plan metres; the caller sets the context transform. */
  draw(c: CanvasRenderingContext2D) {
    c.lineCap = "round";
    for (const p of this.list) {
      const e = this.g.edges[p.e];
      const q = this.posAt(e, p.s);
      const L = Math.hypot(q[2], q[3]) || 1;
      const ux = (q[2] / L) * p.dir, uy = (q[3] / L) * p.dir;
      const len = p.pulse ? 0.13 : 0.26;
      c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[0] - ux * len, q[1] - uy * len);
      c.strokeStyle = `rgba(8,14,22,${0.38 * p.a})`; c.lineWidth = 0.083; c.stroke();
      c.strokeStyle = `rgba(255,255,255,${0.94 * p.a})`; c.lineWidth = 0.044; c.stroke();
    }
  }
}

export const WRAMP: [number, number[]][] = [[0, [84, 70, 56]], [0.35, [134, 116, 74]], [0.6, [62, 138, 120]], [1, [26, 168, 200]]];
function wramp(t: number): number[] {
  for (let k = 1; k < WRAMP.length; k++) {
    if (t <= WRAMP[k][0]) {
      const a = WRAMP[k - 1], b = WRAMP[k], u = (t - a[0]) / (b[0] - a[0]);
      return [a[1][0] + (b[1][0] - a[1][0]) * u, a[1][1] + (b[1][1] - a[1][1]) * u, a[1][2] + (b[1][2] - a[1][2]) * u];
    }
  }
  return WRAMP[WRAMP.length - 1][1];
}

export function paintWind(sc: Scene, g: WindGraph, ach: number[]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(sc.grid.cols * sc.grid.rows * 4);
  const lg = Math.log10(41);
  for (let i = 0; i < sc.N; i++) {
    const n = g.cellNode[i];
    const o = sc.CG[i] * 4;
    const c = n < 0 ? [56, 78, 98] : wramp(clamp(Math.log10(1 + ach[n]) / lg, 0, 1));
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = n < 0 ? 150 : 255;
  }
  return d;
}

export const achStatus = (a: number): ["good" | "mid" | "low", string] => (a >= 15 ? ["good", "Breezy"] : a >= 6 ? ["mid", "Fresh"] : ["low", "Stuffy"]);
export const fmtA = (a: number) => (a < 10 ? a.toFixed(1) : a >= 100 ? "100+" : String(Math.round(a)));
