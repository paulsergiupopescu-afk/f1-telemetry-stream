export interface TrackInfo {
  id: string;
  name: string;
  country: string;
  short: string;
  laps: number;
  lapTimeMs: number;
  pitLossMs: number;
  degradation: number;
  corners: number;
  lengthKm: number;
  drsZones: number;
  rainChance: number;
  seed: number;
}

export const TRACKS: TrackInfo[] = [
  { id: "bahrain", name: "Bahrain International Circuit", country: "Bahrain", short: "BHR", laps: 57, lapTimeMs: 93400, pitLossMs: 22500, degradation: 1.25, corners: 15, lengthKm: 5.412, drsZones: 3, rainChance: 2, seed: 11 },
  { id: "jeddah", name: "Jeddah Corniche Circuit", country: "Saudi Arabia", short: "JED", laps: 50, lapTimeMs: 91200, pitLossMs: 20800, degradation: 0.85, corners: 27, lengthKm: 6.174, drsZones: 3, rainChance: 1, seed: 23 },
  { id: "melbourne", name: "Albert Park Circuit", country: "Australia", short: "MEL", laps: 58, lapTimeMs: 81600, pitLossMs: 21600, degradation: 0.95, corners: 14, lengthKm: 5.278, drsZones: 4, rainChance: 18, seed: 31 },
  { id: "suzuka", name: "Suzuka International Racing Course", country: "Japan", short: "SUZ", laps: 53, lapTimeMs: 92800, pitLossMs: 22200, degradation: 1.35, corners: 18, lengthKm: 5.807, drsZones: 2, rainChance: 30, seed: 41 },
  { id: "shanghai", name: "Shanghai International Circuit", country: "China", short: "SHA", laps: 56, lapTimeMs: 94600, pitLossMs: 23100, degradation: 1.2, corners: 16, lengthKm: 5.451, drsZones: 2, rainChance: 22, seed: 53 },
  { id: "miami", name: "Miami International Autodrome", country: "USA", short: "MIA", laps: 57, lapTimeMs: 89800, pitLossMs: 20400, degradation: 1.15, corners: 19, lengthKm: 5.412, drsZones: 3, rainChance: 20, seed: 61 },
  { id: "imola", name: "Autodromo Enzo e Dino Ferrari", country: "Italy", short: "IMO", laps: 63, lapTimeMs: 78200, pitLossMs: 26200, degradation: 0.9, corners: 19, lengthKm: 4.909, drsZones: 2, rainChance: 15, seed: 73 },
  { id: "monaco", name: "Circuit de Monaco", country: "Monaco", short: "MON", laps: 78, lapTimeMs: 73600, pitLossMs: 19300, degradation: 0.55, corners: 19, lengthKm: 3.337, drsZones: 1, rainChance: 12, seed: 83 },
  { id: "montreal", name: "Circuit Gilles Villeneuve", country: "Canada", short: "CAN", laps: 70, lapTimeMs: 75400, pitLossMs: 18100, degradation: 0.8, corners: 14, lengthKm: 4.361, drsZones: 3, rainChance: 28, seed: 97 },
  { id: "barcelona", name: "Circuit de Barcelona-Catalunya", country: "Spain", short: "ESP", laps: 66, lapTimeMs: 76800, pitLossMs: 21200, degradation: 1.45, corners: 14, lengthKm: 4.657, drsZones: 2, rainChance: 8, seed: 103 },
  { id: "spielberg", name: "Red Bull Ring", country: "Austria", short: "AUT", laps: 71, lapTimeMs: 66200, pitLossMs: 20500, degradation: 1.1, corners: 10, lengthKm: 4.318, drsZones: 3, rainChance: 32, seed: 113 },
  { id: "silverstone", name: "Silverstone Circuit", country: "Great Britain", short: "GBR", laps: 52, lapTimeMs: 88300, pitLossMs: 20900, degradation: 1.3, corners: 18, lengthKm: 5.891, drsZones: 2, rainChance: 38, seed: 127 },
  { id: "spa", name: "Circuit de Spa-Francorchamps", country: "Belgium", short: "BEL", laps: 44, lapTimeMs: 106400, pitLossMs: 19100, degradation: 1.05, corners: 19, lengthKm: 7.004, drsZones: 2, rainChance: 42, seed: 139 },
  { id: "hungaroring", name: "Hungaroring", country: "Hungary", short: "HUN", laps: 70, lapTimeMs: 77500, pitLossMs: 19800, degradation: 1.2, corners: 14, lengthKm: 4.381, drsZones: 2, rainChance: 20, seed: 149 },
  { id: "zandvoort", name: "Circuit Zandvoort", country: "Netherlands", short: "NED", laps: 72, lapTimeMs: 71400, pitLossMs: 21700, degradation: 1.15, corners: 14, lengthKm: 4.259, drsZones: 2, rainChance: 30, seed: 157 },
  { id: "monza", name: "Autodromo Nazionale Monza", country: "Italy", short: "ITA", laps: 53, lapTimeMs: 82600, pitLossMs: 22400, degradation: 0.75, corners: 11, lengthKm: 5.793, drsZones: 2, rainChance: 14, seed: 167 },
  { id: "baku", name: "Baku City Circuit", country: "Azerbaijan", short: "AZE", laps: 51, lapTimeMs: 103200, pitLossMs: 18600, degradation: 0.7, corners: 20, lengthKm: 6.003, drsZones: 2, rainChance: 10, seed: 179 },
  { id: "singapore", name: "Marina Bay Street Circuit", country: "Singapore", short: "SIN", laps: 62, lapTimeMs: 91500, pitLossMs: 24600, degradation: 1.0, corners: 19, lengthKm: 4.94, drsZones: 3, rainChance: 40, seed: 191 },
  { id: "austin", name: "Circuit of the Americas", country: "USA", short: "USA", laps: 56, lapTimeMs: 95300, pitLossMs: 21400, degradation: 1.25, corners: 20, lengthKm: 5.513, drsZones: 2, rainChance: 16, seed: 197 },
  { id: "mexico", name: "Autódromo Hermanos Rodríguez", country: "Mexico", short: "MEX", laps: 71, lapTimeMs: 78100, pitLossMs: 22800, degradation: 0.95, corners: 17, lengthKm: 4.304, drsZones: 3, rainChance: 12, seed: 211 },
  { id: "interlagos", name: "Autódromo José Carlos Pace", country: "Brazil", short: "BRA", laps: 71, lapTimeMs: 71800, pitLossMs: 20100, degradation: 1.3, corners: 15, lengthKm: 4.309, drsZones: 2, rainChance: 45, seed: 223 },
  { id: "vegas", name: "Las Vegas Strip Circuit", country: "USA", short: "LV", laps: 50, lapTimeMs: 95200, pitLossMs: 19700, degradation: 0.65, corners: 17, lengthKm: 6.201, drsZones: 2, rainChance: 5, seed: 227 },
  { id: "losail", name: "Lusail International Circuit", country: "Qatar", short: "QAT", laps: 57, lapTimeMs: 83900, pitLossMs: 22900, degradation: 1.5, corners: 16, lengthKm: 5.419, drsZones: 1, rainChance: 2, seed: 233 },
  { id: "abudhabi", name: "Yas Marina Circuit", country: "Abu Dhabi", short: "ABU", laps: 58, lapTimeMs: 86700, pitLossMs: 21100, degradation: 0.9, corners: 16, lengthKm: 5.281, drsZones: 2, rainChance: 1, seed: 239 },
];

