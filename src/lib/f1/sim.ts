import { GRID } from "./drivers";
import { getTrack } from "./tracks";
import type {
  Compound,
  Corner,
  FieldEntry,
  LapRecord,
  RaceControlPhase,
  RaceEvent,
  SessionType,
  TelemetryState,
} from "./types";

const CORNERS: Corner[] = ["FL", "FR", "RL", "RR"];

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface SimOptions {
  trackId: string;
  sessionType: SessionType;
  compound: Compound;
  totalLaps: number;
  rainChance: number;
}

export function defaultSimOptions(): SimOptions {
  return { trackId: "silverstone", sessionType: "race", compound: "medium", totalLaps: 24, rainChance: 20 };
}

export function createInitialState(opts: SimOptions): TelemetryState {
  const track = getTrack(opts.trackId);
  const rand = rng(track.seed * 7 + 13);
  const fieldSize = GRID.length + 1;
  const playerPos = 6;

  const field: FieldEntry[] = [];
  let gap = 0;
  const ordered = [...GRID].sort((a, b) => a.pace - b.pace);
  for (let i = 0; i < fieldSize; i++) {
    const isPlayer = i + 1 === playerPos;
    if (isPlayer) {
      field.push({
        position: i + 1,
        code: "YOU",
        name: "You",
        team: "Your Team",
        teamColor: "var(--primary)",
        gapMs: gap,
        compound: opts.compound,
        tyreAge: 0,
        isPlayer: true,
        pitting: false,
        lastLapMs: track.lapTimeMs,
      });
    } else {
      const d = ordered[i - (i + 1 > playerPos ? 1 : 0)] ?? ordered[0]!;
      field.push({
        position: i + 1,
        code: d.code,
        name: d.name,
        team: d.team,
        teamColor: d.color,
        gapMs: gap,
        compound: (["soft", "medium", "hard"] as Compound[])[Math.floor(rand() * 3)] ?? "medium",
        tyreAge: 0,
        isPlayer: false,
        pitting: false,
        lastLapMs: track.lapTimeMs + d.pace * 1000,
      });
    }
    gap += 700 + rand() * 1600;
  }

  return {
    connection: "SIM",
    packetRate: 60,
    trackId: opts.trackId,
    sessionType: opts.sessionType,
    phase: "GREEN",
    lap: 1,
    totalLaps: opts.sessionType === "race" ? opts.totalLaps : 0,
    position: playerPos,
    fieldSize,
    sessionTimeMs: 0,
    speed: 0,
    gear: 1,
    rpm: 4000,
    throttle: 0,
    brake: 0,
    drs: false,
    steering: 0,
    lapDistancePct: 0,
    ers: 92,
    ersMode: "CORNER",
    ersDeployedLap: 0,
    fuelKg: opts.sessionType === "race" ? opts.totalLaps * 1.72 + 1.5 : 30,
    fuelDeltaLaps: 0.4,
    tyres: {
      compound: opts.compound,
      age: 0,
      wear: { FL: 1, FR: 1.4, RL: 0.8, RR: 1.1 },
      temp: { FL: 88, FR: 91, RL: 86, RR: 89 },
    },
    damage: { frontWingLeft: 0, frontWingRight: 0, rearWing: 0, floor: 0, diffuser: 0 },
    lastLapMs: 0,
    bestLapMs: 0,
    theoreticalBestMs: 0,
    currentLapMs: 0,
    sectors: [0, 0, 0],
    bestSectors: [0, 0, 0],
    deltaMs: 0,
    microSectors: Array.from({ length: 20 }, () => 0),
    gapAheadMs: 1200,
    gapBehindMs: 1500,
    weather: "Clear",
    rainChance: opts.rainChance,
    trackTemp: 34,
    airTemp: 23,
    laps: [],
    field,
    events: [{ lap: 1, kind: "info", text: "Session started — telemetry stream connected.", atMs: 0 }],
  };
}

/** Speed / throttle / brake profile around the seeded lap. */
function drivePhase(pct: number, corners: number, rand: () => number) {
  const wave = Math.sin(pct * Math.PI * 2 * (corners / 3.2));
  const straightness = (wave + 1) / 2;
  const speed = 82 + straightness * 240 + rand() * 6;
  const braking = wave < -0.72;
  const throttle = braking ? 0 : Math.min(100, 30 + straightness * 78);
  const brake = braking ? Math.min(100, (Math.abs(wave) - 0.72) * 340) : 0;
  const gear = Math.max(1, Math.min(8, Math.round(speed / 42)));
  return { speed, throttle, brake, gear, rpm: 5200 + (speed % 42) * 140 + gear * 260, straightness };
}

