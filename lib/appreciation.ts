import { normalizeStateAbbr } from "@/lib/operating-defaults";

export type AppreciationEstimate = {
  /** Trailing 1-year % change in FHFA state HPI (same quarter). */
  rateYoY: number;
  /** Annualized % change over ~5 years from FHFA state HPI. */
  rate5yrAnnualized: number | null;
  /** Rate used for forward projections (trailing YoY). */
  rateUsed: number;
  geography: string;
  asOf: string;
  source: "fhfa_state" | "fallback";
  notes: string;
  indexLatest: number | null;
  indexPriorYear: number | null;
};

export type AppreciationProjection = {
  purchasePrice: number;
  projectedValue1yr: number;
  projectedValue5yr: number;
  gain1yr: number;
  gain5yr: number;
  /** Rough year-1 total: cash flow + appreciation gain (not including loan paydown). */
  totalReturn1yr: number;
  totalReturn1yrPct: number;
};

type HpiPoint = { year: number; quarter: number; index: number };

const FHFA_STATE_HPI_URL =
  "https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_at_state.txt";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/** Conservative national fallback when FHFA fetch fails. */
const FALLBACK_RATE_YOY = 3;

let cachedStateFile: { fetchedAt: number; text: string } | null = null;
const CACHE_MS = 24 * 60 * 60 * 1000;

async function loadStateHpiFile(): Promise<string> {
  if (cachedStateFile && Date.now() - cachedStateFile.fetchedAt < CACHE_MS) {
    return cachedStateFile.text;
  }

  const response = await fetch(FHFA_STATE_HPI_URL, {
    headers: { Accept: "text/plain" },
    next: { revalidate: 86400 },
  });
  if (!response.ok) {
    throw new Error(`FHFA HPI download failed (${response.status})`);
  }
  const text = await response.text();
  cachedStateFile = { fetchedAt: Date.now(), text };
  return text;
}

function parseStateSeries(text: string, stateAbbr: string): HpiPoint[] {
  const points: HpiPoint[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4 || parts[0] !== stateAbbr) continue;
    const year = Number(parts[1]);
    const quarter = Number(parts[2]);
    const index = Number(parts[3]);
    if (!Number.isFinite(year) || !Number.isFinite(quarter) || !Number.isFinite(index)) continue;
    if (index <= 0) continue;
    points.push({ year, quarter, index });
  }
  points.sort((a, b) => a.year - b.year || a.quarter - b.quarter);
  return points;
}

function findSameQuarter(points: HpiPoint[], year: number, quarter: number): HpiPoint | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].year === year && points[i].quarter === quarter) return points[i];
  }
  return null;
}

export function buildFallbackAppreciation(state?: string): AppreciationEstimate {
  const abbr = normalizeStateAbbr(state);
  const geography = abbr ? STATE_NAMES[abbr] || abbr : "United States";
  return {
    rateYoY: FALLBACK_RATE_YOY,
    rate5yrAnnualized: FALLBACK_RATE_YOY,
    rateUsed: FALLBACK_RATE_YOY,
    geography,
    asOf: "n/a",
    source: "fallback",
    notes: `Using a ${FALLBACK_RATE_YOY}% placeholder — FHFA House Price Index was unavailable.`,
    indexLatest: null,
    indexPriorYear: null,
  };
}

export async function fetchAppreciationFromFhfa(state?: string): Promise<AppreciationEstimate> {
  const abbr = normalizeStateAbbr(state);
  if (!abbr) return buildFallbackAppreciation(state);

  try {
    const text = await loadStateHpiFile();
    const points = parseStateSeries(text, abbr);
    if (points.length < 5) return buildFallbackAppreciation(abbr);

    const latest = points[points.length - 1];
    const priorYear = findSameQuarter(points, latest.year - 1, latest.quarter);
    if (!priorYear) return buildFallbackAppreciation(abbr);

    const rateYoY = (latest.index / priorYear.index - 1) * 100;
    const fiveYearsAgo = findSameQuarter(points, latest.year - 5, latest.quarter);
    const rate5yrAnnualized = fiveYearsAgo
      ? ((latest.index / fiveYearsAgo.index) ** (1 / 5) - 1) * 100
      : null;

    const geography = STATE_NAMES[abbr] || abbr;
    const asOf = `${latest.year} Q${latest.quarter}`;

    return {
      rateYoY: Math.round(rateYoY * 100) / 100,
      rate5yrAnnualized:
        rate5yrAnnualized != null ? Math.round(rate5yrAnnualized * 100) / 100 : null,
      rateUsed: Math.round(rateYoY * 100) / 100,
      geography,
      asOf,
      source: "fhfa_state",
      notes: `Based on FHFA all-transactions House Price Index for ${geography} (free public data). Trailing 1-year change through ${asOf}; past performance is not a guarantee.`,
      indexLatest: latest.index,
      indexPriorYear: priorYear.index,
    };
  } catch {
    return buildFallbackAppreciation(abbr);
  }
}

export function projectAppreciation(
  purchasePrice: number,
  cashFlowAnnual: number,
  estimate: AppreciationEstimate
): AppreciationProjection {
  const rate = estimate.rateUsed / 100;
  const projectedValue1yr = purchasePrice * (1 + rate);
  const projectedValue5yr = purchasePrice * (1 + rate) ** 5;
  const gain1yr = projectedValue1yr - purchasePrice;
  const gain5yr = projectedValue5yr - purchasePrice;
  const totalReturn1yr = cashFlowAnnual + gain1yr;
  const totalReturn1yrPct = purchasePrice > 0 ? (totalReturn1yr / purchasePrice) * 100 : 0;

  return {
    purchasePrice,
    projectedValue1yr: Math.round(projectedValue1yr),
    projectedValue5yr: Math.round(projectedValue5yr),
    gain1yr: Math.round(gain1yr),
    gain5yr: Math.round(gain5yr),
    totalReturn1yr: Math.round(totalReturn1yr),
    totalReturn1yrPct: Math.round(totalReturn1yrPct * 100) / 100,
  };
}
