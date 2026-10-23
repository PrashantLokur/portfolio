import { clamp, D2R } from "./geometry";
import { PATCHES, outdoor, solar, utcOffset, type DateYMD, type Sky } from "./solar";
import { Z0, type Scene } from "./scene";

export interface DayParams {
  date: DateYMD;
  sky: Sky;
  lat: number;
  lon: number;
  tz?: string;
  /** Bearing of plan-up. */
  north: number;
}

export interface RoomStat { mean: number; med: number; p25: number; cov: number; sun: number }

export interface Frame {
  sun: { alt: number; az: number };
  out: { dirN: number; dif: number };
  stats: RoomStat[];
  lamp: Float32Array;
}

export const T0 = 5;
export const T1 = 19;
export const STEP = 0.25;
export const NST = Math.round((T1 - T0) / STEP) + 1;

const EPS = 0.04;

export class DaylightEngine {
  readonly sc: Scene;
  readonly SF: Float32Array;
  readonly DIR: Float32Array;
  readonly AMB: Float32Array;
  readonly EV: Float32Array;
  private tmp: Float32Array;

  constructor(sc: Scene) {
    this.sc = sc;
    this.SF = new Float32Array(sc.N);
    this.DIR = new Float32Array(sc.N);
    this.AMB = new Float32Array(sc.N);
    this.EV = new Float32Array(sc.N);
    this.tmp = new Float32Array(sc.N);
  }

