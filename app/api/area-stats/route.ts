import { NextResponse } from "next/server";
import type { AreaStats, AreaStatsRequest } from "@/lib/area-stats";
import { buildFallbackAreaStats } from "@/lib/area-stats-fallback";
import { readAreaStatsCache, writeAreaStatsCache } from "@/lib/area-stats-store";

export const runtime = "nodejs";

function parseAreaStats(payload: unknown): AreaStats | null {
  const data = payload as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const textBlocks = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "");
  const joined = textBlocks.join("\n");
  const start = joined.indexOf("{");
  const end = joined.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  try {
    const parsed = JSON.parse(joined.slice(start, end + 1)) as Partial<AreaStats>;
    if (!parsed.crime_grade && !parsed.school_rating) return null;
    return {
      crime_grade: parsed.crime_grade || "Unknown",
      crime_index:
        parsed.crime_index != null && !Number.isNaN(Number(parsed.crime_index))
          ? Number(parsed.crime_index)
          : null,
      school_rating:
        parsed.school_rating != null && !Number.isNaN(Number(parsed.school_rating))
          ? Number(parsed.school_rating)
          : null,
      school_summary: parsed.school_summary || "School data not available",
      walk_score:
        parsed.walk_score != null && !Number.isNaN(Number(parsed.walk_score))
          ? Number(parsed.walk_score)
          : null,
      median_income:
        parsed.median_income != null && !Number.isNaN(Number(parsed.median_income))
          ? Number(parsed.median_income)
          : null,
      notes: parsed.notes || "Web-sourced area statistics.",
      source: "web",
    };
  } catch {
    return null;
  }
}

async function fetchWebAreaStats(
  apiKey: string,
  address: string,
  zip: string,
  state?: string,
  city?: string
): Promise<AreaStats | null> {
  const location = [address, zip && `ZIP ${zip}`, city, state].filter(Boolean).join(", ");

  const prompt = `You are a real estate market analyst. Search the web for current neighborhood statistics for this US location.

Location: ${location}

Find and summarize:
- Crime / safety (grade A-F or descriptive, plus crime index 0-100 where higher means MORE crime than typical)
- Public school quality (average rating out of 10 for nearby/district schools, name a representative school)
- Walk Score if available (0-100)
- Median household income for the ZIP or city

Respond with ONLY a raw JSON object, no markdown:
{"crime_grade": "<string like B · Below average>", "crime_index": <number 0-100>, "school_rating": <number 0-10>, "school_summary": "<1 sentence with school names or district>", "walk_score": <number or null>, "median_income": <annual household income number or null>, "notes": "<1 sentence on data sources>"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) return null;

  try {
    const data = await response.json();
    return parseAreaStats(data);
  } catch {
    return null;
  }
}

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
  const address = (body.address || "").trim();

  if (!zip) {
    return NextResponse.json(
      { error: "A verified ZIP code is required for area statistics." },
      { status: 400 }
    );
  }

  const cached = await readAreaStatsCache(zip, state, city);
  if (cached) {
    return NextResponse.json(cached);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const web = await fetchWebAreaStats(apiKey, address, zip, state, city);
    if (web) {
      await writeAreaStatsCache(zip, state, city, web);
      return NextResponse.json(web);
    }
  }

  const fallback = buildFallbackAreaStats(state, zip, city);
  await writeAreaStatsCache(zip, state, city, fallback);
  return NextResponse.json(fallback);
}
