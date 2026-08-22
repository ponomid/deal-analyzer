import type { PropertyType } from "@/lib/property-type";

export type { PropertyType };

export type Comp = {
  address?: string;
  rent?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  source?: string;
};

export type UnitInfo = {
  label: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
};

export type UnitRentEstimate = {
  label: string;
  estimated_rent: number;
  rent_low?: number;
  rent_high?: number;
};

export type RentEstimate = {
  estimated_rent: number;
  rent_low: number;
  rent_high: number;
  comps: Comp[];
  notes: string;
  property_type?: PropertyType;
  units?: UnitRentEstimate[];
};

export type AnalyzeRequest = {
  address: string;
  propertyType: PropertyType;
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  units?: UnitInfo[];
  override: number;
};

export type OperatingEstimates = {
  property_tax_annual: number;
  insurance_annual: number;
  hoa_monthly: number;
  maintenance_pct: number;
  vacancy_pct: number;
  management_pct: number;
  notes: string;
  source: "web" | "fallback";
};

export type OperatingEstimatesRequest = {
  address: string;
  zip?: string;
  state?: string;
  city?: string;
  purchasePrice: number;
};
