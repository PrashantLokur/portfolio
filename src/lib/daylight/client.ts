import type { Curves, DayParams } from "./daylight";
import { EngineHost, type FrameOut, type Req, type Res } from "./host";
import type { Sky } from "./solar";
import type { Project } from "./types";

type Body<T> = T extends { id: number } ? Omit<T, "id"> : never;
type Pending = { resolve: (r: Res) => void; reject: (e: Error) => void };

/** Runs the daylight engine off the main thread; falls back to the page if workers are unavailable. */
export class DayRunner {
  private worker: Worker | null = null;
  private local: EngineHost | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();

  constructor() {
    try {
      this.worker = new Worker(new URL("./daylight.worker.ts", import.meta.url));
      this.worker.onmessage = (e: MessageEvent<Res>) => this.done(e.data);
      this.worker.onerror = () => this.failAll("The daylight worker stopped unexpectedly.");
    } catch {
      this.worker = null;
      this.local = new EngineHost();
    }
  }

  private done(r: Res) {
    const p = this.pending.get(r.id);
    if (!p) return;
    this.pending.delete(r.id);
    if (r.type === "error") p.reject(new Error(r.message));
    else p.resolve(r);
  }

  private failAll(msg: string) {
    for (const p of this.pending.values()) p.reject(new Error(msg));
    this.pending.clear();
  }

  private send<T extends Res["type"]>(req: Body<Req>): Promise<Extract<Res, { type: T }>> {
    const id = ++this.seq;
    const full = { ...req, id } as Req;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (r: Res) => void, reject });
      if (this.worker) this.worker.postMessage(full);
      else setTimeout(() => this.done(this.local!.handle(full)), 0);
    });
  }

  async init(project: Project): Promise<string[]> {
    return (await this.send<"init">({ type: "init", project })).warnings;
  }
  async curves(dp: DayParams, sky: Sky): Promise<Curves> {
    return (await this.send<"curves">({ type: "curves", dp, sky })).curves;
  }
  async frame(dp: DayParams, hour: number, sky: Sky, lamps: boolean, view: "day" | "lux"): Promise<FrameOut> {
    return (await this.send<"frame">({ type: "frame", dp, hour, sky, lamps, view })).frame;
  }
  dispose() {
    this.worker?.terminate();
    this.failAll("disposed");
  }
}
