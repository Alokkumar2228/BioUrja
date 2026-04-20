// Shared calculator — runs on client (live preview) AND in edge function (persisted result).
export interface CalcInput {
  foodKg: number;
  gardenKg: number;
  paperKg: number;
}

export interface CalcResult {
  totalWaste: number;
  volatileSolids: number;
  biogasM3: number;
  methaneM3: number;
  kWh: number;
  lpgCylinders: number;
  rupeeSavings: number;
  co2Avoided: number;
}

export function calculate({ foodKg, gardenKg, paperKg }: CalcInput): CalcResult {
  const totalWaste = foodKg + gardenKg + paperKg;
  const volatileSolids = totalWaste * 0.75;
  const biogasM3 = volatileSolids * 0.65;
  const methaneM3 = biogasM3 * 0.6;
  const kWh = biogasM3 * 0.6;
  const lpgCylinders = kWh / 24.5;
  const rupeeSavings = lpgCylinders * 1884.5;
  const co2Avoided = lpgCylinders * 0.128;
  return { totalWaste, volatileSolids, biogasM3, methaneM3, kWh, lpgCylinders, rupeeSavings, co2Avoided };
}

export const formatINR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

export const fmt = (n: number, d = 2) => Number(n ?? 0).toFixed(d);