export function step(prev: TelemetryState, dtMs: number): TelemetryState {
  const s: TelemetryState = {
    ...prev,
    tyres: { ...prev.tyres, wear: { ...prev.tyres.wear }, temp: { ...prev.tyres.temp } },
    damage: { ...prev.damage },
    sectors: [...prev.sectors] as [number, number, number],
    bestSectors: [...prev.bestSectors] as [number, number, number],
    microSectors: [...prev.microSectors],
    field: prev.field.map((f) => ({ ...f })),
    laps: prev.laps,
    events: prev.events,
  };
  const track = getTrack(s.trackId);
  const rand = rng(Math.floor(s.sessionTimeMs) + track.seed);

  const phaseFactor = s.phase === "SC" ? 0.55 : s.phase === "VSC" ? 0.62 : s.phase === "RED_FLAG" ? 0 : 1;
  s.sessionTimeMs += dtMs;
  if (phaseFactor === 0) return s;

  const wearPenalty = 1 + Math.max(0, avgWear(s) - 30) * 0.0035 * track.degradation;
  const lapMs = track.lapTimeMs * wearPenalty;
  const advance = (dtMs / lapMs) * phaseFactor;
  s.currentLapMs += dtMs;

  let pct = s.lapDistancePct + advance;

  const dp = drivePhase(pct, track.corners, rand);
  s.speed = dp.speed * phaseFactor;
  s.throttle = dp.throttle * phaseFactor;
  s.brake = dp.brake;
  s.gear = dp.gear;
  s.rpm = dp.rpm * phaseFactor;
  s.steering = Math.sin(pct * Math.PI * 2 * (track.corners / 3.2) + 1.1);
  s.drs = dp.straightness > 0.86 && s.gapAheadMs < 1000 && s.phase === "GREEN";

  // ERS
  if (s.brake > 30) s.ers = Math.min(100, s.ers + dtMs * 0.0075);
  else if (s.throttle > 70 && s.speed > 140) s.ers = Math.max(0, s.ers - dtMs * 0.0048);
  s.ersMode = s.brake > 30 ? "CORNER" : s.drs ? "OVERTAKE" : s.throttle > 70 ? "STRAIGHT" : "CORNER";

  // Tyres
  const load: Record<Corner, number> = {
    FL: 1 + Math.max(0, s.steering) * 0.9,
    FR: 1 + Math.max(0, -s.steering) * 0.9,
    RL: 0.85 + (s.throttle / 100) * 0.5 + Math.max(0, s.steering) * 0.4,
    RR: 0.9 + (s.throttle / 100) * 0.55 + Math.max(0, -s.steering) * 0.4,
  };
  for (const c of CORNERS) {
    s.tyres.wear[c] = Math.min(
      100,
      s.tyres.wear[c] + (dtMs / lapMs) * compoundDeg(s.tyres.compound) * track.degradation * load[c],
    );
    const target = 84 + load[c] * 22 + s.speed * 0.03 + (s.brake / 100) * 16;
    s.tyres.temp[c] += (target - s.tyres.temp[c]) * Math.min(1, dtMs / 2600);
  }

  // Fuel
  s.fuelKg = Math.max(0, s.fuelKg - (dtMs / lapMs) * 1.72 * (0.7 + s.throttle / 240));
  s.fuelDeltaLaps = s.totalLaps ? s.fuelKg / 1.72 - (s.totalLaps - s.lap + (1 - pct)) : 0;

  // Micro-sector delta
  const seg = Math.min(19, Math.floor(pct * 20));
  const segDelta = (rand() - 0.48) * 90 + Math.max(0, avgWear(s) - 45) * 1.4;
  s.microSectors[seg] = s.microSectors[seg]! * 0.75 + segDelta * 0.25;
  s.deltaMs = s.microSectors.slice(0, seg + 1).reduce((a, b) => a + b, 0);

  // Gaps drift
  const gapDrift = (rand() - 0.5) * dtMs * 0.9;
  s.gapAheadMs = Math.max(90, s.gapAheadMs + gapDrift);
  s.gapBehindMs = Math.max(90, s.gapBehindMs - gapDrift * 0.8);

  // Sectors
  if (pct < 1 / 3) s.sectors[0] = s.currentLapMs;
  else if (pct < 2 / 3) s.sectors[1] = s.currentLapMs - s.sectors[0]!;
  else s.sectors[2] = s.currentLapMs - s.sectors[0]! - s.sectors[1]!;

  // Weather / race control drift
  if (rand() < 0.0006 && s.phase === "GREEN" && s.lap > 3) {
    const roll = rand();
    if (roll < 0.35) s.phase = "VSC";
    else if (roll < 0.6) s.phase = "SC";
    if (s.phase !== "GREEN")
      s.events = [
        { lap: s.lap, kind: "warn", text: `${s.phase === "SC" ? "Safety car" : "Virtual safety car"} deployed.`, atMs: s.sessionTimeMs },
        ...s.events,
      ].slice(0, 60);
  } else if (s.phase === "SC" || s.phase === "VSC") {
    if (rand() < 0.0025) {
      s.phase = "GREEN";
      s.events = [{ lap: s.lap, kind: "info", text: "Track is green — racing resumes.", atMs: s.sessionTimeMs }, ...s.events].slice(0, 60);
    }
  }

  // Occasional damage
  if (rand() < 0.00035 && s.phase === "GREEN") {
    s.damage.frontWingLeft = Math.min(100, s.damage.frontWingLeft + 8 + rand() * 22);
    s.events = [{ lap: s.lap, kind: "danger", text: "Front wing contact — damage detected.", atMs: s.sessionTimeMs }, ...s.events].slice(0, 60);
  }

  // Lap crossing
  if (pct >= 1) {
    pct -= 1;
    const timeMs = s.currentLapMs;
    const valid = s.phase === "GREEN" && timeMs > track.lapTimeMs * 0.7;
    const record: LapRecord = {
      lap: s.lap,
      timeMs,
      s1: s.sectors[0]!,
      s2: s.sectors[1]!,
      s3: Math.max(0, timeMs - s.sectors[0]! - s.sectors[1]!),
      compound: s.tyres.compound,
      tyreAge: s.tyres.age,
      wear: avgWear(s),
      fuel: s.fuelKg,
      position: s.position,
      valid,
      phase: s.phase,
    };
    s.laps = [...s.laps, record];
    s.lastLapMs = timeMs;
    if (valid && (!s.bestLapMs || timeMs < s.bestLapMs)) s.bestLapMs = timeMs;
    for (let i = 0; i < 3; i++) {
      const sec = [record.s1, record.s2, record.s3][i]!;
      if (valid && sec > 0 && (!s.bestSectors[i] || sec < s.bestSectors[i]!)) s.bestSectors[i] = sec;
    }
    s.theoreticalBestMs = s.bestSectors.every((x) => x > 0) ? s.bestSectors.reduce((a, b) => a + b, 0) : 0;
    s.currentLapMs = 0;
    s.sectors = [0, 0, 0];
    s.microSectors = s.microSectors.map((m) => m * 0.4);
    s.tyres.age += 1;
    s.lap += 1;

    // Field movement
    s.field = s.field.map((f) => ({ ...f, tyreAge: f.tyreAge + 1 }));
    if (rand() < 0.22 && s.position > 1) {
      s.position -= 1;
      s.events = [{ lap: s.lap, kind: "info", text: `Position gained — now P${s.position}.`, atMs: s.sessionTimeMs }, ...s.events].slice(0, 60);
    } else if (rand() < 0.12 && s.position < s.fieldSize) {
      s.position += 1;
    }
    s.field = s.field.map((f) => (f.isPlayer ? { ...f, position: s.position, compound: s.tyres.compound, tyreAge: s.tyres.age, lastLapMs: timeMs } : f));
  }

  s.lapDistancePct = pct;
  return s;
}

