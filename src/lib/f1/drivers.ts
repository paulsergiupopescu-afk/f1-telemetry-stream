export interface DriverInfo {
  code: string;
  name: string;
  team: string;
  color: string;
  pace: number;
}

/** Grid used for the simulated field and the championship table. */
export const GRID: DriverInfo[] = [
  { code: "VER", name: "M. Verstappen", team: "Red Bull", color: "oklch(0.62 0.16 258)", pace: 0.0 },
  { code: "NOR", name: "L. Norris", team: "McLaren", color: "oklch(0.78 0.17 62)", pace: 0.06 },
  { code: "PIA", name: "O. Piastri", team: "McLaren", color: "oklch(0.78 0.17 62)", pace: 0.1 },
  { code: "LEC", name: "C. Leclerc", team: "Ferrari", color: "oklch(0.62 0.23 27)", pace: 0.12 },
  { code: "HAM", name: "L. Hamilton", team: "Ferrari", color: "oklch(0.62 0.23 27)", pace: 0.18 },
  { code: "RUS", name: "G. Russell", team: "Mercedes", color: "oklch(0.8 0.11 190)", pace: 0.2 },
  { code: "ANT", name: "K. Antonelli", team: "Mercedes", color: "oklch(0.8 0.11 190)", pace: 0.34 },
  { code: "ALO", name: "F. Alonso", team: "Aston Martin", color: "oklch(0.62 0.13 165)", pace: 0.42 },
  { code: "STR", name: "L. Stroll", team: "Aston Martin", color: "oklch(0.62 0.13 165)", pace: 0.58 },
  { code: "GAS", name: "P. Gasly", team: "Alpine", color: "oklch(0.68 0.16 330)", pace: 0.5 },
  { code: "COL", name: "F. Colapinto", team: "Alpine", color: "oklch(0.68 0.16 330)", pace: 0.64 },
  { code: "ALB", name: "A. Albon", team: "Williams", color: "oklch(0.66 0.16 240)", pace: 0.46 },
  { code: "SAI", name: "C. Sainz", team: "Williams", color: "oklch(0.66 0.16 240)", pace: 0.4 },
  { code: "TSU", name: "Y. Tsunoda", team: "RB", color: "oklch(0.6 0.14 275)", pace: 0.52 },
  { code: "HAD", name: "I. Hadjar", team: "RB", color: "oklch(0.6 0.14 275)", pace: 0.56 },
  { code: "HUL", name: "N. Hülkenberg", team: "Sauber", color: "oklch(0.72 0.2 148)", pace: 0.6 },
  { code: "BOR", name: "G. Bortoleto", team: "Sauber", color: "oklch(0.72 0.2 148)", pace: 0.7 },
  { code: "OCO", name: "E. Ocon", team: "Haas", color: "oklch(0.75 0.02 250)", pace: 0.62 },
  { code: "BEA", name: "O. Bearman", team: "Haas", color: "oklch(0.75 0.02 250)", pace: 0.66 },
];

export const PLAYER = {
  code: "YOU",
  name: "You",
  team: "Your Team",
  color: "oklch(0.598 0.235 26.5)",
};
