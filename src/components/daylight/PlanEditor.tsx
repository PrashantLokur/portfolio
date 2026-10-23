"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Hand, Image as ImageIcon, Minus, MousePointer2, Redo2, Ruler, Square, Trash2, Undo2, Maximize,
  DoorOpen, PanelTop, Check as CheckIcon, X, Magnet, Spline, Fence,
} from "lucide-react";
import {
  defaultOpening, hitOpening, hitRoom, hitVertex, hitWall, hostAt, newRoom, newWalls, openingGeom,
  projectBox, removeSel, snapPoint, translateRoom, type Sel, type Snap, type Tool,
} from "../../lib/daylight/editor";
import { anchorPoint, dist, nearestOnSeg, polyArea } from "../../lib/daylight/geometry";
import { ROOM_TYPES, type Project, type Pt, type RoomType } from "../../lib/daylight/types";
import type { useHistory } from "./useHistory";
import { Inspector } from "./Inspector";
import { Btn, NumIn, SelectIn, cx } from "./ui";

export interface ImgState { url: string; w: number; h: number; mpp: number; x: number; y: number; opacity: number; scaled: boolean }

type Hist = ReturnType<typeof useHistory<Project>>;

interface Props {
  hist: Hist;
  img: ImgState | null;
  setImg: (f: (i: ImgState | null) => ImgState | null) => void;
  /** Step 1 shows only the scale tool; step 2 shows the tracing tools. */
  mode: "calibrate" | "trace";
  onUploadClick: () => void;
}

const ROOM_FILL: Record<RoomType, string> = {
  living: "245,158,11", dining: "245,158,11", bedroom: "139,92,246", kitchen: "249,115,22", toilet: "34,211,238",
  foyer: "148,163,184", utility: "20,184,166", wardrobe: "217,70,239", study: "99,102,241", corridor: "148,163,184",
  other: "148,163,184", balcony: "52,211,153",
};

const TOOLS: { id: Tool; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "select", label: "Select", icon: <MousePointer2 size={16} />, hint: "Tap a room, wall or opening to edit it. Drag corners to reshape, drag an opening to slide it." },
  { id: "rect", label: "Rectangle", icon: <Square size={16} />, hint: "Tap two opposite corners of a rectangular room." },
  { id: "room", label: "Room", icon: <Spline size={16} />, hint: "Tap each corner of the room. Tap the first corner, tap the last corner twice, or press Enter to close it." },
  { id: "wall", label: "Outer wall", icon: <Fence size={16} />, hint: "Tap along the outer wall, corner to corner. Press Enter or Finish to end the line." },
  { id: "window", label: "Window", icon: <PanelTop size={16} />, hint: "Tap a wall to place a window. Select it afterwards to change width, sill and head height." },
  { id: "balcdoor", label: "Balcony door", icon: <DoorOpen size={16} />, hint: "Tap the wall between a room and its balcony to place a floor-to-head door." },
  { id: "door", label: "Door", icon: <Minus size={16} className="rotate-90" />, hint: "Tap the wall between two rooms to place an interior door." },
  { id: "pan", label: "Pan", icon: <Hand size={16} />, hint: "Drag to move around. Pinch or scroll to zoom. Dragging also pans in the other tools." },
];

interface View { x: number; y: number; w: number }

