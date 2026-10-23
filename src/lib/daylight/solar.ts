import { clamp, D2R } from "./geometry";

export interface DateYMD { y: number; m: number; d: number }
export interface Sun { alt: number; az: number }
export type Sky = "clear" | "part" | "over";

/** NOAA solar-position equations. `h` is local clock hours, `tz` the UTC offset in hours. */
export function solar(dt: DateYMD, h: number, lat: number, lon: number, tz: number): Sun {
  const doy = Math.round((Date.UTC(dt.y, dt.m - 1, dt.d) - Date.UTC(dt.y, 0, 0)) / 864e5);
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (h - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = h * 60 + eq + 4 * lon - 60 * tz;
  const ha = (tst / 4 - 180) * D2R;
  const la = lat * D2R;
  const cz = Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha);
  const alt = 90 - Math.acos(clamp(cz, -1, 1)) / D2R;
  const A = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(la) - Math.tan(dec) * Math.cos(la));
  return { alt, az: (((A / D2R + 180) % 360) + 360) % 360 };
}

/** Outdoor illuminance (lx): direct normal beam and diffuse sky on a horizontal plane. */
export function outdoor(alt: number, sky: Sky): { dirN: number; dif: number } {
  if (alt <= -8) return { dirN: 0, dif: 0 };
  if (alt < 0) return { dirN: 0, dif: 400 * Math.exp(0.795 * alt) };
  const s = Math.sin(alt * D2R);
  const am = 1 / (s + 0.50572 * Math.pow(alt + 6.07995, -1.6364));
  const dirN = 110000 * Math.pow(0.8, Math.pow(am, 0.8));
  const clearDif = 400 + 14000 * Math.pow(s, 0.6);
  if (sky === "over") return { dirN: 0, dif: 400 + 20000 * Math.pow(s, 0.85) };
  if (sky === "part") return { dirN: dirN * 0.5, dif: clearDif * 1.5 };
  return { dirN, dif: clearDif };
}

export interface SkyPatch { dx: number; dy: number; dz: number; w: number }

/** 145 sky patches (7 altitude rings plus zenith) weighted for a CIE overcast sky. */
export const PATCHES: SkyPatch[] = (() => {
  const out: SkyPatch[] = [];
  const rings: [number, number][] = [[6, 30], [18, 30], [30, 24], [42, 24], [54, 18], [66, 12], [78, 6]];
  let tot = 0;
  for (const [alt, n] of rings) {
    const om = (2 * Math.PI * (Math.sin((alt + 6) * D2R) - Math.sin((alt - 6) * D2R))) / n;
    for (let k = 0; k < n; k++) {
      const phi = ((k + 0.5) / n) * 2 * Math.PI;
      const ca = Math.cos(alt * D2R);
      const sa = Math.sin(alt * D2R);
      const w = (((1 + 2 * sa) / 3) * sa * om);
      out.push({ dx: ca * Math.sin(phi), dy: -ca * Math.cos(phi), dz: sa, w });
      tot += w;
    }
  }
  const w0 = 2 * Math.PI * (1 - Math.sin(84 * D2R));
  out.push({ dx: 0, dy: 0, dz: 1, w: w0 });
  tot += w0;
  for (const p of out) p.w /= tot;
  return out;
})();

/** UTC offset (hours) of an IANA zone on a date, DST included. Null when the zone is unknown. */
export function tzOffsetOn(tz: string | undefined, dt: DateYMD): number | null {
  if (!tz) return null;
  try {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" });
    const parts = f.formatToParts(new Date(Date.UTC(dt.y, dt.m - 1, dt.d, 12)));
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    if (name === "GMT") return 0;
    const m = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(name);
    if (!m) return null;
    return (m[1] === "-" ? -1 : 1) * (Number(m[2]) + Number(m[3] ?? 0) / 60);
  } catch {
    return null;
  }
}

/** Offset used for the solar clock: the zone's own, else a rough half-hour guess from longitude. */
export function utcOffset(tz: string | undefined, lon: number, dt: DateYMD): number {
  return tzOffsetOn(tz, dt) ?? Math.round((lon / 15) * 2) / 2;
}

export const todayYMD = (): DateYMD => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
};
