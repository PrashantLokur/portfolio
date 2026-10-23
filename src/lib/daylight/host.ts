import { DaylightEngine, computeCurves, paintLux, type Curves, type DayParams, type RoomStat } from "./daylight";
import { compile } from "./scene";
import type { Sky } from "./solar";
import type { Project } from "./types";

export type Req =
  | { id: number; type: "init"; project: Project }
  | { id: number; type: "curves"; dp: DayParams; sky: Sky }
  | { id: number; type: "frame"; dp: DayParams; hour: number; sky: Sky; lamps: boolean; view: "day" | "lux" };

export interface FrameOut {
  rgba: Uint8ClampedArray;
  stats: RoomStat[];
  lamp: Float32Array;
  sun: { alt: number; az: number };
  out: { dirN: number; dif: number };
}

export type Res =
  | { id: number; type: "init"; warnings: string[] }
  | { id: number; type: "curves"; curves: Curves }
  | { id: number; type: "frame"; frame: FrameOut }
  | { id: number; type: "error"; message: string };

/** The ray work, independent of where it runs (a Web Worker, or the page itself as a fallback). */
export class EngineHost {
  private eng: DaylightEngine | null = null;

  handle(req: Req): Res {
    try {
      if (req.type === "init") {
        const sc = compile(req.project);
        this.eng = new DaylightEngine(sc);
        this.eng.precomputeSky();
        return { id: req.id, type: "init", warnings: sc.warnings };
      }
      const eng = this.eng;
      if (!eng) throw new Error("Engine not initialised");
      if (req.type === "curves") return { id: req.id, type: "curves", curves: computeCurves(eng, req.dp, req.sky) };
      const f = eng.evaluate(req.dp, req.hour, req.sky, req.lamps);
      return { id: req.id, type: "frame", frame: { rgba: paintLux(eng, f.lamp, req.view), stats: f.stats, lamp: f.lamp, sun: f.sun, out: f.out } };
    } catch (e) {
      return { id: req.id, type: "error", message: e instanceof Error ? e.message : String(e) };
    }
  }
}
