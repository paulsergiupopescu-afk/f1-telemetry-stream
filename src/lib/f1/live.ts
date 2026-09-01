import { getTrack, TRACKS } from "./tracks";
import type { Compound, LapRecord, TelemetryState } from "./types";

/** Raw packet shapes emitted by bridge/parse.mjs (and the Electron main process). */
export interface RawPacket {
  speed?: number;
  throttle?: number;
  brake?: number;
  steering?: number;
  gear?: number;
  rpm?: number;
  drs?: boolean;
  tyreSurfaceTemp?: number[];

  lastLapMs?: number;
  currentLapMs?: number;
  s1Ms?: number;
  s2Ms?: number;
  lapDistanceM?: number;
  lap?: number;
  position?: number;
  currentLapInvalid?: boolean;
  pitStatus?: number;

  fuelKg?: number;
  fuelRemainingLaps?: number;
  compoundId?: number;
  tyreAgeLaps?: number;
  ersStoreJ?: number;
  ersMode?: number;

  damage?: {
    frontWingLeft: number;
    frontWingRight: number;
    rearWing: number;
    floor: number;
    diffuser: number;
  };
  tyreWear?: number[];

  session?: {
    weatherId: number;
    trackTemp: number;
    airTemp: number;
    totalLaps: number;
    trackId: number;
  };
}

const COMPOUND_BY_ID: Record<number, Compound> = {
  16: "soft",
  17: "medium",
  18: "hard",
  7: "inter",
  8: "wet",
  15: "wet",
  19: "soft",
  20: "medium",
  21: "hard",
  22: "hard",
};

const WEATHER = ["Clear", "Light cloud", "Overcast", "Light rain", "Heavy rain", "Storm"];

/** F1 game track ids -> our track ids (only the ones we model). */
const TRACK_BY_GAME_ID: Record<number, string> = {
  0: "melbourne",
  2: "shanghai",
  3: "bahrain",
  4: "barcelona",
  5: "monaco",
  7: "montreal",
  9: "spielberg",
  10: "silverstone",
  12: "hungaroring",
  13: "spa",
  14: "monza",
  15: "singapore",
  17: "suzuka",
  19: "austin",
  20: "interlagos",
  22: "mexico",
  24: "baku",
  26: "zandvoort",
  27: "imola",
  29: "jeddah",
  30: "miami",
  31: "vegas",
  32: "losail",
};

const ERS_MODE = ["NONE", "CORNER", "STRAIGHT", "OVERTAKE", "BOOST"] as const;
const MAX_ERS_J = 4_000_000;

