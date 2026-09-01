import type { Compound } from "./types";

export function fmtLap(ms: number): string {
  if (!ms || ms <= 0 || !Number.isFinite(ms)) return "--:--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mss = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(mss).padStart(3, "0")}`;
}

export function fmtSector(ms: number): string {
  if (!ms || ms <= 0 || !Number.isFinite(ms)) return "--.---";
  return (ms / 1000).toFixed(3);
}

export function fmtDelta(ms: number, digits = 3): string {
  if (!Number.isFinite(ms)) return "--";
  const sign = ms > 0 ? "+" : ms < 0 ? "-" : "";
  return `${sign}${(Math.abs(ms) / 1000).toFixed(digits)}`;
}

export function fmtGap(ms: number): string {
  if (!Number.isFinite(ms) || ms >= 900000) return "--";
  return `+${(ms / 1000).toFixed(3)}`;
}

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export const COMPOUND_LABEL: Record<Compound, string> = {
  soft: "SOFT",
  medium: "MEDIUM",
  hard: "HARD",
  inter: "INTER",
  wet: "WET",
};

export const COMPOUND_SHORT: Record<Compound, string> = {
  soft: "S",
  medium: "M",
  hard: "H",
  inter: "I",
  wet: "W",
};

export function compoundVar(c: Compound): string {
  return `var(--tyre-${c})`;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Drops laps more than ~7% off the median, as the desktop app does. */
export function cleanLaps(times: number[]): number[] {
  if (times.length < 3) return times;
  const med = median(times);
  return times.filter((t) => Math.abs(t - med) / med <= 0.07);
}
