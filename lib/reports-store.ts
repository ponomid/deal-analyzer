import { promises as fs } from "fs";
import path from "path";
import type { SavedReport } from "@/lib/reports";

const REPORTS_FILE = path.join(process.cwd(), "data", "saved-reports.json");

export async function readReportsFromDisk(): Promise<SavedReport[]> {
  try {
    const raw = await fs.readFile(REPORTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as SavedReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeReportsToDisk(reports: SavedReport[]): Promise<void> {
  await fs.mkdir(path.dirname(REPORTS_FILE), { recursive: true });
  await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), "utf8");
}
