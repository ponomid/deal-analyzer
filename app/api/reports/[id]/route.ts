import { NextResponse } from "next/server";
import { readReportsFromDisk, writeReportsToDisk } from "@/lib/reports-store";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reports = await readReportsFromDisk();
  const next = reports.filter((r) => r.id !== id);
  try {
    await writeReportsToDisk(next);
  } catch {
    return NextResponse.json({ error: "Report storage unavailable" }, { status: 503 });
  }
  return NextResponse.json({ reports: next });
}