export const TRACK_MAP: Record<string, TrackInfo> = Object.fromEntries(
  TRACKS.map((t) => [t.id, t]),
);

export function getTrack(id: string): TrackInfo {
  return TRACK_MAP[id] ?? TRACKS[0];
}

/** Deterministic, seeded circuit outline used for the mini track maps. */
export function trackPath(track: TrackInfo, points = 96): string {
  let s = track.seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const harmonics = Array.from({ length: 5 }, (_, i) => ({
    k: i + 2,
    a: (0.26 / (i + 1.35)) * (0.5 + rnd()),
    p: rnd() * Math.PI * 2,
  }));
  const coords: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    let r = 1;
    for (const h of harmonics) r += h.a * Math.sin(h.k * t + h.p);
    coords.push([50 + Math.cos(t) * r * 36, 50 + Math.sin(t) * r * 26]);
  }
  return (
    coords
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ") + " Z"
  );
}

/** Position along the seeded outline, 0..1 of the lap. */
export function trackPoint(track: TrackInfo, pct: number): [number, number] {
  let s = track.seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const harmonics = Array.from({ length: 5 }, (_, i) => ({
    k: i + 2,
    a: (0.26 / (i + 1.35)) * (0.5 + rnd()),
    p: rnd() * Math.PI * 2,
  }));
  const t = pct * Math.PI * 2;
  let r = 1;
  for (const h of harmonics) r += h.a * Math.sin(h.k * t + h.p);
  return [50 + Math.cos(t) * r * 36, 50 + Math.sin(t) * r * 26];
}
