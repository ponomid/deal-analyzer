import { NextResponse } from "next/server";
import { readReportsFromDisk, writeReportsToDisk } from "@/lib/reports-store";
import type { SavedReport } from "@/lib/reports";

export const runtime = "nodejs";

export async function GET() {
  const reports = await readReportsFromDisk();
  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  let report: SavedReport;
  try {
    report = (await request.json()) as SavedReport;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!report?.id || !report?.name || !report?.form) {
    return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
  }

  const reports = await readReportsFromDisk();
  const index = reports.findIndex((r) => r.id === report.id);
  const next = [...reports];
  if (index >= 0) next[index] = report;
  else next.unshift(report);

  await writeReportsToDisk(next);
  return NextResponse.json({ reports: next });
}
