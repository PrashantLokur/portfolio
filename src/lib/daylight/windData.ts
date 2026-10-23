import type { Rose } from "./wind";

export interface SeasonDef { id: string; name: string; short: string; months: number[] }
export interface SeasonScheme { id: "india" | "quarters"; label: string; seasons: SeasonDef[] }

export const SCHEMES: Record<"india" | "quarters", SeasonScheme> = {
  india: {
    id: "india",
    label: "Indian seasons",
    seasons: [
      { id: "win", name: "Winter (Dec–Feb)", short: "Winter", months: [12, 1, 2] },
      { id: "hot", name: "Hot season (Mar–May)", short: "Hot season", months: [3, 4, 5] },
      { id: "mon", name: "Monsoon (Jun–Sep)", short: "Monsoon", months: [6, 7, 8, 9] },
      { id: "post", name: "Post-monsoon (Oct–Nov)", short: "Post-monsoon", months: [10, 11] },
    ],
  },
  quarters: {
    id: "quarters",
    label: "Calendar quarters",
    seasons: [
      { id: "q1", name: "Jan–Mar", short: "Jan–Mar", months: [1, 2, 3] },
      { id: "q2", name: "Apr–Jun", short: "Apr–Jun", months: [4, 5, 6] },
      { id: "q3", name: "Jul–Sep", short: "Jul–Sep", months: [7, 8, 9] },
      { id: "q4", name: "Oct–Dec", short: "Oct–Dec", months: [10, 11, 12] },
    ],
  },
};

export const ALL_SEASON: SeasonDef = { id: "all", name: "Whole year", short: "Whole year", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] };

export const seasonsOf = (scheme: SeasonScheme) => [...scheme.seasons, ALL_SEASON];

export const inIndia = (lat: number, lon: number) => lat >= 6 && lat <= 36 && lon >= 68 && lon <= 98;
export const defaultScheme = (lat: number, lon: number): SeasonScheme => (inIndia(lat, lon) ? SCHEMES.india : SCHEMES.quarters);

export interface WindRecord {
  lat: number;
  lon: number;
  tz?: string;
  years: number;
  from: string;
  to: string;
  /** Rose per season id, for both schemes. */
  roses: Record<string, Rose>;
  fetched: number;
}

const KEY = (lat: number, lon: number) => `daylight.wind.v1.${lat.toFixed(2)},${lon.toFixed(2)}`;

export function readCache(lat: number, lon: number): WindRecord | null {
  try {
    const raw = localStorage.getItem(KEY(lat, lon));
    if (!raw) return null;
    const r = JSON.parse(raw) as WindRecord;
    return r && r.roses && r.roses.all ? r : null;
  } catch {
    return null;
  }
}

function writeCache(r: WindRecord) {
  try {
    localStorage.setItem(KEY(r.lat, r.lon), JSON.stringify(r));
  } catch {
    /* storage full or blocked: the record still works for this session */
  }
}

interface ArchiveResponse {
  timezone?: string;
  hourly?: { time: string[]; wind_speed_10m: (number | null)[]; wind_direction_10m: (number | null)[] };
  reason?: string;
}

/** Reduce hourly records to 16-sector frequency (% of hours) and mean speed (m/s) per season. */
export function reduce(time: string[], spd: (number | null)[], dir: (number | null)[]): Record<string, Rose> {
  const defs = [...SCHEMES.india.seasons, ...SCHEMES.quarters.seasons, ALL_SEASON];
  const byMonth: Record<number, string[]> = {};
  for (const d of defs) for (const m of d.months) (byMonth[m] ||= []).push(d.id);
  const cnt: Record<string, number[]> = {};
  const sum: Record<string, number[]> = {};
  const tot: Record<string, number> = {};
  const spdSum: Record<string, number> = {};
  for (const d of defs) { cnt[d.id] = new Array(16).fill(0); sum[d.id] = new Array(16).fill(0); tot[d.id] = 0; spdSum[d.id] = 0; }
  for (let i = 0; i < time.length; i++) {
    const v = spd[i], a = dir[i];
    if (v == null || a == null) continue;
    const m = Number(time[i].slice(5, 7));
    const k = Math.round((((a % 360) + 360) % 360) / 22.5) % 16;
    for (const id of byMonth[m] || []) { cnt[id][k]++; sum[id][k] += v; tot[id]++; spdSum[id] += v; }
  }
  const out: Record<string, Rose> = {};
  for (const d of defs) {
    const t = tot[d.id] || 1;
    const mean = spdSum[d.id] / t;
    out[d.id] = {
      f: cnt[d.id].map((c) => Math.round((c / t) * 1000) / 10),
      v: sum[d.id].map((s, k) => (cnt[d.id][k] ? Math.round((s / cnt[d.id][k]) * 100) / 100 : Math.round(mean * 100) / 100)),
      mean: Math.round(mean * 100) / 100,
    };
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");

async function fetchYears(lat: number, lon: number, years: number, signal?: AbortSignal) {
  const end = new Date().getFullYear() - 1;
  const start = end - years + 1;
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    start_date: `${start}-01-01`,
    end_date: `${end}-12-31`,
    hourly: "wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "ms",
    timezone: "auto",
  });
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${q}`, { signal });
  if (!res.ok) {
    let reason = "";
    try { reason = ((await res.json()) as ArchiveResponse).reason ?? ""; } catch { /* body was not JSON */ }
    throw new Error(`Open-Meteo answered ${res.status}${reason ? `: ${reason}` : ""}`);
  }
  const j = (await res.json()) as ArchiveResponse;
  if (!j.hourly?.time?.length) throw new Error("Open-Meteo returned no hourly wind data for this point.");
  return { j, start, end };
}

/** Ten years of ERA5 hourly wind from Open-Meteo for a pin; five years if the request is refused. Cached by rounded coordinates. */
export async function loadWind(lat: number, lon: number, signal?: AbortSignal): Promise<WindRecord> {
  const hit = readCache(lat, lon);
  if (hit) return hit;
  let got;
  try {
    got = await fetchYears(lat, lon, 10, signal);
  } catch (e) {
    if (signal?.aborted) throw e;
    got = await fetchYears(lat, lon, 5, signal);
  }
  const { j, start, end } = got;
  const h = j.hourly!;
  const rec: WindRecord = {
    lat: Number(lat.toFixed(2)),
    lon: Number(lon.toFixed(2)),
    tz: j.timezone,
    years: end - start + 1,
    from: `${start}-${pad(1)}`,
    to: `${end}-${pad(12)}`,
    roses: reduce(h.time, h.wind_speed_10m, h.wind_direction_10m),
    fetched: Date.now(),
  };
  writeCache(rec);
  return rec;
}

/** Power-law scaling of 10 m wind to the height of the flat. */
export const heightFactor = (floor: number, alpha: number) => Math.pow(Math.max(2, floor * 3 + 1.5) / 10, alpha);

/** Dominant sector direction, its share of hours, and the mean speed for a rose. */
export function dominant(rose: Rose) {
  let km = 0;
  rose.f.forEach((f, k) => { if (f > rose.f[km]) km = k; });
  const share = rose.f[(km + 15) % 16] + rose.f[km] + rose.f[(km + 1) % 16];
  return { km, dir: km * 22.5, share };
}
