import { NextResponse } from "next/server";
import { fetchAppreciationFromFhfa } from "@/lib/appreciation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = (searchParams.get("state") || "").trim();

  if (!state) {
    return NextResponse.json(
      { error: "A state is required to look up FHFA house price appreciation." },
      { status: 400 }
    );
  }

  const estimate = await fetchAppreciationFromFhfa(state);
  return NextResponse.json(estimate);
}
