"use client";

import { useCallback, useRef, useState } from "react";

/** State with undo and redo. `live` updates during a drag are folded into one history step by `begin` and `end`. */
const resolve = <T,>(v: T | ((p: T) => T), base: T): T => (typeof v === "function" ? (v as (p: T) => T)(base) : v);

export function useHistory<T>(initial: T) {
  const [present, setPresent] = useState<T>(initial);
  const [depth, setDepth] = useState({ past: 0, future: 0 });
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const cur = useRef(present);
  const anchor = useRef<T | null>(null);

  const commit = useCallback((v: T) => {
    cur.current = v;
    setPresent(v);
    setDepth({ past: past.current.length, future: future.current.length });
  }, []);

  const push = useCallback((prev: T) => {
    past.current.push(prev);
    if (past.current.length > 200) past.current.shift();
    future.current = [];
  }, []);

  const set = useCallback((v: T | ((p: T) => T)) => {
    const next = resolve(v, cur.current);
    if (next === cur.current) return;
    push(cur.current);
    commit(next);
  }, [push, commit]);

  const begin = useCallback(() => { anchor.current = cur.current; }, []);
  const live = useCallback((v: T | ((p: T) => T)) => { commit(resolve(v, cur.current)); }, [commit]);
  const end = useCallback(() => {
    const a = anchor.current;
    anchor.current = null;
    if (a !== null && a !== cur.current) { push(a); commit(cur.current); }
  }, [push, commit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(cur.current);
    commit(prev);
  }, [commit]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(cur.current);
    commit(next);
  }, [commit]);
  const reset = useCallback((v: T) => { past.current = []; future.current = []; anchor.current = null; commit(v); }, [commit]);
  const get = useCallback(() => cur.current, []);

  return { value: present, get, set, live, begin, end, undo, redo, reset, canUndo: depth.past > 0, canRedo: depth.future > 0 };
}
