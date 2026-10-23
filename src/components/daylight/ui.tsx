"use client";

import { useId, useState } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-3xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5", className)}>{children}</div>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{children}</p>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{children}</h2>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet"; small?: boolean };
export function Btn({ variant = "ghost", small, className, ...p }: BtnProps) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        small ? "px-3.5 py-1.5 text-[13px]" : "px-5 py-2.5 text-sm",
        variant === "primary" && "bg-cyan-300 text-slate-950 hover:bg-cyan-200",
        variant === "ghost" && "border border-white/15 text-white hover:border-white/35 hover:bg-white/5",
        variant === "quiet" && "text-slate-400 hover:text-white",
        className,
      )}
    />
  );
}

export function Seg<T extends string>({
  value, onChange, options, label, small,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string; title?: string }[]; label: string; small?: boolean }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap overflow-hidden rounded-xl border border-white/10">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            small ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-[13px]",
            i > 0 && "border-l border-white/10",
            value === o.value ? "bg-cyan-300/15 font-semibold text-white shadow-[inset_0_-2px_0_#67e8f9]" : "text-slate-400 hover:bg-white/5 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const field = "w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-40";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-4 text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextIn({ value, onChange, ...p }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input {...p} className={cx(field, p.className)} value={value} onChange={(e) => onChange(e.target.value)} />;
}

/** Number input that lets the user type freely and commits valid values. */
export function NumIn({
  value, onChange, min, max, step = 0.05, digits = 2, ...p
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; digits?: number } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max" | "step">) {
  const fmt = String(Number(value.toFixed(digits)));
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...p}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      className={cx(field, p.className)}
      value={draft ?? fmt}
      onFocus={() => setDraft(fmt)}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)));
      }}
    />
  );
}

export function SelectIn<T extends string>({ value, onChange, options, ...p }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <select {...p} className={cx(field, "pr-7", p.className)} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
    </select>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-5 text-slate-300">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-[3px] h-4 w-4 shrink-0 accent-cyan-300" />
      <span>{children}</span>
    </label>
  );
}

export function Range({ label, value, min, max, step = 1, onChange, readout }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; readout: string }) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-[72px] shrink-0 text-xs text-slate-400">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-w-0 flex-1 accent-amber-400" />
      <span className="w-[84px] shrink-0 text-right font-mono text-[13px] tabular-nums text-slate-200">{readout}</span>
    </div>
  );
}
