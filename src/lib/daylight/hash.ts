import type { Project } from "./types";

/**
 * Link encoding: the inputs (not the image) as compact JSON, deflated where the browser can,
 * then base64url, placed in the URL hash as `#p=<z|j>.<data>`.
 */
const b64 = (u: Uint8Array) => {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64 = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;
function slim(p: Project): unknown {
  return {
    ...p,
    rooms: p.rooms.map((r) => ({ ...r, poly: r.poly.map(([x, y]) => [r3(x), r3(y)]) })),
    walls: p.walls.map((w) => ({ ...w, a: [r3(w.a[0]), r3(w.a[1])], b: [r3(w.b[0]), r3(w.b[1])] })),
    openings: p.openings.map((o) => ({ ...o, s: r3(o.s), w: r3(o.w) })),
  };
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const w = stream.writable.getWriter();
  void w.write(data as BufferSource).catch(() => undefined);
  void w.close().catch(() => undefined);
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encodeProject(p: Project): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(slim(p)));
  if (typeof CompressionStream !== "undefined") {
    try {
      return "p=z." + b64(await pipe(raw, new CompressionStream("deflate-raw")));
    } catch {
      /* fall through to plain JSON */
    }
  }
  return "p=j." + b64(raw);
}

export async function decodeProject(hash: string): Promise<Project | null> {
  const m = /^#?p=([zj])\.([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return null;
  try {
    let bytes: Uint8Array = unb64(m[2]);
    if (m[1] === "z") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    const p = JSON.parse(new TextDecoder().decode(bytes)) as Project;
    return validate(p);
  } catch {
    return null;
  }
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const pt = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n));

/** Shape-check a decoded project so a mangled or hostile link cannot break the page. */
export function validate(p: unknown): Project | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.rooms) || !Array.isArray(o.walls) || !Array.isArray(o.openings)) return null;
  if (o.rooms.length > 60 || o.walls.length > 400 || o.openings.length > 200) return null;
  const rooms = (o.rooms as Record<string, unknown>[]).filter((r) => r && typeof r.id === "string" && Array.isArray(r.poly) && (r.poly as unknown[]).length >= 3 && (r.poly as unknown[]).every(pt));
  const walls = (o.walls as Record<string, unknown>[]).filter((w) => w && typeof w.id === "string" && pt(w.a) && pt(w.b));
  const openings = (o.openings as Record<string, unknown>[]).filter((q) => q && typeof q.id === "string" && q.host && typeof q.host === "object" && (q.kind === "window" || q.kind === "door"));
  return {
    v: 1,
    name: typeof o.name === "string" ? o.name.slice(0, 80) : "Shared flat",
    rooms: rooms as unknown as Project["rooms"],
    walls: walls as unknown as Project["walls"],
    openings: openings as unknown as Project["openings"],
    ceiling: Math.min(5, Math.max(2, num(o.ceiling, 2.85))),
    floor: Math.min(120, Math.max(0, Math.round(num(o.floor, 5)))),
    north: ((num(o.north, 0) % 360) + 360) % 360,
    lat: Math.min(85, Math.max(-85, num(o.lat, 12.97))),
    lon: Math.min(180, Math.max(-180, num(o.lon, 77.59))),
    tz: typeof o.tz === "string" ? o.tz : undefined,
    address: typeof o.address === "string" ? o.address.slice(0, 200) : undefined,
    alpha: Math.min(0.5, Math.max(0.1, num(o.alpha, 0.3))),
  };
}
