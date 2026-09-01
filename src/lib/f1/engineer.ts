import { cleanLaps, mean } from "./format";
import type { Corner, TelemetryState } from "./types";

export type Tone = "go" | "warn" | "danger" | "info" | "neutral";

export interface Call {
  call: string;
  detail: string;
  tone: Tone;
}

const CORNERS: Corner[] = ["FL", "FR", "RL", "RR"];

export function maxWear(s: TelemetryState): number {
  return Math.max(...CORNERS.map((c) => s.tyres.wear[c]));
}

export function worstCorner(s: TelemetryState): Corner {
  return CORNERS.reduce((a, b) => (s.tyres.wear[a] >= s.tyres.wear[b] ? a : b));
}

export function hottestCorner(s: TelemetryState): Corner {
  return CORNERS.reduce((a, b) => (s.tyres.temp[a] >= s.tyres.temp[b] ? a : b));
}

export function wingDamage(s: TelemetryState): number {
  return Math.max(s.damage.frontWingLeft, s.damage.frontWingRight);
}

/** Highest-priority command shown in the banner. */
export function primaryCall(s: TelemetryState, strategyCall: string): Call {
  if (s.phase === "RED_FLAG")
    return {
      call: "RED FLAG",
      detail: "Session stopped. Ignore tactical calls, return to the pit lane.",
      tone: "danger",
    };
  if (s.phase === "SC")
    return {
      call: "SAFETY CAR",
      detail: "Close the gap, no overtaking. Strategy window may open — stand by.",
      tone: "warn",
    };
  if (s.phase === "VSC")
    return {
      call: "VIRTUAL SAFETY CAR",
      detail: "Hold delta. Cheap stop available if the plan calls for it.",
      tone: "warn",
    };
  if (s.phase === "FORMATION")
    return {
      call: "FORMATION LAP",
      detail: "Build tyre and brake temperature, weave in the safe zones.",
      tone: "info",
    };

  if (wingDamage(s) > 45)
    return {
      call: "BOX — WING DAMAGE",
      detail: `Front wing at ${wingDamage(s).toFixed(0)}%. Braking stability compromised.`,
      tone: "danger",
    };

  if (strategyCall === "PIT NOW")
    return {
      call: "BOX THIS LAP",
      detail: "Strategy engine found an urgent stop. Commit to pit entry.",
      tone: "danger",
    };

  if (maxWear(s) > 82)
    return {
      call: "TYRE SAVE — CRITICAL",
      detail: `${worstCorner(s)} at ${s.tyres.wear[worstCorner(s)].toFixed(0)}% wear. Avoid kerbs and lock-ups.`,
      tone: "danger",
    };

  const inRange = s.gapAheadMs < 1000 && s.position > 1;
  const threatened = s.gapBehindMs < 900;

  if (inRange && s.ers > 42)
    return {
      call: "ATTACK NOW",
      detail: `Car ahead ${(s.gapAheadMs / 1000).toFixed(2)}s. Deploy on exit, complete the move before the braking zone.`,
      tone: "go",
    };
  if (inRange)
    return {
      call: "WAIT — BUILD BATTERY",
      detail: "In range but energy is short. Sit in the tow, protect the fronts, recharge.",
      tone: "info",
    };
  if (threatened)
    return {
      call: "DEFEND",
      detail: `Car behind ${(s.gapBehindMs / 1000).toFixed(2)}s. Protect the next key exit, spend ERS where the pass happens.`,
      tone: "warn",
    };
  if (s.position === 1)
    return {
      call: "CONTROL THE LEAD",
      detail: "Run normal pace, avoid sliding the tyres, rebuild energy.",
      tone: "go",
    };
  return {
    call: "HOLD POSITION",
    detail: "No decisive battle window. Keep repeatable references and wait for the opportunity.",
    tone: "neutral",
  };
}

export function drivingCall(s: TelemetryState): Call {
  return primaryCall(s, "");
}

export function ersCall(s: TelemetryState): Call {
  if (s.phase !== "GREEN")
    return { call: "HARVEST", detail: "Neutralised phase — recover energy, no deployment.", tone: "info" };
  if (s.ers < 12)
    return { call: "RECHARGE", detail: "Battery critical. Lift-and-coast into the heavy braking zones.", tone: "danger" };
  if (s.gapAheadMs < 900 && s.ers > 55)
    return { call: "OVERTAKE MODE", detail: "Deploy from corner exit through the DRS detection point.", tone: "go" };
  if (s.gapBehindMs < 700 && s.ers > 35)
    return { call: "HOLD RESERVE", detail: "Keep at least 30% for defence into the main straight.", tone: "warn" };
  if (s.ers > 88)
    return { call: "DEPLOY", detail: "Battery full — harvesting is being wasted. Use it on the next exit.", tone: "go" };
  return { call: "BALANCED", detail: "Deploy on exit, switch down before top speed. Keep the budget even.", tone: "neutral" };
}

