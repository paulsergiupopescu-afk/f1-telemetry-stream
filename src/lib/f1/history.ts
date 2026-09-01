import { cleanLaps, mean, median } from "./format";
import type { Compound, LapRecord, SessionType, TelemetryState } from "./types";

const KEY = "f1th.sessions.v1";

export interface StoredSession {
  id: string;
  label: string;
  savedAt: number;
  trackId: string;
  sessionType: SessionType;
  compound: Compound;
  laps: LapRecord[];
  bestMs: number;
  medianMs: number;
  averageMs: number;
  theoreticalMs: number;
  finishPosition: number;
  invalidRate: number;
}

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

export function loadSessions(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(state: TelemetryState): StoredSession | null {
  if (typeof window === "undefined" || state.laps.length === 0) return null;
  const existing = loadSessions();
  const now = new Date();
  const monthLabel = MONTHS[now.getMonth()] ?? "SESSION";
  const countThisMonth = existing.filter((s) => new Date(s.savedAt).getMonth() === now.getMonth()).length + 1;
  const valid = state.laps.filter((l) => l.valid).map((l) => l.timeMs);
  const clean = cleanLaps(valid);
  const session: StoredSession = {
    id: `${now.getTime()}`,
    label: `${monthLabel} · SESSION ${String(countThisMonth).padStart(2, "0")}`,
    savedAt: now.getTime(),
    trackId: state.trackId,
    sessionType: state.sessionType,
    compound: state.tyres.compound,
    laps: state.laps,
    bestMs: valid.length ? Math.min(...valid) : 0,
    medianMs: median(clean),
    averageMs: mean(clean),
    theoreticalMs: state.theoreticalBestMs,
    finishPosition: state.position,
    invalidRate: state.laps.length ? (state.laps.filter((l) => !l.valid).length / state.laps.length) * 100 : 0,
  };
  const next = [session, ...existing].slice(0, 40);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return session;
}

export function deleteSession(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(loadSessions().filter((s) => s.id !== id)));
}