export function pitStop(prev: TelemetryState, compound: Compound): TelemetryState {
  const track = getTrack(prev.trackId);
  const event: RaceEvent = {
    lap: prev.lap,
    kind: "strategy",
    text: `Pit stop completed — fitted ${compound.toUpperCase()} (${(track.pitLossMs / 1000).toFixed(1)}s pit loss).`,
    atMs: prev.sessionTimeMs,
  };
  return {
    ...prev,
    tyres: {
      compound,
      age: 0,
      wear: { FL: 1, FR: 1.2, RL: 0.9, RR: 1.1 },
      temp: { FL: 82, FR: 84, RL: 80, RR: 83 },
    },
    position: Math.min(prev.fieldSize, prev.position + (prev.phase === "GREEN" ? 3 : 1)),
    gapAheadMs: 1800,
    gapBehindMs: 900,
    events: [event, ...prev.events].slice(0, 60),
    field: prev.field.map((f) => (f.isPlayer ? { ...f, compound, tyreAge: 0 } : f)),
  };
}

export function setPhase(prev: TelemetryState, phase: RaceControlPhase): TelemetryState {
  return {
    ...prev,
    phase,
    events: [{ lap: prev.lap, kind: phase === "GREEN" ? "info" : "warn", text: `Race control: ${phase.replace("_", " ")}.`, atMs: prev.sessionTimeMs }, ...prev.events].slice(0, 60),
  };
}

function compoundDeg(c: Compound) {
  return { soft: 2.9, medium: 2.0, hard: 1.4, inter: 2.3, wet: 2.0 }[c];
}

export function avgWear(s: TelemetryState) {
  return CORNERS.reduce((a, c) => a + s.tyres.wear[c], 0) / 4;
}
