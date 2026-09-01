import { getTrack } from "./tracks";
import { maxWear, wingDamage } from "./engineer";
import type { Compound, TelemetryState } from "./types";

export interface Stint {
  compound: Compound;
  start: number;
  end: number;
  laps: number;
}

export interface Plan {
  id: string;
  label: string;
  stints: Stint[];
  stops: Array<{ lap: number; compound: Compound }>;
  totalTimeMs: number;
  deltaToBestMs: number;
  finishWear: number;
  rejoinPosition: number;
  confidence: number;
  uncertaintyMs: number;
  why: string;
}

export interface StrategyResult {
  call: "PIT NOW" | "PIT WINDOW" | "STAY OUT" | "REASSESS";
  targetLap: number;
  nextCompound: Compound;
  windowFrom: number;
  windowTo: number;
  advantageMs: number;
  confidence: number;
  rejoinPosition: number;
  evidence: string[];
  plans: Plan[];
}

const DRY: Compound[] = ["soft", "medium", "hard"];

const PACE_OFFSET: Record<Compound, number> = {
  soft: -0.55,
  medium: 0,
  hard: 0.45,
  inter: 4.2,
  wet: 8.5,
};

const DEG_RATE: Record<Compound, number> = {
  soft: 2.55,
  medium: 1.75,
  hard: 1.25,
  inter: 2.1,
  wet: 1.8,
};

function stintTimeMs(
  compound: Compound,
  laps: number,
  baseMs: number,
  trackDeg: number,
  startWear: number,
) {
  let total = 0;
  let wear = startWear;
  for (let i = 0; i < laps; i++) {
    const degPenalty = Math.max(0, wear - 30) * 11 * trackDeg;
    const cliff = wear > 85 ? (wear - 85) * 90 : 0;
    total += baseMs + PACE_OFFSET[compound] * 1000 + degPenalty + cliff;
    wear += DEG_RATE[compound] * trackDeg;
  }
  return { total, finishWear: wear };
}

function buildPlan(
  id: string,
  label: string,
  stops: Array<{ lap: number; compound: Compound }>,
  s: TelemetryState,
): Plan {
  const track = getTrack(s.trackId);
  const baseMs = track.lapTimeMs;
  const trackDeg = track.degradation;
  const starts = [s.lap, ...stops.map((x) => x.lap)];
  const ends = [...stops.map((x) => x.lap - 1), s.totalLaps];
  const compounds = [s.tyres.compound, ...stops.map((x) => x.compound)];

  let total = 0;
  let wear = maxWear(s);
  const stints: Stint[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i] as number;
    const end = ends[i] as number;
    const laps = Math.max(0, end - start + 1);
    const compound = compounds[i] as Compound;
    const res = stintTimeMs(compound, laps, baseMs, trackDeg, i === 0 ? wear : 2);
    total += res.total;
    wear = res.finishWear;
    stints.push({ compound, start, end, laps });
  }
  total += stops.length * track.pitLossMs;

  const remaining = s.totalLaps - s.lap;
  const uncertaintyMs = Math.max(900, remaining * 55 + stops.length * 700);
  const confidence = Math.max(
    28,
    Math.min(96, 96 - remaining * 0.55 - stops.length * 5 - Math.max(0, wear - 80) * 0.8),
  );
  const lostPositions = Math.min(6, Math.round(track.pitLossMs / 2600));
  const rejoinPosition = Math.min(s.fieldSize, s.position + (stops.length ? lostPositions : 0));

  return {
    id,
    label,
    stints,
    stops,
    totalTimeMs: total,
    deltaToBestMs: 0,
    finishWear: Math.min(100, wear),
    rejoinPosition,
    confidence,
    uncertaintyMs,
    why: describe(stints, stops, s),
  };
}

function describe(stints: Stint[], stops: Plan["stops"], s: TelemetryState) {
  if (!stops.length)
    return `Run the ${s.tyres.compound.toUpperCase()} to the flag. Saves ${(getTrack(s.trackId).pitLossMs / 1000).toFixed(1)}s of pit loss but finishes on high wear.`;
  const first = stops[0] as { lap: number; compound: Compound };
  const last = stints[stints.length - 1] as Stint;
  return `Stop on lap ${first.lap} for the ${first.compound.toUpperCase()}, then a ${last.laps}-lap final stint. ${stops.length === 1 ? "One stop keeps track position" : "Two stops trade position for pace"}.`;
}

