import type { Compound } from "./types";
import { getTrack } from "./tracks";

export interface SetupItem {
  label: string;
  value: string;
  /** 0..1 position on a slider, when the value is a range setting */
  scale?: number;
  hint: string;
}

export interface SetupGroup {
  title: string;
  items: SetupItem[];
}

export interface SetupRecommendation {
  profile: string;
  summary: string;
  groups: SetupGroup[];
  notes: string[];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function round(v: number, step = 1) {
  return Math.round(v / step) * step;
}

/**
 * Track-aware baseline car setup. Derived from lap length, corner count,
 * degradation and conditions — a sane starting point, not a magic sheet.
 */
export function recommendSetup(opts: {
  trackId: string;
  rainChance: number;
  trackTemp: number;
  compound: Compound;
  raceLaps: number;
}): SetupRecommendation {
  const track = getTrack(opts.trackId);
  const wet = opts.rainChance >= 55;
  // corner density: corners per km of lap
  const lapKm = track.lengthKm ?? 5;
  const density = clamp(track.corners / lapKm, 1.5, 4.5);
  // 0 = low downforce power track, 1 = high downforce twisty track
  const dfBias = clamp((density - 2) / 2 + (track.degradation - 1) * 0.15 + (wet ? 0.25 : 0), 0, 1);

  const frontWing = clamp(round(2 + dfBias * 40), 0, 50);
  const rearWing = clamp(round(4 + dfBias * 40), 0, 50);
  const onThrottleDiff = clamp(round(58 + (1 - dfBias) * 22 - (wet ? 12 : 0)), 50, 100);
  const offThrottleDiff = clamp(round(48 + dfBias * 18), 40, 100);
  const brakeBias = clamp(round(56 + (1 - dfBias) * 2 - (wet ? 2 : 0), 0.5), 50, 62);
  const brakePressure = wet ? 92 : 100;
  const front = clamp(round(6 - dfBias * 3), 1, 11);
  const rear = clamp(round(4 - dfBias * 2), 1, 11);
  const tempAdj = (opts.trackTemp - 34) * 0.12;
  const pFront = clamp(round(23.5 - tempAdj + (wet ? 0.4 : 0), 0.1), 22, 25.5);
  const pRear = clamp(round(21.8 - tempAdj + (wet ? 0.4 : 0), 0.1), 20, 24);
  const camberFront = clamp(round(-3.0 + dfBias * 0.4, 0.1), -3.5, -2.5);
  const camberRear = clamp(round(-1.9 + dfBias * 0.3, 0.1), -2.2, -1.5);
  const toeFront = 0.05;
  const toeRear = clamp(round(0.2 + track.degradation * 0.05, 0.01), 0.15, 0.4);
  const longRun = opts.raceLaps > track.laps * 0.45;

  const profile = wet
    ? "Wet / low-grip"
    : dfBias > 0.66
      ? "High downforce"
      : dfBias < 0.34
        ? "Low drag"
        : "Balanced";

  return {
    profile,
    summary: wet
      ? `Rain risk at ${track.short} is ${opts.rainChance}%. Setup leans on stability: more wing, softer diff, less brake pressure.`
      : `${track.corners} corners over ${lapKm.toFixed(2)} km puts ${track.short} in the ${profile.toLowerCase()} window${longRun ? " with a long race, so the setup protects the tyres" : ""}.`,
    groups: [
      {
        title: "Aerodynamics",
        items: [
          {
            label: "Front wing",
            value: String(frontWing),
            scale: frontWing / 50,
            hint: dfBias > 0.6 ? "Front end bite for slow corners" : "Trimmed for straight-line speed",
          },
          {
            label: "Rear wing",
            value: String(rearWing),
            scale: rearWing / 50,
            hint: longRun ? "Extra rear stability protects rear tyres" : "Balanced against top speed",
          },
        ],
      },
      {
        title: "Transmission",
        items: [
          {
            label: "Diff on-throttle",
            value: `${onThrottleDiff}%`,
            scale: (onThrottleDiff - 50) / 50,
            hint: wet ? "Lower to stop rear stepping out on exit" : "Higher for traction out of slow corners",
          },
          {
            label: "Diff off-throttle",
            value: `${offThrottleDiff}%`,
            scale: (offThrottleDiff - 40) / 60,
            hint: "Raise if the car snaps on lift, lower if it understeers on entry",
          },
        ],
      },
      {
        title: "Brakes",
        items: [
          { label: "Brake pressure", value: `${brakePressure}%`, scale: brakePressure / 100, hint: wet ? "Reduced to avoid locking" : "Full pressure, modulate with your foot" },
          { label: "Brake bias", value: `${brakeBias.toFixed(1)}%`, scale: (brakeBias - 50) / 12, hint: "Move rearward 0.5% at a time if the front locks" },
        ],
      },
      {
        title: "Suspension",
        items: [
          { label: "Front suspension", value: String(front), scale: front / 11, hint: "Softer front helps kerbs and low-speed rotation" },
          { label: "Rear suspension", value: String(rear), scale: rear / 11, hint: "Softer rear = traction, stiffer rear = response" },
          { label: "Front camber", value: `${camberFront.toFixed(1)}°`, hint: "More negative sharpens turn-in, costs braking grip" },
          { label: "Rear camber", value: `${camberRear.toFixed(1)}°`, hint: "Keep conservative for long stints" },
          { label: "Front toe", value: `${toeFront.toFixed(2)}°`, hint: "Minimum toe for straight-line speed" },
          { label: "Rear toe", value: `${toeRear.toFixed(2)}°`, hint: "More toe = stability, more rear tyre wear" },
        ],
      },
      {
        title: "Tyre pressures",
        items: [
          { label: "Front pressure", value: `${pFront.toFixed(1)} psi`, hint: `Tuned for ${opts.trackTemp.toFixed(0)}°C track temperature` },
          { label: "Rear pressure", value: `${pRear.toFixed(1)} psi`, hint: "Drop 0.2 psi per stint if the rears overheat" },
        ],
      },
    ],
    notes: [
      longRun
        ? "Race distance is long: run a click more rear wing than qualifying trim and keep pressures low."
        : "Short race: you can trim wing and run higher pressures for one-lap pace.",
      opts.compound === "soft"
        ? "Starting on softs — expect a front-limited first stint, so soften the front bar first if you struggle."
        : "Harder starting compound needs a lap or two of temperature; be gentle on the out lap.",
      wet
        ? "If it rains, add 2 clicks of wing, drop brake pressure and shift the bias 1% rearward."
        : "If the track rubbers in, expect understeer — take 1 click off the front wing later in the race.",
    ],
  };
}
