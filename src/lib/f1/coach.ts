import { cleanLaps, mean, median } from "./format";
import { getTrack } from "./tracks";
import type { LapRecord, TelemetryState } from "./types";

export type CoachTone = "go" | "warn" | "danger" | "info" | "neutral";

export interface CoachNote {
  id: string;
  title: string;
  detail: string;
  tone: CoachTone;
  gainMs?: number;
}

export interface MicroSegment {
  index: number;
  sector: 1 | 2 | 3;
  label: string;
  deltaMs: number;
}

export interface DrivingHabits {
  /** % of lap time with neither pedal applied */
  coastPct: number;
  /** % of lap time at full throttle */
  fullThrottlePct: number;
  /** % of braking time with some throttle overlap (trail/rolling) */
  overlapPct: number;
  /** average peak brake pressure 0-1 */
  brakePeak: number;
  samples: number;
}

export interface CoachAnalysis {
  bestMs: number;
  theoreticalMs: number;
  onTableMs: number;
  lastMs: number;
  lastDeltaMs: number;
  medianMs: number;
  spreadMs: number;
  consistency: number;
  rollingMs: number;
  trendMs: number;
  validLaps: number;
  invalidLaps: number;
  sectorLoss: [number, number, number];
  weakestSector: 1 | 2 | 3;
  worstSegments: MicroSegment[];
  notes: CoachNote[];
  focus: string;
  targetMs: number;
  targetProgress: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function segmentLabel(index: number, corners: number): string {
  const per = corners / 20;
  const from = Math.max(1, Math.round(index * per) + 1);
  const to = Math.max(from, Math.round((index + 1) * per));
  return from === to ? `T${from}` : `T${from}-${to}`;
}

export function segmentSector(index: number): 1 | 2 | 3 {
  if (index < 7) return 1;
  if (index < 14) return 2;
  return 3;
}

export function analyseCoach(state: TelemetryState, habits: DrivingHabits): CoachAnalysis {
  const track = getTrack(state.trackId);
  const laps: LapRecord[] = state.laps;
  const valid = laps.filter((l) => l.valid);
  const times = valid.map((l) => l.timeMs);
  const clean = cleanLaps(times);
  const bestMs = times.length ? Math.min(...times) : state.bestLapMs;
  const theoreticalMs = state.theoreticalBestMs;
  const onTableMs = bestMs && theoreticalMs ? Math.max(0, bestMs - theoreticalMs) : 0;
  const lastMs = state.lastLapMs;
  const lastDeltaMs = bestMs && lastMs ? lastMs - bestMs : 0;
  const medianMs = median(clean);
  const spreadMs = clean.length > 2 ? Math.max(...clean) - Math.min(...clean) : 0;
  const consistency = clamp(100 - (spreadMs / 1600) * 100, 0, 100);

  const last5 = times.slice(-5);
  const prev5 = times.slice(-10, -5);
  const rollingMs = mean(last5);
  const trendMs = prev5.length ? rollingMs - mean(prev5) : 0;

  // Sector loss: best-lap sectors vs personal best sectors.
  const sectorLoss: [number, number, number] = [0, 0, 0];
  const bestLap = valid.find((l) => l.timeMs === bestMs);
  const ref = bestLap ? [bestLap.s1, bestLap.s2, bestLap.s3] : state.sectors;
  state.bestSectors.forEach((bs, i) => {
    const cur = ref[i] ?? 0;
    sectorLoss[i] = bs > 0 && cur > 0 ? Math.max(0, cur - bs) : 0;
  });
  const weakestSector = (sectorLoss.indexOf(Math.max(...sectorLoss)) + 1) as 1 | 2 | 3;

  const worstSegments: MicroSegment[] = state.microSectors
    .map((deltaMs, index) => ({
      index,
      deltaMs,
      sector: segmentSector(index),
      label: segmentLabel(index, track.corners),
    }))
    .filter((s) => s.deltaMs > 0.5)
    .sort((a, b) => b.deltaMs - a.deltaMs)
    .slice(0, 4);

  const notes: CoachNote[] = [];

  if (onTableMs > 120) {
    notes.push({
      id: "theoretical",
      title: "Stitch the lap together",
      detail: `Your personal-best sectors add up to a lap ${(onTableMs / 1000).toFixed(3)}s quicker than your best. The speed is already there — you just haven't linked all three sectors on one lap yet.`,
      tone: "info",
      gainMs: onTableMs,
    });
  }

  if (sectorLoss[weakestSector - 1] > 80) {
    notes.push({
      id: "sector",
      title: `Sector ${weakestSector} is costing you`,
      detail: `You lose ${(sectorLoss[weakestSector - 1] / 1000).toFixed(3)}s in sector ${weakestSector} compared with your own best. Spend a run doing nothing but that sector — build the rest of the lap around it.`,
      tone: "warn",
      gainMs: sectorLoss[weakestSector - 1],
    });
  }

  if (worstSegments[0] && worstSegments[0].deltaMs > 40) {
    const w = worstSegments[0];
    notes.push({
      id: "segment",
      title: `Biggest single loss: ${w.label}`,
      detail: `Around ${w.label} you are dropping ~${(w.deltaMs / 1000).toFixed(3)}s a lap. Brake 5 metres later only once you can hit the same apex — most drivers lose here on the exit, not the entry.`,
      tone: "danger",
      gainMs: w.deltaMs,
    });
  }

  if (spreadMs > 900 && clean.length > 3) {
    notes.push({
      id: "consistency",
      title: "Repeatability before outright pace",
      detail: `Your clean laps spread over ${(spreadMs / 1000).toFixed(2)}s. Do a five-lap run targeting the same reference points every lap — a driver who can repeat within 0.3s finds tenths far faster than one chasing a hero lap.`,
      tone: "warn",
    });
  } else if (clean.length > 3 && spreadMs > 0) {
    notes.push({
      id: "consistency-good",
      title: "Consistency is strong",
      detail: `Only ${(spreadMs / 1000).toFixed(2)}s between your clean laps. You have the platform to start pushing entries harder — add risk in one corner at a time.`,
      tone: "go",
    });
  }

  const invalidLaps = laps.length - valid.length;
  if (invalidLaps >= 2 && invalidLaps / Math.max(1, laps.length) > 0.25) {
    notes.push({
      id: "limits",
      title: "Too many deleted laps",
      detail: `${invalidLaps} of ${laps.length} laps were invalidated. Pull 10cm back from the white line — a valid lap 0.1s slower beats a deleted lap every time.`,
      tone: "danger",
    });
  }

  if (habits.samples > 200) {
    if (habits.coastPct > 12) {
      notes.push({
        id: "coast",
        title: "You are coasting",
        detail: `${habits.coastPct.toFixed(0)}% of the lap has neither pedal applied (target under 8%). Stay on the brake longer into the corner and get back to throttle earlier — dead time is free lap time.`,
        tone: "warn",
        gainMs: (habits.coastPct - 8) * 25,
      });
    }
    if (habits.fullThrottlePct < 38 && track.corners < 22) {
      notes.push({
        id: "throttle",
        title: "Not enough full throttle",
        detail: `Only ${habits.fullThrottlePct.toFixed(0)}% of the lap is at 100% throttle. Sacrifice a little entry speed to straighten the car earlier and pin it sooner out of the fast corners.`,
        tone: "info",
      });
    }
    if (habits.brakePeak < 0.72) {
      notes.push({
        id: "brake",
        title: "Softer brake hits than you can afford",
        detail: `Peak brake pressure averages ${(habits.brakePeak * 100).toFixed(0)}%. Hit the pedal hard and bleed off — a strong initial hit lets you brake later without upsetting the car.`,
        tone: "warn",
      });
    }
    if (habits.overlapPct > 18) {
      notes.push({
        id: "overlap",
        title: "Pedal overlap detected",
        detail: `${habits.overlapPct.toFixed(0)}% of your braking has throttle applied. Overlapping pedals scrubs speed and heats the fronts — separate the inputs cleanly.`,
        tone: "danger",
      });
    }
  }

  if (!notes.length) {
    notes.push({
      id: "warmup",
      title: "Building your baseline",
      detail: "Run a few clean laps at 90% to give the coach reference data. Feedback sharpens after three valid laps.",
      tone: "neutral",
    });
  }

  const focus = worstSegments[0]
    ? `Sector ${worstSegments[0].sector} · ${worstSegments[0].label}`
    : bestMs
      ? `Sector ${weakestSector} refinement`
      : "Set a clean baseline lap";

  const targetMs = theoreticalMs || (bestMs ? bestMs - 400 : track.lapTimeMs);
  const targetProgress =
    bestMs && targetMs ? clamp(100 - ((bestMs - targetMs) / Math.max(1, targetMs * 0.02)) * 100, 0, 100) : 0;

  return {
    bestMs,
    theoreticalMs,
    onTableMs,
    lastMs,
    lastDeltaMs,
    medianMs,
    spreadMs,
    consistency,
    rollingMs,
    trendMs,
    validLaps: valid.length,
    invalidLaps,
    sectorLoss,
    weakestSector,
    worstSegments,
    notes,
    focus,
    targetMs,
    targetProgress,
  };
}

export const DRILLS = [
  {
    id: "reference",
    name: "Reference-point run",
    laps: 5,
    detail: "Pick one braking marker per corner and hit it every lap. Ignore the clock — you are building repeatability.",
  },
  {
    id: "sector",
    name: "Single-sector attack",
    laps: 6,
    detail: "Push only your weakest sector, cruise the rest. Isolating the problem finds more time than pushing everywhere.",
  },
  {
    id: "brake-later",
    name: "One-metre-later ladder",
    laps: 4,
    detail: "Move your brake point one metre later per lap in one corner until you miss the apex, then step back one.",
  },
  {
    id: "exit",
    name: "Exit-priority lap",
    laps: 5,
    detail: "Deliberately slow the entries and prioritise early throttle. Compare sector times — exits usually win.",
  },
  {
    id: "clean",
    name: "Zero-deletion run",
    laps: 8,
    detail: "Every lap must be valid. Track limits discipline transfers straight into qualifying and race pace.",
  },
] as const;
