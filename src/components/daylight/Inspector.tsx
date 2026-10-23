"use client";

import { Trash2 } from "lucide-react";
import { polyArea } from "../../lib/daylight/geometry";
import type { Sel } from "../../lib/daylight/editor";
import { GLAZE, ROOM_TYPES, roomTarget, type Glaze, type Opening, type Project, type Room, type RoomType } from "../../lib/daylight/types";
import type { useHistory } from "./useHistory";
import { Btn, Check, Field, NumIn, SelectIn, TextIn } from "./ui";

type Hist = ReturnType<typeof useHistory<Project>>;

const FREE: { value: string; label: string; free: number }[] = [
  { value: "0.9", label: "Casement or tilt (about 90% opens)", free: 0.9 },
  { value: "0.6", label: "Sliding window (about 60%)", free: 0.6 },
  { value: "0.5", label: "Sliding door (about 50%)", free: 0.5 },
  { value: "0.25", label: "Narrow top-hung vent (about 25%)", free: 0.25 },
  { value: "1", label: "Open grille or jali (100%)", free: 1 },
];

export function Inspector({ hist, sel, setSel, onDelete }: { hist: Hist; sel: Sel; setSel: (s: Sel) => void; onDelete: () => void }) {
  const p = hist.value;
  const room = sel?.t === "room" ? p.rooms.find((r) => r.id === sel.id) : undefined;
  const wall = sel?.t === "wall" ? p.walls.find((w) => w.id === sel.id) : undefined;
  const open = sel?.t === "open" ? p.openings.find((o) => o.id === sel.id) : undefined;

  const setRoom = (patch: Partial<Room>) => hist.set((q) => ({ ...q, rooms: q.rooms.map((r) => (r.id === room!.id ? { ...r, ...patch } : r)) }));
  const setOpen = (patch: Partial<Opening>) => hist.set((q) => ({ ...q, openings: q.openings.map((o) => (o.id === open!.id ? { ...o, ...patch } : o)) }));

  if (room) {
    const others = p.rooms.filter((r) => r.id !== room.id && r.type !== "balcony");
    return (
      <Panel title={`Room · ${polyArea(room.poly).toFixed(1)} m²`} onDelete={onDelete}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><TextIn value={room.name} onChange={(v) => setRoom({ name: v })} maxLength={40} /></Field>
          <Field label="Type">
            <SelectIn
              value={room.type}
              onChange={(t: RoomType) => setRoom({ type: t, slab: t === "balcony" ? (room.slab ?? true) : undefined, zone: t === "balcony" ? undefined : room.zone })}
              options={ROOM_TYPES.map((t) => ({ value: t.type, label: t.label }))}
            />
          </Field>
          {room.type !== "balcony" ? (
            <>
              <Field label="Target illuminance, lx" hint="Light level at the work plane that counts as enough.">
                <NumIn value={room.target ?? roomTarget(room.type)} onChange={(v) => setRoom({ target: v })} min={10} max={1000} step={10} digits={0} />
              </Field>
              <Field label="Open plan with" hint="Rooms with no wall between them share one air volume.">
                <SelectIn
                  value={room.zone ?? ""}
                  onChange={(v) => setRoom({ zone: v || undefined })}
                  options={[{ value: "", label: "None, separate room" }, ...others.map((r) => ({ value: r.id, label: r.name }))]}
                />
              </Field>
            </>
          ) : (
            <div className="sm:col-span-2">
              <Check checked={!!room.slab} onChange={(v) => setRoom({ slab: v })}>Slab above this balcony (it shades the balcony and the windows behind it)</Check>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Drag a corner to reshape the room, or drag the room itself to move it. Rooms drawn next to each other share a wall.</p>
      </Panel>
    );
  }
  if (wall) {
    return (
      <Panel title="Outer wall" onDelete={onDelete}>
        <p className="text-xs leading-5 text-slate-500">Outer walls block sunlight. Drag an end to move it. Room edges already act as walls, so draw only the outside and the balcony sides.</p>
      </Panel>
    );
  }
  if (open) {
    const door = open.kind === "door";
    const freeV = String(open.free ?? 0.6);
    return (
      <Panel title={door ? "Interior door" : open.sill <= 0.05 ? "Balcony door" : "Window"} onDelete={onDelete}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Width, m"><NumIn value={open.w} onChange={(v) => setOpen({ w: v })} min={0.3} max={6} /></Field>
          {!door && (
            <>
              <Field label="Sill height, m"><NumIn value={open.sill} onChange={(v) => setOpen({ sill: Math.min(v, open.head - 0.2) })} min={0} max={2.5} /></Field>
              <Field label="Head height, m"><NumIn value={open.head} onChange={(v) => setOpen({ head: Math.max(v, open.sill + 0.2) })} min={0.4} max={3.5} /></Field>
              <Field label="Glazing">
                <SelectIn value={open.glaze ?? "clear"} onChange={(v: Glaze) => setOpen({ glaze: v, fixed: v === "frosted" ? true : open.fixed })} options={(Object.keys(GLAZE) as Glaze[]).map((k) => ({ value: k, label: GLAZE[k].label }))} />
              </Field>
              <Field label="How it opens" hint="Share of the opening that lets air through.">
                <SelectIn
                  value={FREE.some((f) => f.value === freeV) ? freeV : "0.6"}
                  onChange={(v) => setOpen({ free: Number(v), fixed: v === "1" ? open.fixed : false })}
                  options={FREE.map((f) => ({ value: f.value, label: f.label }))}
                />
              </Field>
              <div className="sm:col-span-3 flex flex-wrap gap-x-6 gap-y-2">
                <Check checked={!!open.fixed} onChange={(v) => setOpen({ fixed: v })}>Fixed grille, never closed</Check>
                <Check checked={!!open.shelter} onChange={(v) => setOpen({ shelter: v })}>Opens into a shaft or recess, not a facade</Check>
              </div>
            </>
          )}
          {door && (
            <div className="sm:col-span-2 flex items-end">
              <Check checked={!!open.doorway} onChange={(v) => setOpen({ doorway: v })}>Doorway with no door leaf (always open, light passes)</Check>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Drag the {door ? "door" : "opening"} along the wall to slide it, or onto another wall to move it.</p>
      </Panel>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">What you have traced</p>
      {p.rooms.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">Nothing yet. Pick Rectangle or Room, then tap the corners of a room on the plan. Add the outer walls, then windows and doors.</p>
      ) : (
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {p.rooms.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setSel({ t: "room", id: r.id })} className="flex w-full justify-between gap-3 py-1 text-left text-slate-300 hover:text-white">
                <span>{r.name}</span><span className="font-mono text-xs text-slate-500">{polyArea(r.poly).toFixed(1)} m²</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        {p.rooms.filter((r) => r.type !== "balcony").length} rooms · {p.walls.length} outer wall segments · {p.openings.filter((o) => o.kind === "window").length} windows · {p.openings.filter((o) => o.kind === "door").length} doors
      </p>
    </div>
  );
}

function Panel({ title, onDelete, children }: { title: string; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{title}</p>
        <Btn small variant="ghost" onClick={onDelete} className="!border-rose-400/30 !text-rose-300 hover:!bg-rose-400/10"><Trash2 size={14} />Delete</Btn>
      </div>
      {children}
    </div>
  );
}