export function computeStrategy(s: TelemetryState): StrategyResult {
  const track = getTrack(s.trackId);
  const remaining = s.totalLaps - s.lap;
  const wear = maxWear(s);

  if (s.sessionType !== "race" || remaining <= 0) {
    return {
      call: "REASSESS",
      targetLap: s.lap,
      nextCompound: "medium",
      windowFrom: s.lap,
      windowTo: s.lap,
      advantageMs: 0,
      confidence: 0,
      rejoinPosition: s.position,
      evidence: ["Pit strategy is only modelled for race sessions."],
      plans: [],
    };
  }

  const candidates: Plan[] = [];
  candidates.push(buildPlan("no-stop", "NO STOP", [], s));

  for (const c of DRY) {
    for (let offset = 2; offset <= Math.max(2, remaining - 4); offset += 3) {
      const lap = s.lap + offset;
      if (lap >= s.totalLaps) continue;
      candidates.push(buildPlan(`1-${c}-${lap}`, `1 STOP · ${c.toUpperCase()}`, [{ lap, compound: c }], s));
    }
  }
  for (const c1 of DRY) {
    for (const c2 of DRY) {
      const a = s.lap + Math.round(remaining * 0.3);
      const b = s.lap + Math.round(remaining * 0.65);
      if (b >= s.totalLaps || a >= b) continue;
      candidates.push(
        buildPlan(`2-${c1}${c2}`, `2 STOP · ${c1.toUpperCase()}→${c2.toUpperCase()}`, [
          { lap: a, compound: c1 },
          { lap: b, compound: c2 },
        ], s),
      );
    }
  }

  candidates.sort((a, b) => a.totalTimeMs - b.totalTimeMs);
  const best = candidates[0] as Plan;
  const plans = candidates.slice(0, 6).map((p) => ({ ...p, deltaToBestMs: p.totalTimeMs - best.totalTimeMs }));

  const nextStop = best.stops[0];
  const evidence: string[] = [
    `Tyre wear ${wear.toFixed(0)}% on ${s.tyres.compound.toUpperCase()}, age ${s.tyres.age} laps.`,
    `Pit loss at ${track.short} is ${(track.pitLossMs / 1000).toFixed(1)}s.`,
    `${remaining} laps remaining, degradation factor ${track.degradation.toFixed(2)}.`,
  ];

  let call: StrategyResult["call"] = "STAY OUT";
  let advantage = 0;

  if (s.lap <= 5 && wear < 55 && wingDamage(s) < 40) {
    evidence.push("Opening-lap guard active: no speculative call before a wear baseline exists.");
    return {
      call: "STAY OUT",
      targetLap: nextStop?.lap ?? s.totalLaps,
      nextCompound: nextStop?.compound ?? "medium",
      windowFrom: nextStop ? nextStop.lap - 2 : s.totalLaps,
      windowTo: nextStop ? nextStop.lap + 2 : s.totalLaps,
      advantageMs: 0,
      confidence: best.confidence,
      rejoinPosition: best.rejoinPosition,
      evidence,
      plans,
    };
  }

  if (nextStop) {
    const noStop = candidates.find((p) => p.id === "no-stop");
    advantage = noStop ? noStop.totalTimeMs - best.totalTimeMs : 0;
    const distance = nextStop.lap - s.lap;
    if (distance <= 0 || wear > 84 || wingDamage(s) > 45) call = "PIT NOW";
    else if (distance <= 3) call = "PIT WINDOW";
    else call = "STAY OUT";
    if ((s.phase === "SC" || s.phase === "VSC") && distance <= 8 && wear > 40) {
      call = "PIT NOW";
      evidence.push("Neutralised phase: pit loss is roughly halved — take the cheap stop.");
    }
  } else if (wear > 88) {
    call = "REASSESS";
  }

  return {
    call,
    targetLap: nextStop?.lap ?? s.totalLaps,
    nextCompound: nextStop?.compound ?? s.tyres.compound,
    windowFrom: nextStop ? Math.max(s.lap, nextStop.lap - 2) : s.totalLaps,
    windowTo: nextStop ? nextStop.lap + 2 : s.totalLaps,
    advantageMs: advantage,
    confidence: best.confidence,
    rejoinPosition: best.rejoinPosition,
    evidence,
    plans,
  };
}