export function PlanEditor({ hist, img, setImg, mode, onUploadClick }: Props) {
  const project = hist.value;
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [view, setView] = useState<View>({ x: -1, y: -1, w: 20 });
  const [toolState, setTool] = useState<Tool>(mode === "calibrate" ? "calib" : "select");
  const tool: Tool = mode === "trace" && toolState === "calib" && !img ? "select" : toolState;
  const [sel, setSel] = useState<Sel>(null);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [hover, setHover] = useState<Snap | null>(null);
  const [hoverHost, setHoverHost] = useState<{ a: Pt; b: Pt; s: number } | null>(null);
  const [roomType, setRoomType] = useState<RoomType>("living");
  const [snapOn, setSnapOn] = useState(true);
  const [calib, setCalib] = useState<Pt[]>([]);
  const [calibLen, setCalibLen] = useState(3);
  const scale = size.w / view.w;
  const px = 1 / scale;
  const vh = size.h / scale;

  // size tracking
  const [measured, setMeasured] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { setSize({ w: Math.max(200, el.clientWidth), h: Math.max(240, el.clientHeight) }); setMeasured(true); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = () => {
    const pb = projectBox(hist.get());
    let x0 = pb?.x0 ?? 0, y0 = pb?.y0 ?? 0, x1 = pb?.x1 ?? 12, y1 = pb?.y1 ?? 9;
    if (img) {
      x0 = Math.min(x0, img.x); y0 = Math.min(y0, img.y);
      x1 = Math.max(x1, img.x + img.w * img.mpp); y1 = Math.max(y1, img.y + img.h * img.mpp);
    }
    const pad = Math.max(x1 - x0, y1 - y0) * 0.06 + 0.3;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const w = Math.max(x1 - x0, ((y1 - y0) * size.w) / size.h);
    const h = (w * size.h) / size.w;
    setView({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w });
  };
  const fitRef = useRef(fit);
  useEffect(() => { fitRef.current = fit; });
  // frame the drawing once the box is measured, and again when the image changes
  const imgKey = img ? img.url : "";
  useEffect(() => {
    if (!measured) return;
    const id = requestAnimationFrame(() => fitRef.current());
    return () => cancelAnimationFrame(id);
  }, [measured, imgKey]);

  const toWorld = (cx: number, cy: number): Pt => {
    const r = svg.current!.getBoundingClientRect();
    return [view.x + (cx - r.left) / scale, view.y + (cy - r.top) / scale];
  };

  const snapR = (touch: boolean) => (touch ? 18 : 11) * px;
  const snapAt = (p: Pt, touch: boolean, extra?: Pt[], last?: Pt | null, alt = false): Snap =>
    snapPoint(p, hist.get(), { r: snapR(touch), last, grid: 0.05, extra, enabled: snapOn && !alt });

  // ---- committing shapes ----
  const finishDraft = () => {
    if (tool === "room" && draft.length >= 3 && polyArea(draft) > 0.2) {
      const r = newRoom(hist.get(), roomType, draft);
      hist.set((p) => ({ ...p, rooms: [...p.rooms, r] }));
      setSel({ t: "room", id: r.id });
    } else if (tool === "wall" && draft.length >= 2) {
      const ws = newWalls(draft);
      hist.set((p) => ({ ...p, walls: [...p.walls, ...ws] }));
    }
    setDraft([]);
  };

  const deleteSel = () => {
    if (!sel) return;
    hist.set((p) => removeSel(p, sel));
    setSel(null);
  };

  // ---- pointer gestures ----
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{
    kind: "none" | "pan" | "vertex" | "opening" | "room" | "image" | "pinch";
    sx: number; sy: number; moved: boolean; view0: View; touch: boolean;
    vh?: ReturnType<typeof hitVertex>; oid?: string; rid?: string; w0?: Pt; room0?: Project["rooms"][number];
    d0?: number; mid0?: { x: number; y: number }; img0?: ImgState;
  }>({ kind: "none", sx: 0, sy: 0, moved: false, view0: view, touch: false });

  const onDown = (e: React.PointerEvent) => {
    wrap.current?.focus({ preventScroll: true });
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* the pointer ended already */ }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const touch = e.pointerType !== "mouse";
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      hist.end();
      g.current = { kind: "pinch", sx: 0, sy: 0, moved: true, view0: view, touch, d0: Math.hypot(a.x - b.x, a.y - b.y), mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      return;
    }
    if (ptrs.current.size > 2) return;
    const w = toWorld(e.clientX, e.clientY);
    const p = hist.get();
    const base = { sx: e.clientX, sy: e.clientY, moved: false, view0: view, touch, w0: w };
    if (e.button === 1) { g.current = { ...base, kind: "pan" }; return; }
    if (tool === "image" && img) { g.current = { ...base, kind: "image", img0: img }; return; }
    if (tool === "select") {
      const r = snapR(touch) * 0.9;
      const vhit = hitVertex(p, sel, w, r);
      if (vhit) { hist.begin(); g.current = { ...base, kind: "vertex", vh: vhit }; return; }
      const oh = hitOpening(p, w, r);
      if (oh) { setSel({ t: "open", id: oh.id }); hist.begin(); g.current = { ...base, kind: "opening", oid: oh.id }; return; }
      if (sel?.t === "room") {
        const room = p.rooms.find((x) => x.id === sel.id);
        if (room && hitRoom(p, w)?.id === room.id) { hist.begin(); g.current = { ...base, kind: "room", rid: room.id, room0: room }; return; }
      }
    }
    g.current = { ...base, kind: "pan" };
  };

  const onMove = (e: React.PointerEvent) => {
    const touch = e.pointerType !== "mouse";
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = g.current;
    if (st.kind === "pinch" && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = svg.current!.getBoundingClientRect();
      const w0 = st.view0.w;
      const nw = Math.min(400, Math.max(1.5, (w0 * st.d0!) / d));
      const s0 = size.w / w0;
      // keep the world point under the initial midpoint under the current midpoint
      const wx = st.view0.x + (st.mid0!.x - r.left) / s0;
      const wy = st.view0.y + (st.mid0!.y - r.top) / s0;
      const s1 = size.w / nw;
      setView({ x: wx - (mid.x - r.left) / s1, y: wy - (mid.y - r.top) / s1, w: nw });
      return;
    }
    if (st.kind === "none" || !ptrs.current.has(e.pointerId)) {
      // hover preview
      const w = toWorld(e.clientX, e.clientY);
      if (!touch) updateHover(w, touch, e.altKey);
      return;
    }
    const dxs = e.clientX - st.sx, dys = e.clientY - st.sy;
    if (!st.moved && Math.hypot(dxs, dys) > (touch ? 9 : 5)) st.moved = true;
    if (!st.moved) return;
    const w = toWorld(e.clientX, e.clientY);
    if (st.kind === "pan") {
      setView({ ...st.view0, x: st.view0.x - dxs / scale, y: st.view0.y - dys / scale });
    } else if (st.kind === "image" && st.img0) {
      setImg((i) => (i ? { ...i, x: st.img0!.x + dxs / scale, y: st.img0!.y + dys / scale } : i));
    } else if (st.kind === "vertex" && st.vh) {
      const sn = snapAt(w, touch, undefined, null, e.altKey).pt;
      const vh = st.vh;
      hist.live((p) =>
        vh.k === "room"
          ? { ...p, rooms: p.rooms.map((r) => (r.id === vh.id ? { ...r, poly: r.poly.map((q, i) => (i === vh.i ? sn : q)) } : r)) }
          : { ...p, walls: p.walls.map((x) => (x.id === vh.id ? { ...x, [vh.end === 0 ? "a" : "b"]: sn } : x)) },
      );
      setHover(null);
    } else if (st.kind === "room" && st.room0 && st.w0) {
      let ddx = w[0] - st.w0[0], ddy = w[1] - st.w0[1];
      if (snapOn && !e.altKey) { ddx = Math.round(ddx / 0.05) * 0.05; ddy = Math.round(ddy / 0.05) * 0.05; }
      const moved = translateRoom(st.room0, ddx, ddy);
      hist.live((p) => ({ ...p, rooms: p.rooms.map((r) => (r.id === moved.id ? moved : r)) }));
    } else if (st.kind === "opening" && st.oid) {
      const o = hist.get().openings.find((x) => x.id === st.oid);
      if (!o) return;
      const hs = hostAt(hist.get(), w, 0.6);
      hist.live((p) => ({
        ...p,
        openings: p.openings.map((x) => {
          if (x.id !== st.oid) return x;
          // slide along the current host, or hop to a different wall if the pointer moved to one
          if (hs && (hs.host.k !== x.host.k || ("id" in hs.host && "id" in x.host && hs.host.id !== x.host.id) || (hs.host.k === "r" && x.host.k === "r" && hs.host.i !== x.host.i))) {
            return { ...x, host: hs.host, s: hs.s };
          }
          const sp = openingGeom(p, x);
          if (!sp) return x;
          const hostNow = hostAt(p, w, 3);
          return hostNow ? { ...x, s: hostNow.s } : x;
        }),
      }));
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const st = g.current;
    ptrs.current.delete(e.pointerId);
    if (st.kind === "pinch") { if (ptrs.current.size < 2) g.current = { ...st, kind: "none" }; return; }
    if (e.type === "pointercancel") { hist.end(); g.current = { ...st, kind: "none" }; return; }
    const touch = st.touch;
    if (st.kind === "vertex" || st.kind === "room" || st.kind === "opening") hist.end();
    if (!st.moved) {
      const w = toWorld(e.clientX, e.clientY);
      tap(w, touch, e.altKey);
    }
    g.current = { ...st, kind: "none", moved: false };
  };

  // ---- taps ----
  const tap = (w: Pt, touch: boolean, alt: boolean) => {
    const p = hist.get();
    if (tool === "calib") {
      const s = snapAt(w, touch, undefined, null, alt).pt;
      setCalib((c) => (c.length >= 2 ? [s] : [...c, s]));
      return;
    }
    if (tool === "select") {
      const r = snapR(touch) * 0.9;
      const o = hitOpening(p, w, r);
      if (o) { setSel({ t: "open", id: o.id }); return; }
      const room = hitRoom(p, w);
      const wall = hitWall(p, w, r);
      if (wall && (!room || sel?.t === "wall")) { setSel({ t: "wall", id: wall.id }); return; }
      if (room) { setSel({ t: "room", id: room.id }); return; }
      setSel(null);
      return;
    }
    if (tool === "room" || tool === "wall") {
      const last = draft.length ? draft[draft.length - 1] : null;
      const s = snapAt(w, touch, draft, last, alt).pt;
      if (tool === "room" && draft.length >= 3 && dist(s, draft[0]) < snapR(touch) * 1.2) { finishDraft(); return; }
      if (last && dist(s, last) < snapR(touch) * 0.6) { if (draft.length >= (tool === "room" ? 3 : 2)) finishDraft(); return; }
      setDraft((d) => [...d, s]);
      return;
    }
    if (tool === "rect") {
      const s = snapAt(w, touch, draft, draft[0] ?? null, alt).pt;
      if (!draft.length) { setDraft([s]); return; }
      const a = draft[0];
      if (Math.abs(s[0] - a[0]) < 0.2 || Math.abs(s[1] - a[1]) < 0.2) return;
      const poly: Pt[] = [a, [s[0], a[1]], s, [a[0], s[1]]];
      const r = newRoom(p, roomType, poly);
      hist.set((q) => ({ ...q, rooms: [...q.rooms, r] }));
      setSel({ t: "room", id: r.id });
      setDraft([]);
      return;
    }
    if (tool === "window" || tool === "balcdoor" || tool === "door") {
      const h = hostAt(p, w, (touch ? 28 : 16) * px);
      if (!h) return;
      const o = defaultOpening(tool, h.host, h.s);
      hist.set((q) => ({ ...q, openings: [...q.openings, o] }));
      setSel({ t: "open", id: o.id });
    }
  };

  const updateHover = (w: Pt, touch: boolean, alt: boolean) => {
    if (tool === "room" || tool === "wall" || tool === "rect" || (tool) === "calib") {
      const last = draft.length ? draft[draft.length - 1] : null;
      setHover(snapAt(w, touch, draft, last, alt));
      setHoverHost(null);
    } else if (tool === "window" || tool === "balcdoor" || tool === "door") {
      const h = hostAt(hist.get(), w, 16 * px);
      setHoverHost(h ? { a: h.a, b: h.b, s: h.s } : null);
      setHover(null);
    } else { setHover(null); setHoverHost(null); }
  };

  // wheel zoom (non-passive so the page does not scroll)
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const f = Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setView((v) => {
        const nw = Math.min(400, Math.max(1.5, v.w * f));
        const s0 = size.w / v.w, s1 = size.w / nw;
        const wx = v.x + (e.clientX - r.left) / s0, wy = v.y + (e.clientY - r.top) / s0;
        return { x: wx - (e.clientX - r.left) / s1, y: wy - (e.clientY - r.top) / s1, w: nw };
      });
    };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [size.w]);

  const zoomBy = (f: number) => setView((v) => {
    const nw = Math.min(400, Math.max(1.5, v.w * f));
    const cx = v.x + v.w / 2, cy = v.y + (size.h / (size.w / v.w)) / 2;
    return { x: cx - nw / 2, y: cy - (nw * size.h) / size.w / 2, w: nw };
  });

  const onKey = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (draft.length) setDraft((d) => d.slice(0, -1));
      else if (e.shiftKey) hist.redo(); else hist.undo();
    } else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); hist.redo(); }
    else if (e.key === "Escape") { if (draft.length) setDraft([]); else { setSel(null); setCalib([]); } }
    else if (e.key === "Enter") { finishDraft(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); deleteSel(); }
    else if (e.key === "Backspace" && draft.length) { setDraft((d) => d.slice(0, -1)); }
  };

  const applyCalib = () => {
    if (calib.length < 2 || calibLen <= 0) return;
    const f = calibLen / dist(calib[0], calib[1]);
    if (!Number.isFinite(f) || f <= 0) return;
    setImg((i) => (i ? { ...i, mpp: i.mpp * f, x: i.x * f, y: i.y * f, scaled: true } : i));
    if (hist.get().rooms.length || hist.get().walls.length) {
      hist.set((p) => ({
        ...p,
        rooms: p.rooms.map((r) => ({ ...r, poly: r.poly.map(([x, y]) => [x * f, y * f] as Pt) })),
        walls: p.walls.map((w) => ({ ...w, a: [w.a[0] * f, w.a[1] * f] as Pt, b: [w.b[0] * f, w.b[1] * f] as Pt })),
      }));
    }
    setView((v) => ({ x: v.x * f, y: v.y * f, w: v.w * f }));
    setCalib([]);
  };

  const hint = tool === ("calib")
    ? (img ? "Tap one end of a dimension you know on the plan (a wall, a door width, a printed length), then the other end." : "Upload a plan image first, or skip to draw without one.")
    : TOOLS.find((t) => t.id === tool)?.hint ?? "";

  const grid = useMemo(() => {
    const step = scale > 40 ? 1 : scale > 14 ? 1 : 5;
    const lines: React.ReactNode[] = [];
    const x0 = Math.floor(view.x / step) * step, x1 = view.x + view.w;
    const y0 = Math.floor(view.y / step) * step, y1 = view.y + vh;
    if ((x1 - x0) / step > 200 || (y1 - y0) / step > 200) return null;
    for (let x = x0; x <= x1; x += step) lines.push(<line key={"x" + x} x1={x} x2={x} y1={view.y} y2={y1} />);
    for (let y = y0; y <= y1; y += step) lines.push(<line key={"y" + y} y1={y} y2={y} x1={view.x} x2={x1} />);
    return lines;
  }, [view, vh, scale]);

  const selRoom = sel?.t === "room" ? project.rooms.find((r) => r.id === sel.id) : undefined;
  const selWall = sel?.t === "wall" ? project.walls.find((r) => r.id === sel.id) : undefined;
  const hs = 7 * px;
  const toolList = mode === "calibrate" ? [] : TOOLS;
  const drawing = tool === "room" || tool === "wall" || tool === "rect";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Drawing tools">
        {mode === "trace" && toolList.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTool(t.id); setDraft([]); setHover(null); }}
            aria-pressed={tool === t.id}
            title={t.label}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
              tool === t.id ? "border-cyan-300/60 bg-cyan-300/15 text-white" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white",
            )}
          >
            {t.icon}<span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
        {img && (
          <button
            type="button"
            onClick={() => { setTool("calib"); setDraft([]); }}
            aria-pressed={tool === ("calib")}
            className={cx("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition", tool === ("calib") ? "border-cyan-300/60 bg-cyan-300/15 text-white" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white")}
          >
            <Ruler size={16} /><span className="hidden sm:inline">Set scale</span>
          </button>
        )}
        {img && mode === "trace" && (
          <button
            type="button"
            onClick={() => setTool("image")}
            aria-pressed={tool === "image"}
            title="Move the plan image"
            className={cx("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition", tool === "image" ? "border-cyan-300/60 bg-cyan-300/15 text-white" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white")}
          >
            <ImageIcon size={16} /><span className="hidden sm:inline">Move image</span>
          </button>
        )}
        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <button type="button" onClick={() => { if (draft.length) setDraft((d) => d.slice(0, -1)); else hist.undo(); }} disabled={!hist.canUndo && !draft.length} title="Undo" aria-label="Undo" className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:border-white/25 disabled:opacity-35"><Undo2 size={16} /></button>
        <button type="button" onClick={hist.redo} disabled={!hist.canRedo} title="Redo" aria-label="Redo" className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:border-white/25 disabled:opacity-35"><Redo2 size={16} /></button>
        <button type="button" onClick={deleteSel} disabled={!sel} title="Delete selected" aria-label="Delete selected" className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-35"><Trash2 size={16} /></button>
        <button type="button" onClick={() => setSnapOn((v) => !v)} aria-pressed={snapOn} title="Snapping to corners, edges and alignment" className={cx("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium", snapOn ? "border-cyan-300/60 bg-cyan-300/15 text-white" : "border-white/10 text-slate-400")}><Magnet size={16} /><span className="hidden sm:inline">Snap</span></button>
        <button type="button" onClick={fit} title="Fit to view" aria-label="Fit to view" className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:border-white/25"><Maximize size={16} /></button>
        <button type="button" onClick={() => zoomBy(0.7)} aria-label="Zoom in" className="rounded-lg border border-white/10 px-2.5 py-1 text-sm text-slate-300 hover:border-white/25">+</button>
        <button type="button" onClick={() => zoomBy(1 / 0.7)} aria-label="Zoom out" className="rounded-lg border border-white/10 px-2.5 py-1 text-sm text-slate-300 hover:border-white/25">−</button>
      </div>

      <p className="min-h-[2.5rem] text-[13px] leading-5 text-slate-400" aria-live="polite">{hint}</p>

      <div
        ref={wrap}
        tabIndex={0}
        onKeyDown={onKey}
        className="relative h-[min(68vh,560px)] min-h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#080c13] outline-none focus-visible:border-cyan-300/50"
      >
        {mode === "trace" && (tool === "room" || tool === "rect") && (
          <label className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#05070b]/90 px-2.5 py-1.5 text-xs text-slate-300 backdrop-blur">
            New room is a
            <SelectIn aria-label="Type of the new room" value={roomType} onChange={setRoomType} options={ROOM_TYPES.map((t) => ({ value: t.type, label: t.label }))} className="!w-auto !py-1" />
          </label>
        )}
        <svg
          ref={svg}
          role="application"
          aria-label="Floor plan editor"
          className="absolute inset-0 h-full w-full select-none"
          style={{ touchAction: "none", cursor: tool === "pan" || tool === "image" ? "grab" : drawing || tool === ("calib") || tool === "window" || tool === "door" || tool === "balcdoor" ? "crosshair" : "default" }}
          viewBox={`${view.x} ${view.y} ${view.w} ${vh}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => { setHover(null); setHoverHost(null); }}
        >
          <g stroke="rgba(148,163,184,0.10)" strokeWidth={px}>{grid}</g>
          {img && <image href={img.url} x={img.x} y={img.y} width={img.w * img.mpp} height={img.h * img.mpp} opacity={img.opacity} preserveAspectRatio="none" />}

          {project.rooms.map((r) => {
            const sl = sel?.t === "room" && sel.id === r.id;
            const a = anchorPoint(r.poly);
            const fs = Math.max(11 * px, 0);
            return (
              <g key={r.id}>
                <polygon
                  points={r.poly.map((q) => q.join(",")).join(" ")}
                  fill={`rgba(${ROOM_FILL[r.type]},${r.type === "balcony" ? 0.14 : 0.2})`}
                  stroke={sl ? "#67e8f9" : `rgba(${ROOM_FILL[r.type]},0.9)`}
                  strokeWidth={(sl ? 2.4 : 1.4) * px}
                  strokeDasharray={r.type === "balcony" ? `${6 * px} ${4 * px}` : undefined}
                  strokeLinejoin="round"
                />
                <text x={a[0]} y={a[1]} textAnchor="middle" fontSize={fs} fill="#f1f5f9" stroke="rgba(5,7,11,0.85)" strokeWidth={3 * px} paintOrder="stroke" pointerEvents="none" fontWeight={600}>
                  {r.name}
                  <tspan x={a[0]} dy={fs * 1.25} fontWeight={400} fill="#cbd5e1">{polyArea(r.poly).toFixed(1)} m²</tspan>
                </text>
              </g>
            );
          })}

          {project.walls.map((w) => {
            const sl = sel?.t === "wall" && sel.id === w.id;
            return <line key={w.id} x1={w.a[0]} y1={w.a[1]} x2={w.b[0]} y2={w.b[1]} stroke={sl ? "#67e8f9" : "#e2e8f0"} strokeWidth={Math.max(w.t * scale, 3) * px} strokeLinecap="square" opacity={0.85} />;
          })}

          {project.openings.map((o) => {
            const gm = openingGeom(project, o);
            if (!gm) return null;
            const sl = sel?.t === "open" && sel.id === o.id;
            const isDoor = o.kind === "door";
            return (
              <g key={o.id} pointerEvents="none">
                <line x1={gm.p0[0]} y1={gm.p0[1]} x2={gm.p1[0]} y2={gm.p1[1]} stroke="#080c13" strokeWidth={9 * px} strokeLinecap="butt" />
                <line x1={gm.p0[0]} y1={gm.p0[1]} x2={gm.p1[0]} y2={gm.p1[1]} stroke={sl ? "#fff" : isDoor ? "#fbbf24" : "#38bdf8"} strokeWidth={(sl ? 6 : 4.5) * px} strokeLinecap="butt" />
                {isDoor && !o.doorway && (
                  <path d={`M ${gm.p0[0]} ${gm.p0[1]} A ${gm.len} ${gm.len} 0 0 1 ${gm.p0[0] - gm.ty * gm.len} ${gm.p0[1] + gm.tx * gm.len}`} fill="none" stroke="#fbbf24" strokeWidth={1.2 * px} opacity={0.55} />
                )}
              </g>
            );
          })}

          {/* hover host preview */}
          {hoverHost && (
            <g pointerEvents="none">
              <line x1={hoverHost.a[0]} y1={hoverHost.a[1]} x2={hoverHost.b[0]} y2={hoverHost.b[1]} stroke="#67e8f9" strokeWidth={4 * px} opacity={0.55} />
              {(() => {
                const n = nearestOnSeg(
                  [hoverHost.a[0] + (hoverHost.b[0] - hoverHost.a[0]) * hoverHost.s, hoverHost.a[1] + (hoverHost.b[1] - hoverHost.a[1]) * hoverHost.s], hoverHost.a, hoverHost.b);
                return <circle cx={n.pt[0]} cy={n.pt[1]} r={5 * px} fill="#67e8f9" />;
              })()}
            </g>
          )}

          {/* draft */}
          {draft.length > 0 && (
            <g pointerEvents="none">
              {tool === "rect" && hover ? (
                <rect x={Math.min(draft[0][0], hover.pt[0])} y={Math.min(draft[0][1], hover.pt[1])} width={Math.abs(hover.pt[0] - draft[0][0])} height={Math.abs(hover.pt[1] - draft[0][1])} fill="rgba(103,232,249,0.12)" stroke="#67e8f9" strokeWidth={1.6 * px} strokeDasharray={`${5 * px} ${4 * px}`} />
              ) : (
                <polyline points={[...draft, ...(hover ? [hover.pt] : [])].map((q) => q.join(",")).join(" ")} fill={tool === "room" ? "rgba(103,232,249,0.1)" : "none"} stroke="#67e8f9" strokeWidth={(tool === "wall" ? 3 : 1.8) * px} strokeDasharray={tool === "room" ? `${5 * px} ${4 * px}` : undefined} strokeLinejoin="round" />
              )}
              {draft.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={(i === 0 && tool === "room" ? 6 : 4) * px} fill={i === 0 ? "#67e8f9" : "#080c13"} stroke="#67e8f9" strokeWidth={1.6 * px} />)}
            </g>
          )}

          {/* snap marker and guides */}
          {hover && (
            <g pointerEvents="none">
              {hover.gx !== undefined && <line x1={hover.gx} x2={hover.gx} y1={view.y} y2={view.y + vh} stroke="#f472b6" strokeWidth={px} strokeDasharray={`${4 * px} ${4 * px}`} />}
              {hover.gy !== undefined && <line y1={hover.gy} y2={hover.gy} x1={view.x} x2={view.x + view.w} stroke="#f472b6" strokeWidth={px} strokeDasharray={`${4 * px} ${4 * px}`} />}
              <circle cx={hover.pt[0]} cy={hover.pt[1]} r={(hover.kind === "vertex" ? 7 : 4.5) * px} fill={hover.kind === "vertex" ? "none" : "#67e8f9"} stroke="#67e8f9" strokeWidth={1.8 * px} />
            </g>
          )}

          {/* calibration */}
          {(tool) === "calib" && calib.length > 0 && (
            <g pointerEvents="none">
              {calib.length === 2 && <line x1={calib[0][0]} y1={calib[0][1]} x2={calib[1][0]} y2={calib[1][1]} stroke="#fbbf24" strokeWidth={2.4 * px} />}
              {calib.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={5 * px} fill="#fbbf24" stroke="#080c13" strokeWidth={px} />)}
            </g>
          )}

          {/* handles */}
          {selRoom && tool === "select" && selRoom.poly.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={hs} fill="#080c13" stroke="#67e8f9" strokeWidth={2 * px} pointerEvents="none" />)}
          {selWall && tool === "select" && [selWall.a, selWall.b].map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={hs} fill="#080c13" stroke="#67e8f9" strokeWidth={2 * px} pointerEvents="none" />)}

          {/* scale bar */}
          {(() => {
            const len = [0.5, 1, 2, 5, 10].find((l) => l * scale >= 70) ?? 10;
            const x = view.x + 14 * px, y = view.y + vh - 14 * px;
            return (
              <g pointerEvents="none" fontSize={11 * px} fill="#94a3b8">
                <line x1={x} x2={x + len} y1={y} y2={y} stroke="#94a3b8" strokeWidth={2 * px} />
                <line x1={x} x2={x} y1={y - 4 * px} y2={y + 4 * px} stroke="#94a3b8" strokeWidth={2 * px} />
                <line x1={x + len} x2={x + len} y1={y - 4 * px} y2={y + 4 * px} stroke="#94a3b8" strokeWidth={2 * px} />
                <text x={x + len / 2} y={y - 7 * px} textAnchor="middle">{len} m</text>
              </g>
            );
          })()}
        </svg>

        {draft.length > 0 && (tool === "room" || tool === "wall") && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Btn small onClick={() => setDraft([])} aria-label="Cancel drawing"><X size={14} />Cancel</Btn>
            <Btn small variant="primary" onClick={finishDraft} disabled={draft.length < (tool === "room" ? 3 : 2)}><CheckIcon size={14} />Finish</Btn>
          </div>
        )}

        {(tool) === "calib" && (
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-[#05070b]/90 p-3 backdrop-blur">
            {!img ? (
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span>No image loaded.</span>
                <Btn small onClick={onUploadClick}>Upload a plan</Btn>
              </div>
            ) : calib.length < 2 ? (
              <p className="text-sm text-slate-300">Tap {calib.length === 0 ? "the first" : "the second"} end of a known dimension.</p>
            ) : (
              <>
                <label className="text-xs text-slate-400">
                  <span className="mb-1 block">Real length between the two points, m</span>
                  <NumIn value={calibLen} onChange={setCalibLen} min={0.05} max={200} step={0.05} className="!w-32" aria-label="Known length in metres" />
                </label>
                <Btn small variant="primary" onClick={applyCalib}>Apply scale</Btn>
                <Btn small variant="quiet" onClick={() => setCalib([])}>Pick again</Btn>
              </>
            )}
          </div>
        )}
      </div>

      {img && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <label className="flex items-center gap-2">Image opacity
            <input type="range" min={0.1} max={1} step={0.05} value={img.opacity} onChange={(e) => setImg((i) => (i ? { ...i, opacity: Number(e.target.value) } : i))} className="w-32 accent-cyan-300" aria-label="Plan image opacity" />
          </label>
          <span className="font-mono">{(1 / img.mpp).toFixed(1)} px per m</span>
        </div>
      )}

      {mode === "trace" && <Inspector hist={hist} sel={sel} setSel={setSel} onDelete={deleteSel} />}
    </div>
  );
}

