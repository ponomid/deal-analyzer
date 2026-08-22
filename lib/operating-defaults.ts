/** Effective property tax rate (% of value), annual landlord insurance ($), rental maint/vacancy (% of rent). */
export type StateOperatingProfile = {
  taxRatePct: number;
  insuranceAnnual: number;
  maintenancePct: number;
  vacancyPct: number;
};

const NATIONAL_FALLBACK: StateOperatingProfile = {
  taxRatePct: 1.1,
  insuranceAnnual: 1400,
  maintenancePct: 5,
  vacancyPct: 5,
};

/** ACS / Tax Foundation–style effective rates and rental-market reserve norms by state. */
export const STATE_OPERATING: Record<string, StateOperatingProfile> = {
  AL: { taxRatePct: 0.41, insuranceAnnual: 1300, maintenancePct: 5, vacancyPct: 6 },
  AK: { taxRatePct: 1.19, insuranceAnnual: 1100, maintenancePct: 6, vacancyPct: 7 },
  AZ: { taxRatePct: 0.62, insuranceAnnual: 1500, maintenancePct: 5, vacancyPct: 5 },
  AR: { taxRatePct: 0.62, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 6 },
  CA: { taxRatePct: 0.75, insuranceAnnual: 1600, maintenancePct: 5, vacancyPct: 4 },
  CO: { taxRatePct: 0.55, insuranceAnnual: 1450, maintenancePct: 5, vacancyPct: 4 },
  CT: { taxRatePct: 2.15, insuranceAnnual: 1550, maintenancePct: 5, vacancyPct: 5 },
  DE: { taxRatePct: 0.58, insuranceAnnual: 1200, maintenancePct: 5, vacancyPct: 5 },
  FL: { taxRatePct: 0.89, insuranceAnnual: 2400, maintenancePct: 5, vacancyPct: 5 },
  GA: { taxRatePct: 0.87, insuranceAnnual: 1400, maintenancePct: 5, vacancyPct: 5 },
  HI: { taxRatePct: 0.28, insuranceAnnual: 1100, maintenancePct: 5, vacancyPct: 4 },
  ID: { taxRatePct: 0.69, insuranceAnnual: 1150, maintenancePct: 5, vacancyPct: 5 },
  IL: { taxRatePct: 2.23, insuranceAnnual: 1350, maintenancePct: 5, vacancyPct: 6 },
  IN: { taxRatePct: 0.85, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 5 },
  IA: { taxRatePct: 1.57, insuranceAnnual: 1200, maintenancePct: 5, vacancyPct: 6 },
  KS: { taxRatePct: 1.41, insuranceAnnual: 1300, maintenancePct: 5, vacancyPct: 6 },
  KY: { taxRatePct: 0.86, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 6 },
  LA: { taxRatePct: 0.55, insuranceAnnual: 1800, maintenancePct: 5, vacancyPct: 6 },
  ME: { taxRatePct: 1.36, insuranceAnnual: 1150, maintenancePct: 5, vacancyPct: 5 },
  MD: { taxRatePct: 1.09, insuranceAnnual: 1350, maintenancePct: 5, vacancyPct: 5 },
  MA: { taxRatePct: 1.23, insuranceAnnual: 1500, maintenancePct: 5, vacancyPct: 4 },
  MI: { taxRatePct: 1.54, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 6 },
  MN: { taxRatePct: 1.12, insuranceAnnual: 1350, maintenancePct: 5, vacancyPct: 5 },
  MS: { taxRatePct: 0.81, insuranceAnnual: 1400, maintenancePct: 5, vacancyPct: 6 },
  MO: { taxRatePct: 0.97, insuranceAnnual: 1300, maintenancePct: 5, vacancyPct: 5 },
  MT: { taxRatePct: 0.84, insuranceAnnual: 1200, maintenancePct: 5, vacancyPct: 6 },
  NE: { taxRatePct: 1.73, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 6 },
  NV: { taxRatePct: 0.60, insuranceAnnual: 1350, maintenancePct: 5, vacancyPct: 5 },
  NH: { taxRatePct: 2.18, insuranceAnnual: 1200, maintenancePct: 5, vacancyPct: 5 },
  NJ: { taxRatePct: 2.47, insuranceAnnual: 1600, maintenancePct: 5, vacancyPct: 5 },
  NM: { taxRatePct: 0.80, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 6 },
  NY: { taxRatePct: 1.72, insuranceAnnual: 1500, maintenancePct: 5, vacancyPct: 5 },
  NC: { taxRatePct: 0.84, insuranceAnnual: 1350, maintenancePct: 5, vacancyPct: 5 },
  ND: { taxRatePct: 1.01, insuranceAnnual: 1150, maintenancePct: 5, vacancyPct: 6 },
  OH: { taxRatePct: 1.56, insuranceAnnual: 1200, maintenancePct: 5, vacancyPct: 6 },
  OK: { taxRatePct: 0.90, insuranceAnnual: 1500, maintenancePct: 5, vacancyPct: 6 },
  OR: { taxRatePct: 0.90, insuranceAnnual: 1300, maintenancePct: 5, vacancyPct: 5 },
  PA: { taxRatePct: 1.49, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 5 },
  RI: { taxRatePct: 1.63, insuranceAnnual: 1400, maintenancePct: 5, vacancyPct: 5 },
  SC: { taxRatePct: 0.57, insuranceAnnual: 1450, maintenancePct: 5, vacancyPct: 5 },
  SD: { taxRatePct: 1.31, insuranceAnnual: 1150, maintenancePct: 5, vacancyPct: 6 },
  TN: { taxRatePct: 0.66, insuranceAnnual: 1300, maintenancePct: 5, vacancyPct: 5 },
  TX: { taxRatePct: 1.80, insuranceAnnual: 1800, maintenancePct: 5, vacancyPct: 5 },
  UT: { taxRatePct: 0.57, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 5 },
  VT: { taxRatePct: 1.90, insuranceAnnual: 1200, maintenancePct: 5, vacancyPct: 5 },
  VA: { taxRatePct: 0.82, insuranceAnnual: 1300, maintenancePct: 5, vacancyPct: 5 },
  WA: { taxRatePct: 0.98, insuranceAnnual: 1350, maintenancePct: 5, vacancyPct: 4 },
  WV: { taxRatePct: 0.58, insuranceAnnual: 1200, maintenancePct: 5, vacancyPct: 6 },
  WI: { taxRatePct: 1.76, insuranceAnnual: 1250, maintenancePct: 5, vacancyPct: 5 },
  WY: { taxRatePct: 0.61, insuranceAnnual: 1100, maintenancePct: 5, vacancyPct: 6 },
  DC: { taxRatePct: 0.57, insuranceAnnual: 1400, maintenancePct: 5, vacancyPct: 5 },
};