  private wallBlocked(x1: number, y1: number, x2: number, y2: number): boolean {
    const { walls, wallBox } = this.sc;
    const mnx = Math.min(x1, x2), mxx = Math.max(x1, x2), mny = Math.min(y1, y2), mxy = Math.max(y1, y2);
    const d1x = x2 - x1, d1y = y2 - y1;
    for (let k = 0, n = walls.length; k < n; k += 4) {
      if (wallBox[k] > mxx || wallBox[k + 2] < mnx || wallBox[k + 1] > mxy || wallBox[k + 3] < mny) continue;
      const cx = walls[k], cy = walls[k + 1];
      const d2x = walls[k + 2] - cx, d2y = walls[k + 3] - cy;
      const den = d1x * d2y - d1y * d2x;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((cx - x1) * d2y - (cy - y1) * d2x) / den;
      const u = ((cx - x1) * d1y - (cy - y1) * d1x) / den;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) return true;
    }
    return false;
  }

  private inSlab(x: number, y: number): boolean {
    for (const s of this.sc.slabs) {
      let c = false;
      for (let i = 0, j = s.length - 1; i < s.length; j = i++) {
        const a = s[i], b = s[j];
        if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
      }
      if (c) return true;
    }
    return false;
  }

  /** Can the work-plane point (cx, cy) see the direction (dx, dy, dz) through window w? */
  private through(cx: number, cy: number, dx: number, dy: number, dz: number, wi: number): boolean {
    const w = this.sc.windows[wi];
    const dn = dx * w.nx + dy * w.ny;
    if (dn <= 1e-6) return false;
    const dperp = (w.p0[0] - cx) * w.nx + (w.p0[1] - cy) * w.ny;
    if (dperp <= 0) return false;
    const t = dperp / dn;
    const tang = (cx + t * dx - w.p0[0]) * w.tx + (cy + t * dy - w.p0[1]) * w.ty;
    if (tang < 0 || tang > w.len) return false;
    const z = Z0 + t * dz;
    if (z < w.zs || z > w.zh) return false;
    if (this.sc.slabs.length) {
      const t2 = (this.sc.H - Z0) / dz;
      if (t2 * dn > dperp && this.inSlab(cx + t2 * dx, cy + t2 * dy)) return false;
    }
    const t1 = t - EPS / dn;
    return !this.wallBlocked(cx, cy, cx + t1 * dx, cy + t1 * dy);
  }

  /** Open-air balcony point looking along d: blocked by side walls, the facade, or the slab above. */
  private balcOpen(cx: number, cy: number, dx: number, dy: number, dz: number, bn: [number, number], slab: boolean): boolean {
    if (dx * bn[0] + dy * bn[1] <= 1e-6) return false;
    const t2 = (this.sc.H - Z0) / dz;
    const ex = cx + t2 * dx, ey = cy + t2 * dy;
    if (this.wallBlocked(cx, cy, ex, ey)) return false;
    if (slab && this.inSlab(ex, ey)) return false;
    return true;
  }

  /** Sky factor per work-plane cell: share of horizontal sky illuminance that arrives, glass included. */
  precomputeSky(onProgress?: (f: number) => void) {
    const { sc } = this;
    for (let i = 0; i < sc.N; i++) {
      const r = sc.rooms[sc.CR[i]];
      let sum = 0;
      if (r.outdoor) {
        if (r.bn) for (const p of PATCHES) if (this.balcOpen(sc.CX[i], sc.CY[i], p.dx, p.dy, p.dz, r.bn, r.slab)) sum += p.w;
      } else {
        for (let wi = 0; wi < sc.windows.length; wi++) {
          const w = sc.windows[wi];
          for (const p of PATCHES) if (this.through(sc.CX[i], sc.CY[i], p.dx, p.dy, p.dz, wi)) sum += p.w * w.tau;
        }
      }
      this.SF[i] = sum;
      if (onProgress && (i & 1023) === 0) onProgress(i / sc.N);
    }
  }

  evaluate(dp: DayParams, hour: number, sky: Sky, wantLamps: boolean): Frame {
    const { sc, DIR, AMB, EV } = this;
    const tzh = utcOffset(dp.tz, dp.lon, dp.date);
    const sun = solar(dp.date, hour, dp.lat, dp.lon, tzh);
    const out = outdoor(sun.alt, sky);
    DIR.fill(0);
    if (sun.alt > 0 && out.dirN > 0) {
      const phi = (sun.az - dp.north) * D2R;
      const ca = Math.cos(sun.alt * D2R);
      const sx = ca * Math.sin(phi), sy = -ca * Math.cos(phi), sz = Math.sin(sun.alt * D2R);
      const eh = out.dirN * sz;
      const facing: number[] = [];
      sc.windows.forEach((w, wi) => { if (!w.diffuseOnly && sx * w.nx + sy * w.ny > 1e-6) facing.push(wi); });
      for (let i = 0; i < sc.N; i++) {
        const r = sc.rooms[sc.CR[i]];
        if (r.outdoor) {
          if (r.bn && this.balcOpen(sc.CX[i], sc.CY[i], sx, sy, sz, r.bn, r.slab)) DIR[i] = eh;
          continue;
        }
        for (const wi of facing) {
          if (this.through(sc.CX[i], sc.CY[i], sx, sy, sz, wi)) { DIR[i] = eh * sc.windows[wi].tau; break; }
        }
      }
    }
    const zs = new Float64Array(sc.zones.length);
    const zn = new Float64Array(sc.zones.length);
    for (let i = 0; i < sc.N; i++) {
      AMB[i] = DIR[i] + this.SF[i] * out.dif;
      const r = sc.rooms[sc.CR[i]];
      if (!r.outdoor) { zs[r.zone] += AMB[i]; zn[r.zone]++; }
    }
    const stats: RoomStat[] = new Array(sc.rooms.length);
    for (const ri of sc.order) {
      const r = sc.rooms[ri];
      let add = 0;
      if (!r.outdoor && zn[r.zone] > 0) add = (r.k * zs[r.zone]) / zn[r.zone];
      if (r.borrow) add += r.borrow.f * stats[r.borrow.from].med;
      let sum = 0, cov = 0, dirN = 0;
      const n = r.cells.length;
      for (let q = 0; q < n; q++) {
        const i = r.cells[q];
        const e = AMB[i] + add;
        EV[i] = e;
        sum += e;
        if (!r.outdoor && e >= r.target) cov++;
        if (DIR[i] > 20) dirN++;
        this.tmp[q] = e;
      }
      if (!n) { stats[ri] = { mean: 0, med: 0, p25: 0, cov: 0, sun: 0 }; continue; }
      const sub = this.tmp.subarray(0, n);
      sub.sort();
      stats[ri] = { mean: sum / n, med: sub[n >> 1], p25: sub[Math.floor(n * 0.25)], cov: r.outdoor ? 1 : cov / n, sun: dirN / n };
    }
    const lamp = new Float32Array(sc.rooms.length);
    if (wantLamps) {
      sc.rooms.forEach((r, ri) => {
        if (r.outdoor) return;
        lamp[ri] = Math.max(0, r.target - stats[ri].p25);
        for (let q = 0; q < r.cells.length; q++) EV[r.cells[q]] += lamp[ri];
      });
    }
    return { sun, out, stats, lamp };
  }
}

