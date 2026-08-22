import type { AreaStats } from "@/lib/area-stats";
import { normalizeStateAbbr } from "@/lib/operating-defaults";

/** Rough state-level proxies when live lookup is unavailable. */
const STATE_AREA_PROFILE: Record<
  string,
  { crimeIndex: number; schoolRating: number; medianIncome: number }
> = {
  AL: { crimeIndex: 62, schoolRating: 6.2, medianIncome: 52000 },
  AK: { crimeIndex: 55, schoolRating: 6.8, medianIncome: 77000 },
  AZ: { crimeIndex: 58, schoolRating: 6.5, medianIncome: 65000 },
  AR: { crimeIndex: 60, schoolRating: 6.3, medianIncome: 52000 },
  CA: { crimeIndex: 52, schoolRating: 7.0, medianIncome: 84000 },
  CO: { crimeIndex: 48, schoolRating: 7.2, medianIncome: 80000 },
  CT: { crimeIndex: 42, schoolRating: 7.4, medianIncome: 83000 },
  DE: { crimeIndex: 50, schoolRating: 6.6, medianIncome: 72000 },
  FL: { crimeIndex: 56, schoolRating: 6.4, medianIncome: 63000 },
  GA: { crimeIndex: 54, schoolRating: 6.5, medianIncome: 65000 },
  HI: { crimeIndex: 45, schoolRating: 7.1, medianIncome: 88000 },
  ID: { crimeIndex: 46, schoolRating: 6.9, medianIncome: 68000 },
  IL: { crimeIndex: 53, schoolRating: 6.8, medianIncome: 72000 },
  IN: { crimeIndex: 49, schoolRating: 6.7, medianIncome: 62000 },
  IA: { crimeIndex: 40, schoolRating: 7.0, medianIncome: 65000 },
  KS: { crimeIndex: 44, schoolRating: 6.9, medianIncome: 64000 },
  KY: { crimeIndex: 51, schoolRating: 6.4, medianIncome: 58000 },
  LA: { crimeIndex: 64, schoolRating: 5.8, medianIncome: 52000 },
  ME: { crimeIndex: 38, schoolRating: 7.0, medianIncome: 68000 },
  MD: { crimeIndex: 47, schoolRating: 6.9, medianIncome: 87000 },
  MA: { crimeIndex: 40, schoolRating: 7.6, medianIncome: 90000 },
  MI: { crimeIndex: 50, schoolRating: 6.6, medianIncome: 63000 },
  MN: { crimeIndex: 42, schoolRating: 7.3, medianIncome: 78000 },
  MS: { crimeIndex: 61, schoolRating: 5.9, medianIncome: 49000 },
  MO: { crimeIndex: 55, schoolRating: 6.5, medianIncome: 61000 },
  MT: { crimeIndex: 43, schoolRating: 6.8, medianIncome: 65000 },
  NE: { crimeIndex: 41, schoolRating: 7.1, medianIncome: 67000 },
  NV: { crimeIndex: 57, schoolRating: 6.2, medianIncome: 64000 },
  NH: { crimeIndex: 35, schoolRating: 7.5, medianIncome: 82000 },
  NJ: { crimeIndex: 44, schoolRating: 7.2, medianIncome: 85000 },
  NM: { crimeIndex: 59, schoolRating: 6.0, medianIncome: 54000 },
  NY: { crimeIndex: 46, schoolRating: 7.1, medianIncome: 75000 },
  NC: { crimeIndex: 52, schoolRating: 6.6, medianIncome: 62000 },
  ND: { crimeIndex: 36, schoolRating: 7.0, medianIncome: 68000 },
  OH: { crimeIndex: 48, schoolRating: 6.7, medianIncome: 62000 },
  OK: { crimeIndex: 58, schoolRating: 6.1, medianIncome: 58000 },
  OR: { crimeIndex: 49, schoolRating: 6.9, medianIncome: 72000 },
  PA: { crimeIndex: 45, schoolRating: 6.8, medianIncome: 68000 },
  RI: { crimeIndex: 43, schoolRating: 6.9, medianIncome: 74000 },
  SC: { crimeIndex: 57, schoolRating: 6.3, medianIncome: 60000 },
  SD: { crimeIndex: 39, schoolRating: 7.0, medianIncome: 65000 },
  TN: { crimeIndex: 56, schoolRating: 6.2, medianIncome: 59000 },
  TX: { crimeIndex: 54, schoolRating: 6.5, medianIncome: 67000 },
  UT: { crimeIndex: 41, schoolRating: 7.1, medianIncome: 78000 },
  VT: { crimeIndex: 34, schoolRating: 7.4, medianIncome: 75000 },
  VA: { crimeIndex: 43, schoolRating: 7.0, medianIncome: 80000 },
  WA: { crimeIndex: 47, schoolRating: 7.2, medianIncome: 82000 },
  WV: { crimeIndex: 52, schoolRating: 6.2, medianIncome: 52000 },
  WI: { crimeIndex: 41, schoolRating: 7.1, medianIncome: 68000 },
  WY: { crimeIndex: 44, schoolRating: 6.7, medianIncome: 68000 },
  DC: { crimeIndex: 58, schoolRating: 6.0, medianIncome: 90000 },
};

const NATIONAL = { crimeIndex: 50, schoolRating: 6.5, medianIncome: 70000 };

function crimeGrade(index: number): string {
  if (index <= 35) return "A · Low crime";
  if (index <= 45) return "B · Below average";
  if (index <= 55) return "C · Average";
  if (index <= 65) return "D · Above average";
  return "F · High crime";
}

export function buildFallbackAreaStats(
  state?: string,
  zip?: string,
  city?: string
): AreaStats {
  const abbr = normalizeStateAbbr(state);
  const profile = abbr && STATE_AREA_PROFILE[abbr] ? STATE_AREA_PROFILE[abbr] : NATIONAL;
  const location = zip ? `ZIP ${zip}` : city || abbr || "this area";

  return {
    crime_grade: crimeGrade(profile.crimeIndex),
    crime_index: profile.crimeIndex,
    school_rating: profile.schoolRating,
    school_summary: `State average ~${profile.schoolRating.toFixed(1)}/10 for ${location}`,
    walk_score: null,
    median_income: profile.medianIncome,
    notes: `Estimated from ${abbr || "US"} statewide averages for ${location}. Run with API credits for ZIP-level web data.`,
    source: "fallback",
  };
}
