import type { AddressSuggestion } from "@/lib/address";
import type { AppreciationEstimate, AppreciationProjection } from "@/lib/appreciation";
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
  appreciation?: AppreciationEstimate | null;
  appreciationProjection?: AppreciationProjection | null;
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

function upsertLocalReport(report: SavedReport): SavedReport[] {
  const reports = loadLocalReports();
  const index = reports.findIndex((r) => r.id === report.id);
  const next = [...reports];
  if (index >= 0) next[index] = report;
  else next.unshift(report);
  saveLocalReports(next);
  return next;
}

function deleteLocalReport(id: string): SavedReport[] {
  const next = loadLocalReports().filter((r) => r.id !== id);
  saveLocalReports(next);
  return next;
}

/** Prefer newer updatedAt when merging local + server copies of the same id. */
function mergeReports(local: SavedReport[], remote: SavedReport[]): SavedReport[] {
  const byId = new Map<string, SavedReport>();

  for (const report of [...remote, ...local]) {
    const existing = byId.get(report.id);
    if (!existing) {
      byId.set(report.id, report);
      continue;
    }
    const existingTime = Date.parse(existing.updatedAt) || 0;
    const nextTime = Date.parse(report.updatedAt) || 0;
    if (nextTime >= existingTime) byId.set(report.id, report);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTime = Date.parse(a.updatedAt) || 0;
    const bTime = Date.parse(b.updatedAt) || 0;
    return bTime - aTime;
  });
}

/**
 * Load saved reports. Browser localStorage is the source of truth on serverless
 * hosts (Vercel /tmp is ephemeral and must not wipe the local list).
 */
export async function fetchSavedReports(): Promise<SavedReport[]> {
  const localReports = loadLocalReports();

  try {
    const response = await fetch("/api/reports");
    if (!response.ok) return localReports;

    const serverReports = (await response.json()) as SavedReport[];
    if (!Array.isArray(serverReports) || serverReports.length === 0) {
      return localReports;
    }

    const merged = mergeReports(localReports, serverReports);
    saveLocalReports(merged);
    return merged;
  } catch {
    return localReports;
  }
}

/** Save a report locally first; best-effort sync to server without trusting its full list. */
export async function saveReportToServer(report: SavedReport): Promise<SavedReport[]> {
  const next = upsertLocalReport(report);

  try {
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
  } catch {
    // Local save already succeeded.
  }

  return next;
}

/** Delete locally first; best-effort sync to server. */
export async function deleteReportFromServer(id: string): Promise<SavedReport[]> {
  const next = deleteLocalReport(id);

  try {
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
  } catch {
    // Local delete already succeeded.
  }

  return next;
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