export interface Curves {
  med: Float32Array[];
  cov: Float32Array[];
  out: Float32Array;
  rise: number;
  set: number;
  offH: (number | null)[];
}

export function computeCurves(eng: DaylightEngine, dp: DayParams, sky: Sky, onProgress?: (f: number) => void): Curves {
  const { sc } = eng;
  const med = sc.rooms.map(() => new Float32Array(NST));
  const cov = sc.rooms.map(() => new Float32Array(NST));
  const outC = new Float32Array(NST);
  for (let s = 0; s < NST; s++) {
    const h = T0 + s * STEP;
    const f = eng.evaluate(dp, h, sky, false);
    f.stats.forEach((q, ri) => { med[ri][s] = q.med; cov[ri][s] = q.cov; });
    outC[s] = f.out.dirN * Math.max(0, Math.sin(f.sun.alt * D2R)) + f.out.dif;
    onProgress?.(s / NST);
  }
  const tzh = utcOffset(dp.tz, dp.lon, dp.date);
  let rise: number | null = null, set: number | null = null;
  for (let m = 0; m < 24 * 60; m += 2) {
    const a = solar(dp.date, m / 60, dp.lat, dp.lon, tzh).alt;
    const b = solar(dp.date, (m + 2) / 60, dp.lat, dp.lon, tzh).alt;
    if (a <= 0 && b > 0 && rise === null) rise = (m + 1) / 60;
    if (a > 0 && b <= 0) set = (m + 1) / 60;
  }
  const offH = sc.rooms.map((r, ri) => {
    if (r.outdoor) return null;
    let c = 0;
    for (let s = 0; s < NST; s++) { const h = T0 + s * STEP; if (h >= 6 && h < 18 && cov[ri][s] >= 0.8) c++; }
    return c * STEP;
  });
  return { med, cov, out: outC, rise: rise ?? 6, set: set ?? 18, offH };
}

// ---- painting ----
const RAMP: [number, number[]][] = [[0, [12, 18, 30]], [0.33, [44, 62, 92]], [0.62, [150, 168, 190]], [1, [255, 247, 226]]];
function ramp(t: number): number[] {
  for (let k = 1; k < RAMP.length; k++) {
    if (t <= RAMP[k][0]) {
      const a = RAMP[k - 1], b = RAMP[k], u = (t - a[0]) / (b[0] - a[0]);
      return [a[1][0] + (b[1][0] - a[1][0]) * u, a[1][1] + (b[1][1] - a[1][1]) * u, a[1][2] + (b[1][2] - a[1][2]) * u];
    }
  }
  return RAMP[RAMP.length - 1][1];
}
export const BANDS: [number, number[], string][] = [
  [50, [38, 32, 82], "<50"], [100, [52, 78, 150], "50–100"], [300, [38, 138, 166], "100–300"],
  [750, [96, 184, 122], "300–750"], [2000, [232, 196, 64], "750–2000"], [1e9, [240, 128, 52], ">2000 lx"],
];
export const RAMP_STOPS = RAMP;

export function paintLux(eng: DaylightEngine, lamp: Float32Array, view: "day" | "lux"): Uint8ClampedArray {
  const { sc, EV, DIR } = eng;
  const d = new Uint8ClampedArray(sc.grid.cols * sc.grid.rows * 4);
  const lx = Math.log10(5000 / 5);
  for (let i = 0; i < sc.N; i++) {
    const e = EV[i], o = sc.CG[i] * 4;
    let c: number[];
    if (view === "lux") {
      c = BANDS[BANDS.length - 1][1];
      for (const b of BANDS) if (e < b[0]) { c = b[1]; break; }
    } else {
      const t = clamp(Math.log10(Math.max(e, 1) / 5) / lx, 0, 1);
      c = ramp(Math.pow(t, 0.9));
      const dshare = DIR[i] / (e + 1);
      if (dshare > 0.05) { const u = clamp(dshare * 0.7, 0, 0.55); c = [c[0] + (255 - c[0]) * u, c[1] + (190 - c[1]) * u, c[2] + (80 - c[2]) * u]; }
      const l = lamp[sc.CR[i]];
      if (l > 0) { const u = clamp(l / e, 0, 1) * 0.55; c = [c[0] + (255 - c[0]) * u, c[1] + (208 - c[1]) * u, c[2] + (130 - c[2]) * u]; }
    }
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  return d;
}
