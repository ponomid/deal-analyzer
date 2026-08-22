import type { AddressSuggestion } from "@/lib/address";
import type { OperatingEstimates, PropertyType, RentEstimate } from "@/lib/types";

export type ReportAnalysis = {
  rent: number;
  rentData: RentEstimate;
  pi: number;
  taxMonthly: number;
  insMonthly: number;
  hoaMonthly: number;
  maintMonthly: number;
  vacancyMonthly: number;
  mgmtMonthly: number;
  totalExpensesMonthly: number;
  cashFlowMonthly: number;
  cashFlowAnnual: number;
  capRate: number;
  cashInvested: number;
  cashOnCash: number;
  onePercentRatio: number;
  verdict: "Approved" | "Marginal" | "Pass";
  verdictClass: "approved" | "marginal" | "pass";
};

export type ReportUnitForm = {
  id: string;
  label: string;
  beds: string;
  baths: string;
  sqft: string;
};

export type ReportFormState = {
  address: string;
  verifiedAddress: AddressSuggestion | null;
  propertyType: PropertyType;
  beds: string;
  baths: string;
  sqft: string;
  units: ReportUnitForm[];
  price: string;
  financingMode: "default" | "custom";
  operatingMode: "default" | "custom";
  operatingEstimates: OperatingEstimates | null;
  down: string;
  rate: string;
  term: string;
  closing: string;
  tax: string;
  insurance: string;
  hoa: string;
  maint: string;
  vacancy: string;
  mgmt: string;
  rentOverride: string;
};

export type SavedReport = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  form: ReportFormState;
  analysis: ReportAnalysis | null;
};

const STORAGE_KEY = "deal-analyzer-reports";

export function createReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadLocalReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalReports(reports: SavedReport[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/** Load reports from server file; migrate any browser-only copies if server is empty. */
export async function fetchSavedReports(): Promise<SavedReport[]> {
  const localReports = loadLocalReports();

  try {
    const response = await fetch("/api/reports");
    if (!response.ok) {
      return localReports;
    }

    const serverReports = (await response.json()) as SavedReport[];
    if (!Array.isArray(serverReports)) {
      return localReports;
    }

    if (serverReports.length > 0) {
      saveLocalReports(serverReports);
      return serverReports;
    }

    if (localReports.length === 0) return [];

    for (const report of localReports) {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
    }

    const refreshed = await fetch("/api/reports");
    if (refreshed.ok) {
      const migrated = (await refreshed.json()) as SavedReport[];
      if (Array.isArray(migrated) && migrated.length > 0) {
        saveLocalReports(migrated);
        return migrated;
      }
    }

    return localReports;
  } catch {
    return localReports;
  }
}

export async function saveReportToServer(report: SavedReport): Promise<SavedReport[]> {
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });

  if (!response.ok) {
    throw new Error("Failed to save report");
  }

  const payload = (await response.json()) as { reports: SavedReport[] };
  saveLocalReports(payload.reports);
  return payload.reports;
}

export async function deleteReportFromServer(id: string): Promise<SavedReport[]> {
  const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });

  if (!response.ok) {
    throw new Error("Failed to delete report");
  }

  const payload = (await response.json()) as { reports: SavedReport[] };
  saveLocalReports(payload.reports);
  return payload.reports;
}

export function defaultReportName(address: string, price: string): string {
  const street = address.split(",")[0]?.trim();
  if (street) return street;
  if (price) return `Deal · $${Number(price).toLocaleString("en-US")}`;
  return "Untitled report";
}

export function formatReportDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
