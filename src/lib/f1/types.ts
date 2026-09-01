export type Compound = "soft" | "medium" | "hard" | "inter" | "wet";

export type SessionType = "time-trial" | "practice" | "qualifying" | "race";

export type RaceControlPhase =
  | "GREEN"
  | "SC"
  | "VSC"
  | "RED_FLAG"
  | "FORMATION"
  | "RESTARTING";

export type ConnectionState = "SIM" | "LIVE" | "WAITING";

export type Corner = "FL" | "FR" | "RL" | "RR";

export interface TyreState {
  compound: Compound;
  age: number;
  wear: Record<Corner, number>;
  temp: Record<Corner, number>;
}

export interface DamageState {
  frontWingLeft: number;
  frontWingRight: number;
  rearWing: number;
  floor: number;
  diffuser: number;
}

export interface LapRecord {
  lap: number;
  timeMs: number;
  s1: number;
  s2: number;
  s3: number;
  compound: Compound;
  tyreAge: number;
  wear: number;
  fuel: number;
  position: number;
  valid: boolean;
  phase: RaceControlPhase;
}

export interface FieldEntry {
  position: number;
  code: string;
  name: string;
  team: string;
  teamColor: string;
  gapMs: number;
  compound: Compound;
  tyreAge: number;
  isPlayer: boolean;
  pitting: boolean;
  lastLapMs: number;
}

export interface TelemetryState {
  connection: ConnectionState;
  packetRate: number;
  trackId: string;
  sessionType: SessionType;
  phase: RaceControlPhase;

  lap: number;
  totalLaps: number;
  position: number;
  fieldSize: number;
  sessionTimeMs: number;

  speed: number;
  gear: number;
  rpm: number;
  throttle: number;
  brake: number;
  drs: boolean;
  steering: number;
  lapDistancePct: number;

  ers: number;
  ersMode: "CORNER" | "STRAIGHT" | "OVERTAKE" | "BOOST" | "NONE";
  ersDeployedLap: number;

  fuelKg: number;
  fuelDeltaLaps: number;

  tyres: TyreState;
  damage: DamageState;

  lastLapMs: number;
  bestLapMs: number;
  theoreticalBestMs: number;
  currentLapMs: number;
  sectors: [number, number, number];
  bestSectors: [number, number, number];
  deltaMs: number;
  microSectors: number[];

  gapAheadMs: number;
  gapBehindMs: number;

  weather: string;
  rainChance: number;
  trackTemp: number;
  airTemp: number;

  laps: LapRecord[];
  field: FieldEntry[];
  events: RaceEvent[];
}

export interface RaceEvent {
  lap: number;
  kind: "info" | "warn" | "danger" | "strategy";
  text: string;
  atMs: number;
}
