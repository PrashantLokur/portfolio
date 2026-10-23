"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayRunner } from "../../lib/daylight/client";
import { T0, T1, type Curves, type DayParams, type RoomStat, BANDS, RAMP_STOPS } from "../../lib/daylight/daylight";
import { clamp, dirName, fmtLx, fmtT } from "../../lib/daylight/geometry";
import { compile } from "../../lib/daylight/scene";
import { todayYMD, tzOffsetOn, utcOffset, type DateYMD, type Sky } from "../../lib/daylight/solar";
import type { Project } from "../../lib/daylight/types";
import { ALL_SEASON, SCHEMES, defaultScheme, dominant, heightFactor, loadWind, type SeasonScheme, type WindRecord } from "../../lib/daylight/windData";
import {
  ParticleSim, WRAMP, achStatus, buildWindGraph, directionChart, fmtA, paintWind, seasonAverage, solveWind, type WindSettings,
} from "../../lib/daylight/wind";
import { DayCurve, Scrubber, WindChart } from "./Charts";
import { Stage, stageBox } from "./Stage";
import { Card, Check, H2, Range, Seg, cx } from "./ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRESETS: { label: string; m: number; d: number }[] = [
  { label: "Mar 21", m: 3, d: 21 }, { label: "Jun 21", m: 6, d: 21 }, { label: "Sep 23", m: 9, d: 23 }, { label: "Dec 21", m: 12, d: 21 },
];
const isoOf = (d: DateYMD) => `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
const skyLabel: Record<Sky, string> = { clear: "clear sky", part: "partly cloudy", over: "overcast" };

type WindState = { key: string; status: "ready"; rec: WindRecord } | { key: string; status: "error"; msg: string };

export function Results({ project }: { project: Project }) {
  const sc = useMemo(() => compile(project), [project]);
  const graph = useMemo(() => buildWindGraph(sc), [sc]);
  const vb = useMemo(() => stageBox(sc), [sc]);
  const reduceMotion = useMemo(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  const [mode, setMode] = useState<"light" | "wind">("light");
  const [date, setDate] = useState<DateYMD>(todayYMD);
  const [sky, setSky] = useState<Sky>("clear");
  const [view, setView] = useState<"day" | "lux">("day");
  const [lamps, setLamps] = useState(false);
  const [hour, setHour] = useState(14);
  const [playing, setPlaying] = useState(!reduceMotion);
  const [speed, setSpeed] = useState(1.4);
  const mainRoom = useMemo(() => {
    let b = -1;
    sc.rooms.forEach((r, i) => { if (!r.outdoor && (b < 0 || r.areaM2 > sc.rooms[b].areaM2)) b = i; });
    return b < 0 ? 0 : b;
  }, [sc]);
  const [selId, setSelId] = useState<string | null>(null);
  const selIdx = Math.max(0, sc.rooms.findIndex((r) => r.id === (selId ?? sc.rooms[mainRoom]?.id)));
  const selRoom = sc.rooms[selIdx];

  // ---- daylight engine in a worker ----
  const runner = useRef<DayRunner | null>(null);
  const [readyFor, setReadyFor] = useState<Project | null>(null);
  const [engineErr, setEngineErr] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const ready = readyFor === project;
  useEffect(() => {
    const r = new DayRunner();
    runner.current = r;
    let dead = false;
    r.init(project).then((w) => { if (!dead) { setWarnings(w); setEngineErr(null); setReadyFor(project); } })
      .catch((e: Error) => { if (!dead && e.message !== "disposed") setEngineErr(e.message); });
    return () => { dead = true; r.dispose(); runner.current = null; };
  }, [project]);

  // ---- wind record ----
  const [retry, setRetry] = useState(0);
  const [wind, setWind] = useState<WindState | null>(null);
  const wkey = `${project.lat.toFixed(2)},${project.lon.toFixed(2)}`;
  useEffect(() => {
    const ac = new AbortController();
    let dead = false;
    loadWind(project.lat, project.lon, ac.signal)
      .then((rec) => { if (!dead) setWind({ key: wkey, status: "ready", rec }); })
      .catch((e: Error) => { if (!dead && !ac.signal.aborted) setWind({ key: wkey, status: "error", msg: e.message }); });
    return () => { dead = true; ac.abort(); };
  }, [project.lat, project.lon, wkey, retry]);
  const rec = wind?.key === wkey && wind.status === "ready" ? wind.rec : null;
  const windErr = wind?.key === wkey && wind.status === "error" ? wind.msg : null;
  const windLoading = !rec && !windErr;

  const tz = project.tz ?? rec?.tz;
  const tzh = utcOffset(tz, project.lon, date);
  const tzKnown = tzOffsetOn(tz, date) !== null;
  const dp: DayParams = useMemo(() => ({ date, sky, lat: project.lat, lon: project.lon, tz, north: project.north }), [date, sky, project.lat, project.lon, tz, project.north]);

  // day curves
  const [curves, setCurves] = useState<{ for: Project; dp: DayParams; c: Curves } | null>(null);
  useEffect(() => {
    if (!ready || !runner.current) return;
    let dead = false;
    runner.current.curves(dp, sky).then((c) => { if (!dead) setCurves({ for: project, dp, c }); }).catch(() => undefined);
    return () => { dead = true; };
  }, [ready, dp, sky, project]);
  const cur = curves && curves.for === project ? curves.c : null;

  // frames
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ stats: RoomStat[]; lamp: Float32Array; sun: { alt: number; az: number }; out: { dirN: number; dif: number } } | null>(null);
  const want = useRef<null | { dp: DayParams; hour: number; sky: Sky; lamps: boolean; view: "day" | "lux" }>(null);
  const busy = useRef(false);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const pump = useCallback(() => {
    const step = () => {
      const r = runner.current, req = want.current;
      if (busy.current || !req || !r) return;
      want.current = null;
      busy.current = true;
      r.frame(req.dp, req.hour, req.sky, req.lamps, req.view).then((f) => {
        busy.current = false;
        if (runner.current !== r) return;
        if (modeRef.current === "light") {
          const cv = canvasRef.current;
          if (cv) cv.getContext("2d")?.putImageData(new ImageData(f.rgba as Uint8ClampedArray<ArrayBuffer>, sc.grid.cols, sc.grid.rows), 0, 0);
          setFrame({ stats: f.stats, lamp: f.lamp, sun: f.sun, out: f.out });
        }
        step();
      }).catch(() => { busy.current = false; });
    };
    step();
  }, [sc]);
  useEffect(() => {
    if (!ready || mode !== "light") return;
    want.current = { dp, hour, sky, lamps, view };
    pump();
  }, [ready, mode, dp, hour, sky, lamps, view, pump]);

  // day playback
  useEffect(() => {
    if (!playing || mode !== "light") return;
    let raf = 0, last = 0;
    const tick = (ts: number) => {
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      if (dt) setHour((h) => { const n = h + dt / speed; return n > T1 ? T0 : n; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, mode, speed]);

  // ---- wind ----
  const uf = heightFactor(project.floor, project.alpha);
  const [schemeId, setSchemeId] = useState<"india" | "quarters" | null>(null);
  const scheme: SeasonScheme = schemeId ? SCHEMES[schemeId] : defaultScheme(project.lat, project.lon);
  const seasons = useMemo(() => [...scheme.seasons, ALL_SEASON], [scheme]);
  const [seasonState, setSeasonState] = useState<string | null>(null);
  const seasonId = seasonState && seasons.some((s) => s.id === seasonState) ? seasonState : scheme.id === "india" ? "win" : "all";
  const season = seasons.find((s) => s.id === seasonId)!;
  const rose = rec?.roses[seasonId] ?? null;
  const preset = useMemo(() => {
    if (!rose) return { dir: 90, spd: 4.5 };
    return { dir: dominant(rose).dir, spd: clamp(Math.round(rose.mean * uf * 2) / 2, 0.5, 12) };
  }, [rose, uf]);
  const [manual, setManual] = useState<{ dir: number; spd: number } | null>(null);
  const wd = manual?.dir ?? preset.dir;
  const ws = manual?.spd ?? preset.spd;
  const [sweep, setSweep] = useState(false);
  const [winState, setWinState] = useState<WindSettings["win"]>("open");
  const [doors, setDoors] = useState({ bed: false, kit: true, toi: false });
  const wset: WindSettings = useMemo(() => ({ win: winState, doors }), [winState, doors]);
  const doorGroups = useMemo(() => new Set(sc.doors.map((d) => d.group).filter(Boolean)), [sc]);

  const wres = useMemo(() => solveWind(sc, graph, project.north, wd, ws, wset), [sc, graph, project.north, wd, ws, wset]);
  const dirChart = useMemo(() => directionChart(sc, graph, project.north, ws, wset), [sc, graph, project.north, ws, wset]);
  const seasonAvg = useMemo(() => (rose ? seasonAverage(sc, graph, project.north, rose, uf, wset) : null), [sc, graph, project.north, rose, uf, wset]);

  const wresRef = useRef(wres);
  const sweepRef = useRef(sweep);
  useEffect(() => { wresRef.current = wres; sweepRef.current = sweep; }, [wres, sweep]);
  const sim = useMemo(() => new ParticleSim(graph), [graph]);

  // paint the airflow map whenever the solution changes
  useEffect(() => {
    if (mode !== "wind") return;
    const cv = canvasRef.current;
    if (cv) cv.getContext("2d")?.putImageData(new ImageData(paintWind(sc, graph, wres.ach) as Uint8ClampedArray<ArrayBuffer>, sc.grid.cols, sc.grid.rows), 0, 0);
  }, [mode, sc, graph, wres]);

  // particles + wind sweep
  useEffect(() => {
    if (mode !== "wind") return;
    sim.clear();
    let raf = 0, last = 0;
    const tick = (ts: number) => {
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      const pc = particleRef.current;
      if (dt && sweepRef.current) setManual((m) => ({ dir: (((m?.dir ?? wd) + dt * 16) % 360), spd: m?.spd ?? ws }));
      if (pc) {
        const c = pc.getContext("2d");
        if (c) {
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.clearRect(0, 0, pc.width, pc.height);
          if (!reduceMotion) {
            if (dt) sim.step(dt, wresRef.current);
            const s = pc.width / vb.w;
            c.setTransform(s, 0, 0, s, -vb.x * s, -vb.y * s);
            sim.draw(c);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // wd and ws are only read to seed a sweep that starts from the preset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sim, vb, reduceMotion]);

  // ---- labels and table ----
  const values = useMemo(() => sc.rooms.map((r, i) => {
    if (mode === "light") return frame ? `${fmtLx(frame.stats[i]?.med ?? 0)} lx` : "";
    const n = graph.nodeOfRoom[i];
    return n < 0 ? "outdoor" : `${fmtA(wres.ach[n])} /h`;
  }), [sc, mode, frame, graph, wres]);

  const status = (cov: number): ["off" | "part" | "on", string] => (cov >= 0.8 ? ["off", "Lights off"] : cov >= 0.4 ? ["part", "Partly lit"] : ["on", "Lights on"]);
  const dot: Record<string, string> = { off: "bg-emerald-400", part: "bg-amber-400", on: "ring-1 ring-slate-400 ring-offset-2 ring-offset-[#0a0e15] bg-slate-500", good: "bg-emerald-400", mid: "bg-slate-400", low: "bg-amber-400", none: "bg-slate-500" };

  const lit: string[] = [], need: string[] = [];
  if (frame) sc.rooms.forEach((r, i) => { if (r.outdoor) return; const q = frame.stats[i]; if (q && q.sun > 0.01) lit.push(r.name); if (q && q.cov < 0.4) need.push(r.name); });
  const cross: string[] = [], stuffy: string[] = [];
  graph.nodes.forEach((n, i) => { if (wres.inn[i] > 0.04) cross.push(n.name); if (wres.ach[i] < 6) stuffy.push(n.name); });

  const sunText = frame
    ? frame.sun.alt > 0
      ? `Sun ${Math.round(frame.sun.alt)}° high · ${dirName(frame.sun.az)} ${Math.round(frame.sun.az)}° · outside ${fmtLx(frame.out.dirN * Math.sin((frame.sun.alt * Math.PI) / 180) + frame.out.dif)} lx`
      : `Sun below horizon · outside ${Math.round(frame.out.dif)} lx`
    : "";
  const selNode = graph.nodeOfRoom[selIdx];
  const dayLabel = `${date.d} ${MONTHS[date.m - 1]}`;

  if (!sc.rooms.some((r) => !r.outdoor)) return <Card><p className="text-sm text-slate-400">Trace at least one room first.</p></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Seg label="Mode" value={mode} onChange={setMode} options={[{ value: "light", label: "Daylight" }, { value: "wind", label: "Wind & air" }]} />
        <p className="text-[13px] text-slate-400">
          {project.address ? `${project.address} · ` : ""}{project.lat.toFixed(3)}°, {project.lon.toFixed(3)}° · floor {project.floor} · plan top faces {Math.round(project.north)}° {dirName(project.north)}
        </p>
      </div>
      {warnings.length > 0 && <p className="rounded-xl border border-amber-300/30 bg-amber-300/5 px-3 py-2 text-xs leading-5 text-amber-200">{[...new Set(warnings)].join(" ")}</p>}
      {engineErr && <p className="rounded-xl border border-rose-400/30 bg-rose-400/5 px-3 py-2 text-xs text-rose-200">The daylight calculation failed: {engineErr}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <Stage
              sc={sc} project={project} mode={mode} values={values} selId={selRoom?.id ?? null} onSelect={setSelId}
              sun={mode === "light" ? frame?.sun ?? null : null} windDir={wd} windSpd={ws}
              canvasRef={canvasRef} particleRef={particleRef} stageRef={stageRef}
              label={mode === "light" ? "Floor plan with daylight levels per room" : "Floor plan with air changes per hour per room"}
            />
            <p className="mt-2 text-xs text-slate-500 sm:hidden">Swipe the plan sideways to see all of it. Tap a room for its chart.</p>
            <Legend mode={mode} view={view} />

            {mode === "light" ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play the day"} className="grid h-12 w-12 place-items-center rounded-full bg-amber-400 text-slate-950 transition hover:bg-amber-300">
                    {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <div className="flex flex-wrap items-baseline gap-x-4">
                    <span className="font-mono text-3xl font-medium tracking-tight tabular-nums">{fmtT(hour)}</span>
                    <span className="text-[13px] text-slate-400">{sunText}</span>
                  </div>
                </div>
                <Scrubber hour={hour} onChange={setHour} onGrab={() => setPlaying(false)} out={cur?.out ?? null} rise={cur?.rise ?? 6} set={cur?.set ?? 18} />
                <div className="space-y-0.5 text-[13px]">
                  <p><span className="text-slate-400">Direct sun inside:</span> <b className="font-semibold">{lit.length ? lit.join(", ") : "none"}</b></p>
                  <p><span className="text-slate-400">Lights needed:</span> <b className="font-semibold">{need.length ? need.join(", ") : "none"}</b></p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <button type="button" onClick={() => { if (!sweep && !manual) setManual({ dir: wd, spd: ws }); setSweep((s) => !s); }} aria-label={sweep ? "Stop sweeping the wind" : "Sweep the wind direction"} className="grid h-12 w-12 place-items-center rounded-full bg-sky-400 text-slate-950 transition hover:bg-sky-300">
                    {sweep ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <div className="flex flex-wrap items-baseline gap-x-4">
                    <span className="font-mono text-3xl font-medium tracking-tight tabular-nums">{dirName(wd)} {Math.round(wd)}°</span>
                    <span className="text-[13px] text-slate-400">{ws.toFixed(1)} m/s at floor {project.floor}</span>
                  </div>
                </div>
                <Range label="Wind from" value={Math.round(wd)} min={0} max={359} onChange={(v) => { setSweep(false); setManual({ dir: v, spd: ws }); }} readout={`${dirName(wd)} ${Math.round(wd)}°`} />
                <Range label="Speed" value={ws} min={0.5} max={12} step={0.5} onChange={(v) => setManual({ dir: wd, spd: v })} readout={`${ws.toFixed(1)} m/s`} />
                <div className="space-y-0.5 text-[13px]">
                  <p><span className="text-slate-400">Air moving through:</span> <b className="font-semibold">{cross.length ? cross.join(", ") : "none"}</b></p>
                  <p><span className="text-slate-400">Stuffy (under 6 per hour):</span> <b className="font-semibold">{stuffy.length ? stuffy.join(", ") : "none"}</b></p>
                  {rose && (() => { const dm = dominant(rose); return <p><span className="text-slate-400">Wind record, {season.name}:</span> <b className="font-semibold">{Math.round(dm.share)}% of hours from {dirName((dm.km + 15) * 22.5)}–{dirName((dm.km + 1) * 22.5)}</b>, mean {(rose.mean * uf).toFixed(1)} m/s at floor {project.floor}</p>; })()}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <H2>Conditions</H2>
            {mode === "light" ? (
              <div className="space-y-3">
                <Row label="Date">
                  <input
                    type="date" value={isoOf(date)} aria-label="Date"
                    onChange={(e) => { const v = e.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) setDate({ y: +v.slice(0, 4), m: +v.slice(5, 7), d: +v.slice(8, 10) }); }}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-slate-100 [color-scheme:dark]"
                  />
                  <Seg small label="Date presets" value={PRESETS.find((p) => p.m === date.m && p.d === date.d)?.label ?? ""} onChange={(v) => { const p = PRESETS.find((x) => x.label === v)!; setDate((d) => ({ ...d, m: p.m, d: p.d })); }} options={PRESETS.map((p) => ({ value: p.label, label: p.label }))} />
                </Row>
                <Row label="Sky"><Seg small label="Sky" value={sky} onChange={setSky} options={[{ value: "clear", label: "Clear" }, { value: "part", label: "Partly cloudy" }, { value: "over", label: "Overcast" }]} /></Row>
                <Row label="View"><Seg small label="Map view" value={view} onChange={setView} options={[{ value: "day", label: "Daylight" }, { value: "lux", label: "Lux map" }]} /></Row>
                <Row label="Lamps"><Check checked={lamps} onChange={setLamps}>Dim each room&apos;s lights up to its target (daylight harvesting)</Check></Row>
                <Row label="Speed"><Seg small label="Playback speed" value={String(speed)} onChange={(v) => setSpeed(Number(v))} options={[{ value: "2.4", label: "Slow" }, { value: "1.4", label: "Normal" }, { value: "0.7", label: "Fast" }]} /></Row>
                <p className="text-[11px] leading-4 text-slate-500">Clock is local time, UTC{tzh >= 0 ? "+" : "−"}{Math.floor(Math.abs(tzh))}{Math.abs(tzh) % 1 ? `:${String(Math.round((Math.abs(tzh) % 1) * 60)).padStart(2, "0")}` : ""}{tzKnown ? "" : " (estimated from longitude)"}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Row label="Seasons">
                  <Seg small label="Season scheme" value={scheme.id} onChange={(v) => { setSchemeId(v); setSeasonState(null); setManual(null); }} options={[{ value: "india", label: "Indian seasons" }, { value: "quarters", label: "Calendar quarters" }]} />
                </Row>
                <Row label="Season">
                  <Seg small label="Season" value={seasonId} onChange={(v) => { setSeasonState(v); setManual(null); setSweep(false); }} options={seasons.map((s) => ({ value: s.id, label: s.short }))} />
                </Row>
                <Row label="Windows"><Seg small label="Window state" value={winState} onChange={setWinState} options={[{ value: "open", label: "Open" }, { value: "half", label: "Half" }, { value: "closed", label: "Closed" }]} /></Row>
                {doorGroups.size > 0 && (
                  <Row label="Doors">
                    <div className="space-y-1.5">
                      {doorGroups.has("bed") && <Check checked={doors.bed} onChange={(v) => setDoors((d) => ({ ...d, bed: v }))}>Bedroom doors open</Check>}
                      {doorGroups.has("kit") && <Check checked={doors.kit} onChange={(v) => setDoors((d) => ({ ...d, kit: v }))}>Kitchen and utility door open</Check>}
                      {doorGroups.has("toi") && <Check checked={doors.toi} onChange={(v) => setDoors((d) => ({ ...d, toi: v }))}>Toilet doors open</Check>}
                    </div>
                  </Row>
                )}
                <div className="text-[12px] leading-5 text-slate-400" role="status">
                  {windLoading && "Loading the wind record for this location from Open-Meteo…"}
                  {windErr && (
                    <span className="text-amber-300">Could not load the wind record: {windErr} The sliders still work; season averages need the record. <button type="button" className="underline" onClick={() => { setWind(null); setRetry((n) => n + 1); }}>Retry</button></span>
                  )}
                  {rec && <>Wind record: ERA5 reanalysis, hourly, {rec.years} years to {rec.to.slice(0, 4)}, via Open-Meteo, at 10 m for the grid cell nearest the pin, scaled by {uf.toFixed(2)} to floor {project.floor} (power law, exponent {project.alpha}). Reanalysis smooths out terrain and nearby buildings.</>}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <H2>{mode === "light" ? "Rooms right now" : "Rooms in this wind"}</H2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-slate-400">
                    <th className="px-1.5 pb-1.5 font-medium">Room</th>
                    <th className="px-1.5 pb-1.5 text-right font-medium" title={mode === "light" ? "Median illuminance over the room's floor at 0.75 m" : "Air changes per hour in this wind"}>{mode === "light" ? "Typical lx" : "Air changes/h"}</th>
                    <th className="px-1.5 pb-1.5 font-medium">{mode === "light" ? "Light" : "Airflow"}</th>
                    <th className="hidden px-1.5 pb-1.5 text-right font-medium sm:table-cell" title={mode === "light" ? "Hours between 06:00 and 18:00 when at least 80% of the floor meets the room's target" : "How the air moves"}>{mode === "light" ? "Lights off" : "Path"}</th>
                    {mode === "wind" && <th className="hidden px-1.5 pb-1.5 text-right font-medium sm:table-cell" title="Air changes per hour averaged over the wind record for the chosen season">Season avg</th>}
                  </tr>
                </thead>
                <tbody>
                  {sc.rooms.map((r, i) => {
                    const sel = i === selIdx;
                    const q = frame?.stats[i];
                    const n = graph.nodeOfRoom[i];
                    let cells: React.ReactNode;
                    if (mode === "light") {
                      const [cls, txt] = r.outdoor ? [(q?.sun ?? 0) > 0.05 ? "mid" : "none", (q?.sun ?? 0) > 0.05 ? "Sunlit" : "Shade"] : q ? status(q.cov) : ["none", "…"];
                      const extra = !r.outdoor && lamps && frame && frame.lamp[i] > 0 ? ` · ${Math.round((frame.lamp[i] / r.target) * 100)}%` : "";
                      cells = (
                        <>
                          <td className="px-1.5 py-1.5 text-right font-mono tabular-nums">{q ? fmtLx(q.med) : "–"}</td>
                          <td className="px-1.5 py-1.5"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs"><i className={cx("inline-block h-2 w-2 rounded-full", dot[cls])} />{txt}{extra}</span></td>
                          <td className="hidden px-1.5 py-1.5 text-right font-mono tabular-nums sm:table-cell">{r.outdoor || !cur ? "–" : `${cur.offH[i]?.toFixed(1)} h`}</td>
                        </>
                      );
                    } else if (n < 0) {
                      cells = <><td className="px-1.5 py-1.5 text-right font-mono">–</td><td className="px-1.5 py-1.5 text-xs">Open air</td><td className="hidden px-1.5 py-1.5 text-right sm:table-cell">–</td><td className="hidden px-1.5 py-1.5 text-right sm:table-cell">–</td></>;
                    } else {
                      const a = wres.ach[n], [cls, txt] = achStatus(a);
                      const thru = wres.inn[n] > 0.04, hx = wres.hasExt[n];
                      cells = (
                        <>
                          <td className="px-1.5 py-1.5 text-right font-mono tabular-nums">{fmtA(a)}</td>
                          <td className="px-1.5 py-1.5"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs"><i className={cx("inline-block h-2 w-2 rounded-full", dot[cls])} />{txt}</span></td>
                          <td className="hidden px-1.5 py-1.5 text-right text-xs sm:table-cell">{thru ? (hx ? "Cross-flow" : "Borrowed") : hx ? "Single-sided" : "Stagnant"}</td>
                          <td className="hidden px-1.5 py-1.5 text-right font-mono tabular-nums sm:table-cell">{seasonAvg ? fmtA(seasonAvg[n]) : "–"}</td>
                        </>
                      );
                    }
                    return (
                      <tr key={r.id} tabIndex={0} onClick={() => setSelId(r.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelId(r.id); } }}
                        className={cx("cursor-pointer border-t border-white/[0.07] outline-none hover:bg-amber-400/[0.07] focus-visible:ring-2 focus-visible:ring-cyan-300/60", sel && "bg-amber-400/[0.09]")}>
                        <td className="px-1.5 py-1.5">{r.name}{mode === "light" && q && q.sun > 0.01 ? <span className="ml-1.5 whitespace-nowrap font-mono text-[11px] text-amber-300">sun {Math.round(q.sun * 100)}%</span> : null}</td>
                        {cells}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <H2>{mode === "light" ? `${selRoom?.name} · typical lux · ${dayLabel} · ${skyLabel[sky]}` : `${selRoom?.name} · ${season.name}`}</H2>
            {mode === "light" ? (
              cur && selRoom && !selRoom.outdoor ? <DayCurve med={cur.med[selIdx]} target={selRoom.target} hour={hour} name={selRoom.name} />
                : cur && selRoom ? <DayCurve med={cur.med[selIdx]} target={0} hour={hour} name={selRoom.name} />
                : <p className="text-sm text-slate-500">{ready ? "Working out the day…" : "Preparing the sky model…"}</p>
            ) : selNode >= 0 ? (
              <WindChart vals={dirChart.map((r) => r[selNode])} rose={rose} avg={seasonAvg ? seasonAvg[selNode] : null} dir={wd} name={selRoom.name} />
            ) : <p className="text-sm text-slate-500">Balconies are open air, so air change rates do not apply. Pick an indoor room.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
      <span className="w-[68px] shrink-0 pt-1.5 text-xs text-slate-400">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Legend({ mode, view }: { mode: "light" | "wind"; view: "day" | "lux" }) {
  const grad = (stops: [number, number[]][]) => `linear-gradient(90deg, ${stops.map((s) => `rgb(${s[1].join(",")}) ${s[0] * 100}%`).join(", ")})`;
  if (mode === "wind") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
        <span>Air changes per hour</span>
        <span className="flex items-center gap-2"><span>0</span><span className="h-3 w-40 rounded" style={{ background: grad(WRAMP) }} /><span>40+</span></span>
        <span className="flex items-center gap-2"><span className="inline-block h-1 w-8 rounded bg-white" />air path</span>
      </div>
    );
  }
  if (view === "lux") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
        <span>Illuminance at 0.75 m</span>
        {BANDS.map((b) => <span key={b[2]} className="flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded-sm" style={{ background: `rgb(${b[1].join(",")})` }} />{b[2]}</span>)}
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
      <span>Illuminance at 0.75 m</span>
      <span className="flex items-center gap-2"><span>5 lx</span><span className="h-3 w-40 rounded" style={{ background: grad(RAMP_STOPS) }} /><span>5,000+ lx</span></span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded-sm bg-[#F2B84B]" />direct sun patch</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded-sm bg-[#FFD08A]" />lamp light</span>
    </div>
  );
}

