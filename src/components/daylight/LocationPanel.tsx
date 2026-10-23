"use client";

import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { dirName } from "../../lib/daylight/geometry";
import { searchAddress, type Place } from "../../lib/daylight/geocode";
import type { Project } from "../../lib/daylight/types";
import { NorthDial } from "./NorthDial";
import { Btn, Card, Field, H2, NumIn, TextIn } from "./ui";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />,
});

export function LocationPanel({ project, update, located }: { project: Project; update: (patch: Partial<Project>) => void; located: boolean }) {
  const [q, setQ] = useState(project.address ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQ = useRef("");

  const run = useCallback(async (text: string) => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    lastQ.current = text;
    setBusy(true); setErr(null);
    try {
      const r = await searchAddress(text, ac.signal);
      if (ac.signal.aborted) return;
      setResults(r);
      if (!r.length) setErr("Nothing found. Try adding the city, or tap the map instead.");
    } catch (e) {
      if (ac.signal.aborted) return;
      setErr(e instanceof Error ? e.message : "Address search failed.");
    } finally {
      if (!ac.signal.aborted) setBusy(false);
    }
  }, []);

  // search a little after typing stops; the Search button and Enter run it immediately
  const onType = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length >= 4) timer.current = setTimeout(() => { if (v.trim() !== lastQ.current) void run(v); }, 900);
    else setResults([]);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); abort.current?.abort(); }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4">
        <Card>
          <H2>Where is the flat</H2>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (timer.current) clearTimeout(timer.current); if (q.trim().length >= 3) void run(q); }}>
            <TextIn value={q} onChange={onType} placeholder="Street, area, city" aria-label="Address" autoComplete="off" />
            <Btn small variant="primary" type="submit" disabled={busy || q.trim().length < 3}><Search size={14} />Search</Btn>
          </form>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">Addresses are looked up on OpenStreetMap Nominatim. Only the text you type is sent. You can also tap the map or drag the pin.</p>
          {busy && <p className="mt-2 text-xs text-slate-400">Searching…</p>}
          {err && <p className="mt-2 text-xs text-amber-300" role="status">{err}</p>}
          {results.length > 0 && (
            <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => { update({ lat: r.lat, lon: r.lon, address: r.name.split(",").slice(0, 3).join(",").trim(), tz: undefined }); setQ(r.name); setResults([]); }}
                    className="block w-full px-3 py-2 text-left text-[13px] leading-5 text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <MapPicker lat={project.lat} lon={project.lon} zoom={located ? 16 : 2} onChange={(lat, lon) => update({ lat, lon, tz: undefined })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude"><NumIn value={project.lat} onChange={(v) => update({ lat: v, tz: undefined })} min={-85} max={85} step={0.0001} digits={5} /></Field>
          <Field label="Longitude"><NumIn value={project.lon} onChange={(v) => update({ lon: v, tz: undefined })} min={-180} max={180} step={0.0001} digits={5} /></Field>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <H2>The flat</H2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Floor number" hint="Ground floor is 0. Sets the wind height."><NumIn value={project.floor} onChange={(v) => update({ floor: Math.round(v) })} min={0} max={120} step={1} digits={0} /></Field>
            <Field label="Ceiling height, m" hint="Floor to the slab above."><NumIn value={project.ceiling} onChange={(v) => update({ ceiling: v })} min={2} max={5} step={0.05} /></Field>
          </div>
        </Card>
        <Card>
          <H2>Which way is the plan facing</H2>
          <p className="mb-3 text-[13px] leading-5 text-slate-400">Find the north arrow on your drawing and drag the N to where it points. If the drawing has no arrow, type the compass bearing the top of the plan faces.</p>
          <NorthDial north={project.north} onChange={(v) => update({ north: v })} project={project} />
          <p className="mt-1 text-center text-[11px] text-slate-500">Your plan is shown with its top pointing up.</p>
          <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
            <Field label="Top of the plan faces, degrees"><NumIn value={project.north} onChange={(v) => update({ north: ((v % 360) + 360) % 360 })} min={0} max={359} step={1} digits={0} /></Field>
            <span className="pb-2 font-mono text-sm text-slate-300">{dirName(project.north)}</span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">0° means the top of the plan faces north, 90° east, 180° south.</p>
        </Card>
      </div>
    </div>
  );
}