function pct(v: number | undefined, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Fold one raw game packet into the dashboard state. Pure — safe in a reducer.
 */
export function applyLivePacket(prev: TelemetryState, p: RawPacket): TelemetryState {
  const next: TelemetryState = { ...prev, connection: "LIVE" };

  if (p.session) {
    const mapped = TRACK_BY_GAME_ID[p.session.trackId];
    if (mapped && TRACKS.some((t) => t.id === mapped)) next.trackId = mapped;
    next.trackTemp = p.session.trackTemp;
    next.airTemp = p.session.airTemp;
    next.weather = WEATHER[p.session.weatherId] ?? prev.weather;
    if (p.session.totalLaps > 0) next.totalLaps = p.session.totalLaps;
  }

  if (typeof p.speed === "number") {
    next.speed = p.speed;
    next.throttle = pct(p.throttle, prev.throttle);
    next.brake = pct(p.brake, prev.brake);
    next.steering = pct(p.steering, prev.steering);
    next.gear = p.gear ?? prev.gear;
    next.rpm = p.rpm ?? prev.rpm;
    next.drs = p.drs ?? prev.drs;
    if (p.tyreSurfaceTemp?.length === 4) {
      next.tyres = {
        ...prev.tyres,
        temp: {
          RL: p.tyreSurfaceTemp[0]!,
          RR: p.tyreSurfaceTemp[1]!,
          FL: p.tyreSurfaceTemp[2]!,
          FR: p.tyreSurfaceTemp[3]!,
        },
      };
    }
  }

  if (typeof p.currentLapMs === "number") {
    const track = getTrack(next.trackId);
    const lengthM = track.lengthKm * 1000;
    next.currentLapMs = p.currentLapMs;
    next.lastLapMs = p.lastLapMs || prev.lastLapMs;
    next.lap = p.lap ?? prev.lap;
    next.position = p.position || prev.position;
    next.lapDistancePct = Math.max(0, Math.min(1, (p.lapDistanceM ?? 0) / lengthM));

    const s1 = p.s1Ms ?? 0;
    const s2 = p.s2Ms ?? 0;
    const s3 = s1 && s2 && p.currentLapMs > s1 + s2 ? p.currentLapMs - s1 - s2 : 0;
    next.sectors = [s1, s2, s3];

    // New lap detected: log the completed one.
    if (p.lap && p.lap !== prev.lap && prev.lastLapMs !== next.lastLapMs && next.lastLapMs > 0) {
      const record: LapRecord = {
        lap: prev.lap,
        timeMs: next.lastLapMs,
        s1: prev.sectors[0],
        s2: prev.sectors[1],
        s3: Math.max(0, next.lastLapMs - prev.sectors[0] - prev.sectors[1]),
        compound: next.tyres.compound,
        tyreAge: next.tyres.age,
        wear: Math.max(...Object.values(next.tyres.wear)),
        fuel: next.fuelKg,
        position: next.position,
        valid: !p.currentLapInvalid,
        phase: next.phase,
      };
      next.laps = [...prev.laps, record];
      if (record.valid) {
        next.bestLapMs = next.bestLapMs ? Math.min(next.bestLapMs, record.timeMs) : record.timeMs;
        next.bestSectors = [
          record.s1 && (!prev.bestSectors[0] || record.s1 < prev.bestSectors[0]) ? record.s1 : prev.bestSectors[0],
          record.s2 && (!prev.bestSectors[1] || record.s2 < prev.bestSectors[1]) ? record.s2 : prev.bestSectors[1],
          record.s3 && (!prev.bestSectors[2] || record.s3 < prev.bestSectors[2]) ? record.s3 : prev.bestSectors[2],
        ];
        next.theoreticalBestMs = next.bestSectors.every((v) => v > 0)
          ? next.bestSectors[0] + next.bestSectors[1] + next.bestSectors[2]
          : next.theoreticalBestMs;
      }
    }

    if (next.bestLapMs && next.currentLapMs && next.lapDistancePct > 0.02) {
      next.deltaMs = next.currentLapMs - next.bestLapMs * next.lapDistancePct;
    }
  }

  if (typeof p.fuelKg === "number") {
    next.fuelKg = p.fuelKg;
    next.fuelDeltaLaps = p.fuelRemainingLaps ?? prev.fuelDeltaLaps;
    next.ers = Math.max(0, Math.min(100, ((p.ersStoreJ ?? 0) / MAX_ERS_J) * 100));
    next.ersMode = ERS_MODE[p.ersMode ?? 1] ?? prev.ersMode;
    next.tyres = {
      ...next.tyres,
      compound: COMPOUND_BY_ID[p.compoundId ?? -1] ?? next.tyres.compound,
      age: p.tyreAgeLaps ?? next.tyres.age,
    };
  }

  if (p.damage) {
    next.damage = { ...p.damage };
  }
  if (p.tyreWear?.length === 4) {
    next.tyres = {
      ...next.tyres,
      wear: { RL: p.tyreWear[0]!, RR: p.tyreWear[1]!, FL: p.tyreWear[2]!, FR: p.tyreWear[3]! },
    };
  }

  return next;
}

export const BRIDGE_URL =
  (typeof window !== "undefined" && window.localStorage?.getItem("f1.bridgeUrl")) ||
  "http://127.0.0.1:20778";
