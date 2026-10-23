"use client";

import Link from "next/link";
import { ArrowLeft, Check, Copy, ImagePlus, Link2, PencilRuler } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EXAMPLE_PROJECT } from "../../lib/daylight/example";
import { decodeProject, encodeProject } from "../../lib/daylight/hash";
import { emptyProject, type Project } from "../../lib/daylight/types";
import { LocationPanel } from "./LocationPanel";
import { PlanEditor, type ImgState } from "./PlanEditor";
import { Results } from "./Results";
import { Btn, Card, H2, cx } from "./ui";
import { useHistory } from "./useHistory";

type Step = 1 | 2 | 3 | 4;
const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Plan and scale" },
  { n: 2, label: "Trace the flat" },
  { n: 3, label: "Location" },
  { n: 4, label: "Results" },
];

const noop = () => () => {};

export function DaylightTool() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const hist = useHistory<Project>(EXAMPLE_PROJECT);
  const project = hist.value;
  const [step, setStep] = useState<Step>(4);
  const [source, setSource] = useState<"example" | "mine" | "shared">("example");
  const [located, setLocated] = useState(true);
  const [img, setImgState] = useState<ImgState | null>(null);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [skipImage, setSkipImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<"idle" | "ok" | "manual">("idle");
  const [link, setLink] = useState("");
  const [drag, setDrag] = useState(false);
  const [hashDone, setHashDone] = useState(false);
  const wantsHash = mounted && window.location.hash.startsWith("#p=");

  const setImg = useCallback((f: (i: ImgState | null) => ImgState | null) => setImgState(f), []);

  // open a shared link
  useEffect(() => {
    let dead = false;
    const h = window.location.hash;
    if (!h.startsWith("#p=")) return;
    decodeProject(h).then((p) => {
      if (dead) return;
      if (p) {
        hist.reset(p);
        setSource("shared");
        setLocated(true);
        setStep(4);
      }
      setHashDone(true);
    });
    return () => { dead = true; };
    // run once on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // free the image only when it is replaced or the page goes away, not on every scale or opacity change
  const imgUrl = useRef<string | null>(null);
  useEffect(() => { imgUrl.current = img?.url ?? null; }, [img]);
  useEffect(() => () => { if (imgUrl.current) URL.revokeObjectURL(imgUrl.current); }, []);

  const loadFile = (f: File | undefined) => {
    if (!f) return;
    setImgErr(null);
    if (!f.type.startsWith("image/")) { setImgErr("That file is not an image. Use a PNG, JPG or WebP picture of the plan (export a PDF page as an image first)."); return; }
    if (f.size > 40 * 1024 * 1024) { setImgErr("That image is larger than 40 MB. Reduce it and try again."); return; }
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      setImgState((old) => { if (old) URL.revokeObjectURL(old.url); return { url, w: im.naturalWidth, h: im.naturalHeight, mpp: 15 / im.naturalWidth, x: 0, y: 0, opacity: 0.6, scaled: false }; });
      setSkipImage(false);
    };
    im.onerror = () => { URL.revokeObjectURL(url); setImgErr("This browser could not open that image. Try a PNG or JPG."); };
    im.src = url;
  };

  const startOwn = () => {
    const p = emptyProject();
    p.lat = 20; p.lon = 0;
    hist.reset(p);
    setSource("mine");
    setLocated(false);
    setImgState(null);
    setSkipImage(false);
    setStep(1);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  };

  const updateMeta = useCallback((patch: Partial<Project>) => {
    hist.live((p) => ({ ...p, ...patch }));
    if ("lat" in patch || "lon" in patch || "address" in patch) setLocated(true);
  }, [hist]);

  const indoor = project.rooms.filter((r) => r.type !== "balcony").length;
  const windows = project.openings.filter((o) => o.kind === "window").length;
  const canNext: Record<Step, string | null> = {
    1: img ? (img.scaled ? null : "Set the scale first: tap the Set scale tool, then two ends of a known length.") : skipImage ? null : "Upload a plan image, or choose to draw without one.",
    2: indoor === 0 ? "Trace at least one room." : windows === 0 ? "Add at least one window or balcony door." : null,
    3: located ? null : "Search an address or tap the map to place the pin.",
    4: null,
  };
  const go = (n: Step) => setStep(n);
  const reach = (n: Step) => n <= 2 || (n === 3 && !canNext[2]) || (n === 4 && !canNext[2] && located);

  const copyLink = async () => {
    const hash = await encodeProject(project);
    const url = `${window.location.origin}/daylight#${hash}`;
    history.replaceState(null, "", `#${hash}`);
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("manual");
    }
    setTimeout(() => setCopied((c) => (c === "ok" ? "idle" : c)), 2500);
  };

  const resultsProject = useMemo(() => project, [project]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Steps" className="flex flex-wrap gap-2">
          {STEPS.map((s) => (
            <button
              key={s.n}
              type="button"
              disabled={!reach(s.n)}
              onClick={() => go(s.n)}
              aria-current={step === s.n ? "step" : undefined}
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-40",
                step === s.n ? "border-cyan-300/60 bg-cyan-300/15 font-semibold text-white" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white",
              )}
            >
              <span className={cx("grid h-5 w-5 place-items-center rounded-full text-[11px]", step === s.n ? "bg-cyan-300 text-slate-950" : "bg-white/10")}>{s.n}</span>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {source === "example" && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">Example flat</span>}
          {source === "shared" && <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">Shared flat</span>}
          {step === 4 && source !== "mine" && <Btn small onClick={() => go(2)}><PencilRuler size={14} />Edit this flat</Btn>}
          {source !== "mine" && <Btn small variant="primary" onClick={startOwn}><ImagePlus size={14} />Use my own plan</Btn>}
          {step === 4 && (
            <Btn small onClick={copyLink}>{copied === "ok" ? <Check size={14} /> : <Copy size={14} />}{copied === "ok" ? "Link copied" : "Copy link"}</Btn>
          )}
        </div>
      </div>

      {copied === "manual" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
          <p className="mb-1.5 flex items-center gap-2"><Link2 size={14} />Your browser blocked copying. Select the link below:</p>
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px]" aria-label="Shareable link" />
        </div>
      )}

      {step === 1 && (
        <section aria-labelledby="s1" className="space-y-4">
          <div>
            <h2 id="s1" className="text-2xl font-semibold tracking-[-0.03em]">Upload your floor plan</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">The picture stays in your browser. It is never uploaded anywhere, and it is not part of the shareable link. You trace the rooms and windows over it in the next step.</p>
          </div>
          {!img ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); loadFile(e.dataTransfer.files[0]); }}
              className={cx("rounded-3xl border border-dashed px-6 py-14 text-center transition", drag ? "border-cyan-300/70 bg-cyan-300/5" : "border-white/15 bg-white/[0.02]")}
            >
              <ImagePlus className="mx-auto text-slate-500" size={32} />
              <p className="mt-4 text-slate-200">Drop a plan image here</p>
              <p className="mt-1 text-xs text-slate-500">PNG, JPG or WebP</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Btn variant="primary" onClick={() => fileRef.current?.click()}>Choose an image</Btn>
                <Btn onClick={() => { setSkipImage(true); setStep(2); }}>Draw without an image</Btn>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Btn small onClick={() => fileRef.current?.click()}>Replace image</Btn>
                <p className="text-xs text-slate-400">{img.scaled ? "Scale set. You can pick another dimension to refine it." : "Now set the scale by tapping the two ends of a length you know."}</p>
              </div>
              <PlanEditor hist={hist} img={img} setImg={setImg} mode="calibrate" onUploadClick={() => fileRef.current?.click()} />
            </>
          )}
          {imgErr && <p className="text-sm text-rose-300" role="alert">{imgErr}</p>}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Choose a plan image" onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ""; }} />
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="s2" className="space-y-4">
          <div>
            <h2 id="s2" className="text-2xl font-semibold tracking-[-0.03em]">Trace the flat</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Draw each room, then the outer walls, then place windows, balcony doors and interior doors on the walls. Tap a shape to edit it. Corners snap to each other and line up; hold Alt to place freely.</p>
          </div>
          <PlanEditor hist={hist} img={img} setImg={setImg} mode="trace" onUploadClick={() => { setStep(1); }} />
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="s3" className="space-y-4">
          <div>
            <h2 id="s3" className="text-2xl font-semibold tracking-[-0.03em]">Where is it, and which way does it face</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">The location sets the sun path and the wind record. The floor sets the wind height. Place the pin on the building, not just the street.</p>
          </div>
          <LocationPanel project={project} update={updateMeta} located={located} />
        </section>
      )}

      {step === 4 && mounted && (!wantsHash || hashDone) && (
        <section aria-label="Results">
          <Results project={resultsProject} />
        </section>
      )}

      {step < 4 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <Btn variant="quiet" onClick={() => go((step - 1) as Step)} disabled={step === 1}><ArrowLeft size={16} />Back</Btn>
          <div className="flex flex-wrap items-center gap-3">
            {canNext[step] && <p className="max-w-md text-right text-xs text-slate-500" role="status">{canNext[step]}</p>}
            <Btn variant="primary" disabled={!!canNext[step]} onClick={() => go((step + 1) as Step)}>{step === 3 ? "Show results" : "Next"}</Btn>
          </div>
        </div>
      )}

      <Card className="!bg-amber-300/[0.04] !border-amber-300/20">
        <H2>Please read</H2>
        <p className="text-sm leading-6 text-slate-300">
          This is a simplified, indicative model. It is not a certified daylight study and not a CFD simulation, and it should not be used to demonstrate compliance with any standard or to make purchase or design decisions on its own. Treat the numbers as a way to compare rooms, orientations and options.
        </p>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">How this is calculated</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-6 text-slate-400">
            <li>Sun position uses the NOAA solar equations for your pin, in local clock time. Sunrise and sunset shown are geometric. Orientation comes from the bearing you give for the top of the plan.</li>
            <li>Outdoor light is a clear, partly cloudy or overcast sky model. Direct sun is traced as rays from each point on a 0.75 m work plane through the openings you placed, past the walls you traced, and under any balcony slab. Sky light is summed over 145 sky patches with a CIE overcast distribution. Inter-reflection is a split-flux average per room.</li>
            <li>A room with no window of its own borrows about 12% of the typical light in the room its door opens to. Glass transmits 60% (clear), 35% (tinted) or 20% (frosted or jali, diffuse light only) unless you change it.</li>
            <li>Typical lux is the median over the room&apos;s floor, so a bright sun patch does not inflate it. The sun percentage beside a room is the share of its floor in direct sun. Lights off means 80% or more of the floor meets the target, Partly lit means 40 to 80%. Lights off hours count 06:00 to 18:00.</li>
            <li>Default targets: living and dining 150 lx, kitchen 200, bedrooms and toilets 100, study 300. You can change each room&apos;s target.</li>
            <li>Wind mode treats each room (or open-plan group) as one air node and each window or door as an opening, then solves the pressure balance, flow = 0.6 × area × √(2Δp/ρ). Facade pressure coefficients follow the wind angle: +0.6 head-on, about −0.45 on side faces, −0.3 on the lee. A room with only one opening gets no through-flow; its exchange is estimated as 0.025 × area × speed. Buoyancy, neighbouring buildings and insect screens are not modelled.</li>
            <li>Wind records come from the ERA5 reanalysis through Open-Meteo: hourly speed and direction at 10 m for up to ten years, reduced to 16 sectors per season and scaled to your floor with a power law (exponent 0.3 by default). Reanalysis smooths terrain and nearby buildings, so local winds will differ. Seasons follow Indian climate by default; outside India the calendar quarters are used.</li>
            <li>Not modelled: neighbouring buildings, trees, ground reflection, furniture, curtains, cloud movement, window frames. Treat values as indicative.</li>
          </ul>
        </details>
      </Card>

      <p className="text-center text-xs text-slate-600">
        Map data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · Wind data from <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> (ERA5, Copernicus) · <Link className="underline" href="/">prashantlokur.com</Link>
      </p>
    </div>
  );
}
