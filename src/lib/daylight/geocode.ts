export interface Place { name: string; lat: number; lon: number }

const cache = new Map<string, Place[]>();
let lastCall = 0;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); rej(new DOMException("Aborted", "AbortError")); }, { once: true });
  });

/**
 * OpenStreetMap Nominatim search. Callers debounce typing; this also spaces requests at least
 * 1.1 s apart (the public server allows one per second), caches repeats, and lets the browser
 * send the page as Referer so the request identifies this site.
 */
export async function searchAddress(q: string, signal?: AbortSignal): Promise<Place[]> {
  const key = q.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const wait = lastCall + 1100 - Date.now();
  if (wait > 0) await sleep(wait, signal);
  lastCall = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q.trim())}`;
  const res = await fetch(url, { signal, referrerPolicy: "strict-origin-when-cross-origin", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(res.status === 429 ? "The address service asked us to slow down. Try again in a minute." : `Address search failed (${res.status}).`);
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  const out = rows.map((r) => ({ name: r.display_name, lat: Number(r.lat), lon: Number(r.lon) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  cache.set(key, out);
  return out;
}
