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
  await writeReportsToDisk(next);
  return NextResponse.json({ reports: next });
}
