import { normalizeStateAbbr } from "@/lib/operating-defaults";

export type PropertyTaxRateRow = {
  state?: string;
  county?: string;
  city?: string;
  zip?: string;
  property_tax_25th_percentile?: number;
  property_tax_50th_percentile?: number;
  property_tax_75th_percentile?: number;
};

export type PropertyTaxEstimate = {
  property_tax_annual: number;
  effective_rate_pct: number;
  county?: string;
  zip?: string;
  source: "api_ninjas";
};

export async function fetchPropertyTaxFromApiNinjas(
  apiKey: string,
  purchasePrice: number,
  zip?: string,
  state?: string,
  city?: string
): Promise<PropertyTaxEstimate | null> {
  if (purchasePrice <= 0) return null;

  const abbr = normalizeStateAbbr(state);
  const params = new URLSearchParams();

  if (zip) params.set("zip", zip);
  else if (city) params.set("city", city);
  else return null;

  if (abbr) params.set("state", abbr);

  const response = await fetch(`https://api.api-ninjas.com/v1/propertytax?${params}`, {
    headers: { "X-Api-Key": apiKey },
    next: { revalidate: 86400 },
  });

  if (!response.ok) return null;

  const rows = (await response.json()) as PropertyTaxRateRow[];
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const zipMatches = zip ? rows.filter((row) => row.zip === zip) : rows;
  const match = zipMatches[0] ?? rows[0];
  const rate = match.property_tax_50th_percentile;

  if (!rate || rate <= 0) return null;

  return {
    property_tax_annual: Math.round(purchasePrice * rate),
    effective_rate_pct: rate * 100,
    county: match.county,
    zip: match.zip,
    source: "api_ninjas",
  };
}