export function tyreCall(s: TelemetryState): Call {
  const hot = hottestCorner(s);
  const worst = worstCorner(s);
  const spread = maxWear(s) - Math.min(...CORNERS.map((c) => s.tyres.wear[c]));
  if (maxWear(s) > 80)
    return { call: "TYRE SAVE", detail: `${worst} approaching the cliff. No kerbs, no wheelspin until the stop.`, tone: "danger" };
  if (s.tyres.temp[hot] > 118)
    return { call: `COOL ${hot}`, detail: "Progressive brake release, reduce steering scrub, short-shift out of slow corners.", tone: "warn" };
  if (spread > 14)
    return { call: `PROTECT ${worst}`, detail: `${worst} is wearing ${spread.toFixed(0)}% faster than the others. Reduce the input loading it.`, tone: "warn" };
  return { call: "NORMAL PACE", detail: "Tyres balanced and in window. No saving required.", tone: "go" };
}

export interface Diagnosis {
  headline: string;
  lossMs: number;
  cause: string;
  actions: string[];
  confident: boolean;
}

export function diagnose(s: TelemetryState): Diagnosis {
  const valid = s.laps.filter((l) => l.valid && l.phase === "GREEN").map((l) => l.timeMs);
  const clean = cleanLaps(valid);
  if (clean.length < 3) {
    return {
      headline: "LEARNING YOUR PACE",
      lossMs: 0,
      cause: "Not enough clean representative laps yet.",
      actions: ["Complete a few uninterrupted green-flag laps.", "Keep braking references repeatable."],
      confident: false,
    };
  }
  const reference = mean(clean.slice(0, -1));
  const last = clean[clean.length - 1] as number;
  const lossMs = last - reference;

  const causes: Array<{ weight: number; cause: string; actions: string[] }> = [];
  const wing = wingDamage(s);
  if (wing > 12)
    causes.push({
      weight: wing * 12,
      cause: `Front wing damage ${wing.toFixed(0)}% — reduced front grip on entry.`,
      actions: ["Brake 5m earlier into the slow corners.", "Expect understeer; open the wheel on entry."],
    });
  const hot = hottestCorner(s);
  if (s.tyres.temp[hot] > 116)
    causes.push({
      weight: (s.tyres.temp[hot] - 110) * 55,
      cause: `${hot} overheating at ${s.tyres.temp[hot].toFixed(0)}°C — the tyre is sliding.`,
      actions: [`Release the brake more progressively to settle ${hot}.`, "Delay throttle application until the wheel is straighter."],
    });
  if (s.ers < 20)
    causes.push({
      weight: (20 - s.ers) * 30,
      cause: `Low ERS (${s.ers.toFixed(0)}%) — acceleration and defence are compromised.`,
      actions: ["Harvest through the two heaviest braking zones.", "Skip deployment on the short straights this lap."],
    });
  const spread = maxWear(s) - Math.min(...CORNERS.map((c) => s.tyres.wear[c]));
  if (spread > 12)
    causes.push({
      weight: spread * 22,
      cause: `Tyre wear imbalance — ${worstCorner(s)} is the limiting corner.`,
      actions: [`Reduce the sustained load on ${worstCorner(s)}.`, "Use a smoother line through the long-radius corners."],
    });
  if (s.gapAheadMs < 1300 && s.gapAheadMs > 0)
    causes.push({
      weight: 380,
      cause: "Running in dirty air — front downforce and cooling are reduced.",
      actions: ["Drop back 0.8s through the fast section, then close on the straight.", "Protect the fronts until the passing opportunity."],
    });

  causes.sort((a, b) => b.weight - a.weight);
  const top = causes[0];

  if (lossMs < 120 && !top)
    return {
      headline: "PACE ON REFERENCE",
      lossMs,
      cause: "Last clean lap matched your recent level.",
      actions: ["Keep the same references.", "Bank consistency before pushing for more."],
      confident: true,
    };

  return {
    headline: lossMs > 0 ? `LOSING ${(lossMs / 1000).toFixed(3)}s VS RECENT PACE` : `GAINING ${(Math.abs(lossMs) / 1000).toFixed(3)}s VS RECENT PACE`,
    lossMs,
    cause: top ? top.cause : "No single dominant cause is visible in telemetry.",
    actions: top ? top.actions : ["Repeat the lap and compare the micro-sectors.", "Correct one problem at a time."],
    confident: Boolean(top),
  };
}

export interface PaceSummary {
  averageMs: number;
  lastMs: number;
  vsAverageMs: number;
  trend: "IMPROVING" | "STABLE" | "FADING" | "LEARNING";
  cleanCount: number;
}

export function paceSummary(s: TelemetryState): PaceSummary {
  const valid = s.laps.filter((l) => l.valid).map((l) => l.timeMs);
  const clean = cleanLaps(valid);
  if (clean.length < 2)
    return { averageMs: 0, lastMs: s.lastLapMs, vsAverageMs: 0, trend: "LEARNING", cleanCount: clean.length };
  const averageMs = mean(clean);
  const lastMs = clean[clean.length - 1] as number;
  const firstHalf = mean(clean.slice(0, Math.ceil(clean.length / 2)));
  const secondHalf = mean(clean.slice(Math.ceil(clean.length / 2)));
  const drift = secondHalf - firstHalf;
  const trend = clean.length < 4 ? "LEARNING" : drift < -120 ? "IMPROVING" : drift > 160 ? "FADING" : "STABLE";
  return { averageMs, lastMs, vsAverageMs: lastMs - averageMs, trend, cleanCount: clean.length };
}
