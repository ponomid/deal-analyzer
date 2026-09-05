import { NextResponse } from "next/server";
import type { AreaStatsRequest } from "@/lib/area-stats";
import { buildFallbackAreaStats } from "@/lib/area-stats-fallback";
import { readAreaStatsCache, writeAreaStatsCache } from "@/lib/area-stats-store";

export const runtime = "nodejs";

/**
 * Neighborhood stats use state-level fallbacks (no Anthropic web search).
 * Live web lookup was expensive and often timed out / crashed on Vercel
 * when writing cache to a read-only filesystem.
 */
export async function POST(request: Request) {
  let body: AreaStatsRequest;
  try {
    body = (await request.json()) as AreaStatsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const zip = (body.zip || "").trim();
  const state = (body.state || "").trim();
  const city = (body.city || "").trim();

  if (!zip) {
    return NextResponse.json(
      { error: "A verified ZIP code is required for area statistics." },
      { status: 400 }
    );
  }

  try {
    const cached = await readAreaStatsCache(zip, state, city);
    if (cached) {
      return NextResponse.json(cached);
    }

    const fallback = buildFallbackAreaStats(state, zip, city);
    await writeAreaStatsCache(zip, state, city, fallback);
    return NextResponse.json(fallback);
  } catch {
    // Last resort — never surface a hard failure in the Neighborhood panel.
    return NextResponse.json(buildFallbackAreaStats(state, zip, city));
  }
}
