import type { DrivingHabits } from "./coach";
import type { LapRecord } from "./types";

export type DrillId = "reference" | "sector" | "brake-later" | "exit" | "clean";

export interface DrillCriterion {
  id: string;
  label: string;
  /** target described for the UI, e.g. "spread under 0.40s" */
  target: string;
  /** 0..1 achievement */
  score: number;
  actual: string;
  passed: boolean;
  weight: number;
}

export interface DrillStep {
  title: string;
  detail: string;
}

export interface Drill {
  id: DrillId;
  name: string;
  laps: number;
  goal: string;
  skill: string;
  detail: string;
  steps: DrillStep[];
  /** criteria evaluated from the laps completed during the drill */
  evaluate: (ctx: DrillContext) => DrillCriterion[];
}

export interface DrillContext {
  laps: LapRecord[];
  habits: DrivingHabits;
  /** best lap time before the drill started, 0 when unknown */
  referenceMs: number;
  weakestSector: 1 | 2 | 3;
}

export interface DrillResult {
  criteria: DrillCriterion[];
  score: number;
  grade: string;
  verdict: string;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const s = (ms: number) => `${(ms / 1000).toFixed(3)}s`;

function spread(times: number[]) {
  if (times.length < 2) return 0;
  return Math.max(...times) - Math.min(...times);
}

function scoreBand(actual: number, good: number, bad: number) {
  // good -> 1, bad -> 0 (works for both directions)
  if (good === bad) return actual <= good ? 1 : 0;
  return clamp01((bad - actual) / (bad - good));
}

function completion(laps: LapRecord[], target: number): DrillCriterion {
  const score = clamp01(laps.length / target);
  return {
    id: "completion",
    label: "Laps completed",
    target: `${target} laps`,
    actual: `${laps.length} laps`,
    score,
    passed: laps.length >= target,
    weight: 1,
  };
}

function sectorOf(l: LapRecord, n: 1 | 2 | 3) {
  return n === 1 ? l.s1 : n === 2 ? l.s2 : l.s3;
}

export const DRILLS: Drill[] = [
  {
    id: "reference",
    name: "Reference-point run",
    laps: 5,
    goal: "Repeatability",
    skill: "Braking markers",
    detail: "Pick one braking marker per corner and hit it every lap. Ignore the clock — you are building repeatability.",
    steps: [
      { title: "Choose your markers", detail: "Before you start, name a fixed object (board, kerb start, shadow) for the three heaviest braking zones." },
      { title: "Out lap at 80%", detail: "Use the first lap only to look at the markers. Do not push." },
      { title: "Laps 1-3: hit the marker", detail: "Brake exactly at the marker every single lap, even if it feels early. Consistency over speed." },
      { title: "Laps 4-5: match the times", detail: "Now try to repeat your own lap time within four tenths. Same marker, same line." },
      { title: "Debrief", detail: "Check the lap spread below. Under 0.40s means your references are locked in." },
    ],
    evaluate: ({ laps }) => {
      const times = laps.filter((l) => l.valid).map((l) => l.timeMs);
      const sp = spread(times);
      return [
        completion(laps, 5),
        {
          id: "spread",
          label: "Lap-time spread",
          target: "under 0.40s",
          actual: times.length > 1 ? s(sp) : "—",
          score: times.length > 1 ? scoreBand(sp, 200, 1400) : 0,
          passed: times.length > 1 && sp < 400,
          weight: 2,
        },
        {
          id: "valid",
          label: "Valid laps",
          target: "no deletions",
          actual: `${laps.filter((l) => !l.valid).length} deleted`,
          score: laps.length ? clamp01(times.length / laps.length) : 0,
          passed: laps.length > 0 && times.length === laps.length,
          weight: 1,
        },
      ];
    },
  },
  {
    id: "sector",
    name: "Single-sector attack",
    laps: 6,
    goal: "Targeted pace",
    skill: "Isolating weakness",
    detail: "Push only your weakest sector, cruise the rest. Isolating the problem finds more time than pushing everywhere.",
    steps: [
      { title: "Identify the sector", detail: "The coach picks your weakest sector automatically — it is shown in the header above." },
      { title: "Cruise the other two", detail: "Drive the rest of the lap at 85%. You are not chasing lap time here." },
      { title: "Attack, then reset", detail: "Full commitment in the target sector only. Reset your head on the cool part of the lap." },
      { title: "Change one thing per lap", detail: "Brake point, line, or throttle timing — one variable at a time so you know what worked." },
      { title: "Debrief", detail: "Your best sector time during the drill must beat your reference sector time." },
    ],
    evaluate: ({ laps, weakestSector }) => {
      const valid = laps.filter((l) => l.valid);
      const secs = valid.map((l) => sectorOf(l, weakestSector)).filter((v) => v > 0);
      const best = secs.length ? Math.min(...secs) : 0;
      const first = secs[0] ?? 0;
      const gain = first && best ? first - best : 0;
      return [
        completion(laps, 6),
        {
          id: "improve",
          label: `Sector ${weakestSector} improvement`,
          target: "gain 0.15s or more",
          actual: gain ? `${gain > 0 ? "-" : "+"}${(Math.abs(gain) / 1000).toFixed(3)}s` : "—",
          score: scoreBand(-gain, -300, 100),
          passed: gain >= 150,
          weight: 2,
        },
        {
          id: "sector-consistency",
          label: `Sector ${weakestSector} spread`,
          target: "under 0.35s",
          actual: secs.length > 1 ? s(spread(secs)) : "—",
          score: secs.length > 1 ? scoreBand(spread(secs), 150, 1000) : 0,
          passed: secs.length > 1 && spread(secs) < 350,
          weight: 1,
        },
      ];
    },
  },
  {
    id: "brake-later",
    name: "One-metre-later ladder",
    laps: 4,
    goal: "Braking limit",
    skill: "Entry confidence",
    detail: "Move your brake point one metre later per lap in one corner until you miss the apex, then step back one.",
    steps: [
      { title: "Pick one heavy corner", detail: "A big stop at the end of a straight. Only that corner changes — everything else stays identical." },
      { title: "Set the baseline", detail: "Lap 1: brake at your normal marker and note how the apex felt." },
      { title: "Step later each lap", detail: "Laps 2-4: brake roughly one car length later each lap. Keep the same line." },
      { title: "Find the wall", detail: "The moment you miss the apex or lock a front, step back one marker — that is your real limit." },
      { title: "Debrief", detail: "Peak brake pressure should rise while your laps stay valid. Locking up scores zero." },
    ],
    evaluate: ({ laps, habits, referenceMs }) => {
      const valid = laps.filter((l) => l.valid);
      const times = valid.map((l) => l.timeMs);
      const best = times.length ? Math.min(...times) : 0;
      const gain = referenceMs && best ? referenceMs - best : 0;
      return [
        completion(laps, 4),
        {
          id: "peak-brake",
          label: "Peak brake pressure",
          target: "above 80%",
          actual: `${(habits.brakePeak * 100).toFixed(0)}%`,
          score: scoreBand(1 - habits.brakePeak, 0.1, 0.45),
          passed: habits.brakePeak > 0.8,
          weight: 2,
        },
        {
          id: "faster",
          label: "Lap time vs reference",
          target: "beat your reference lap",
          actual: referenceMs && best ? `${gain >= 0 ? "-" : "+"}${(Math.abs(gain) / 1000).toFixed(3)}s` : "—",
          score: scoreBand(-gain, 200, -600),
          passed: gain > 0,
          weight: 1,
        },
        {
          id: "no-deletions",
          label: "Laps kept clean",
          target: "no deletions",
          actual: `${laps.length - valid.length} deleted`,
          score: laps.length ? clamp01(valid.length / laps.length) : 0,
          passed: laps.length > 0 && valid.length === laps.length,
          weight: 1,
        },
      ];
    },
  },
  {
    id: "exit",
    name: "Exit-priority lap",
    laps: 5,
    goal: "Traction",
    skill: "Throttle application",
    detail: "Deliberately slow the entries and prioritise early throttle. Compare sector times — exits usually win.",
    steps: [
      { title: "Slow in, fast out", detail: "Brake five metres earlier than normal into every corner that leads onto a straight." },
      { title: "Get the wheel straight", detail: "Rotate the car early so you can unwind the steering and feed throttle sooner." },
      { title: "No coasting", detail: "Off the brake, straight onto the throttle. Any coasting phase is lost time." },
      { title: "Squeeze, do not stab", detail: "Progressive throttle keeps the rears alive and avoids wheelspin out of slow corners." },
      { title: "Debrief", detail: "Coasting should drop under 8% and full throttle should climb above 40% of the lap." },
    ],
    evaluate: ({ laps, habits }) => [
      completion(laps, 5),
      {
        id: "coast",
        label: "Coasting time",
        target: "under 8% of the lap",
        actual: `${habits.coastPct.toFixed(1)}%`,
        score: scoreBand(habits.coastPct, 4, 16),
        passed: habits.coastPct < 8,
        weight: 2,
      },
      {
        id: "throttle",
        label: "Full throttle",
        target: "above 40% of the lap",
        actual: `${habits.fullThrottlePct.toFixed(1)}%`,
        score: scoreBand(60 - habits.fullThrottlePct, 15, 45),
        passed: habits.fullThrottlePct > 40,
        weight: 2,
      },
      {
        id: "overlap",
        label: "Pedal overlap",
        target: "under 15% of braking",
        actual: `${habits.overlapPct.toFixed(1)}%`,
        score: scoreBand(habits.overlapPct, 5, 30),
        passed: habits.overlapPct < 15,
        weight: 1,
      },
    ],
  },
  {
    id: "clean",
    name: "Zero-deletion run",
    laps: 8,
    goal: "Discipline",
    skill: "Track limits",
    detail: "Every lap must be valid. Track limits discipline transfers straight into qualifying and race pace.",
    steps: [
      { title: "Know the offenders", detail: "Two or three corners cause almost every deletion. Name them before you start." },
      { title: "Aim one wheel in", detail: "Target the white line with the inside of the tyre, not the edge of the car." },
      { title: "Sacrifice the exit", detail: "A tenth lost keeping it on track beats a deleted lap every time." },
      { title: "Hold the pace", detail: "Stay within half a second of your reference — clean but slow does not count." },
      { title: "Debrief", detail: "Eight laps, zero deletions, pace within 0.5s of reference." },
    ],
    evaluate: ({ laps, referenceMs }) => {
      const valid = laps.filter((l) => l.valid);
      const times = valid.map((l) => l.timeMs);
      const best = times.length ? Math.min(...times) : 0;
      const off = referenceMs && best ? best - referenceMs : 0;
      return [
        completion(laps, 8),
        {
          id: "deletions",
          label: "Deleted laps",
          target: "zero",
          actual: `${laps.length - valid.length}`,
          score: laps.length ? clamp01(valid.length / laps.length) : 0,
          passed: laps.length > 0 && valid.length === laps.length,
          weight: 3,
        },
        {
          id: "pace",
          label: "Pace held",
          target: "within 0.5s of reference",
          actual: referenceMs && best ? `${off >= 0 ? "+" : "-"}${(Math.abs(off) / 1000).toFixed(3)}s` : "—",
          score: scoreBand(off, 0, 1200),
          passed: Boolean(referenceMs) && off < 500,
          weight: 1,
        },
      ];
    },
  },
];

export function getDrill(id: DrillId): Drill {
  return DRILLS.find((d) => d.id === id) ?? DRILLS[0]!;
}

export function scoreDrill(drill: Drill, ctx: DrillContext): DrillResult {
  const criteria = drill.evaluate(ctx);
  const totalWeight = criteria.reduce((a, c) => a + c.weight, 0) || 1;
  const score = Math.round((criteria.reduce((a, c) => a + c.score * c.weight, 0) / totalWeight) * 100);
  const grade = score >= 90 ? "A" : score >= 78 ? "B" : score >= 62 ? "C" : score >= 45 ? "D" : "E";
  const verdict =
    score >= 90
      ? "Nailed it. Move on to the next drill or raise the target time."
      : score >= 78
        ? "Solid run. One more repeat should lock this in."
        : score >= 62
          ? "Progress, but the target is not met yet. Repeat the drill."
          : score >= 45
            ? "Inconsistent. Slow down 5% and rebuild the references."
            : "Not there yet — run the steps again exactly as written.";
  return { criteria, score, grade, verdict };
}
