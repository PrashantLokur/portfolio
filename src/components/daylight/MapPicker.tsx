"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LMap, Marker } from "leaflet";

interface Props { lat: number; lon: number; zoom?: number; onChange: (lat: number, lon: number) => void }

/** OpenStreetMap tiles with one draggable pin. Tap the map or drag the pin to place it. */
export default function MapPicker({ lat, lon, zoom = 16, onChange }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const cb = useRef(onChange);
  useEffect(() => { cb.current = onChange; }, [onChange]);

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !box.current || map.current) return;
      const m = L.map(box.current, { center: [lat, lon], zoom, scrollWheelZoom: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(m);
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#22d3ee;border:3px solid #05070b;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>',
        iconSize: [22, 22],
        iconAnchor: [3, 22],
      });
      const mk = L.marker([lat, lon], { draggable: true, icon, keyboard: true, title: "Drag to place the flat" }).addTo(m);
      mk.on("dragend", () => { const p = mk.getLatLng(); cb.current(p.lat, p.lng); });
      m.on("click", (e) => { mk.setLatLng(e.latlng); cb.current(e.latlng.lat, e.latlng.lng); });
      map.current = m;
      pin.current = mk;
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; pin.current = null; };
    // the map is created once; later position changes are applied by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current, mk = pin.current;
    if (!m || !mk) return;
    const cur = mk.getLatLng();
    if (Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lon) > 1e-6) {
      mk.setLatLng([lat, lon]);
      if (!m.getBounds().contains([lat, lon]) || m.getZoom() < 10) m.setView([lat, lon], Math.max(m.getZoom(), 15));
    }
  }, [lat, lon]);

  return <div ref={box} className="relative isolate z-0 h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900" role="application" aria-label="Map. Tap to place the pin." />;
}