const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

export function normalizeStateAbbr(state?: string): string | null {
  if (!state) return null;
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_NAME_TO_ABBR[trimmed.toLowerCase()] ?? null;
}

export function getStateOperatingProfile(state?: string): StateOperatingProfile {
  const abbr = normalizeStateAbbr(state);
  if (abbr && STATE_OPERATING[abbr]) return STATE_OPERATING[abbr];
  return NATIONAL_FALLBACK;
}

export function buildFallbackOperatingEstimates(
  purchasePrice: number,
  state?: string,
  zip?: string
): {
  property_tax_annual: number;
  insurance_annual: number;
  hoa_monthly: number;
  maintenance_pct: number;
  vacancy_pct: number;
  management_pct: number;
  notes: string;
  source: "fallback";
} {
  const profile = getStateOperatingProfile(state);
  const taxAnnual = Math.round(purchasePrice * (profile.taxRatePct / 100));
  const zipNote = zip ? `ZIP ${zip}` : "this area";
  const stateNote = normalizeStateAbbr(state) || state || "US average";

  return {
    property_tax_annual: taxAnnual,
    insurance_annual: profile.insuranceAnnual,
    hoa_monthly: 0,
    maintenance_pct: profile.maintenancePct,
    vacancy_pct: profile.vacancyPct,
    management_pct: 0,
    notes: `Estimated from ${stateNote} market averages for ${zipNote} (${profile.taxRatePct}% effective tax rate on purchase price).`,
    source: "fallback",
  };
}
