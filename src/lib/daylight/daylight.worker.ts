import { EngineHost, type Req } from "./host";

const host = new EngineHost();

self.onmessage = (e: MessageEvent<Req>) => {
  const res = host.handle(e.data);
  const transfer: Transferable[] = [];
  if (res.type === "frame") transfer.push(res.frame.rgba.buffer, res.frame.lamp.buffer);
  (self as unknown as Worker).postMessage(res, transfer);
};
