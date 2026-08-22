import { NextResponse } from "next/server";
import { formatPhotonFeature, type AddressSuggestion } from "@/lib/address";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] satisfies AddressSuggestion[] });
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  // Bias results toward the United States.
  url.searchParams.set("bbox", "-125,24,-66,50");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Address lookup failed" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as { features?: unknown[] };
    const suggestions = (data.features || [])
      .map((feature, index) => formatPhotonFeature(feature as Parameters<typeof formatPhotonFeature>[0], index))
      .filter((s): s is AddressSuggestion => Boolean(s));

    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      if (seen.has(s.label)) return false;
      seen.add(s.label);
      return true;
    });

    return NextResponse.json({ suggestions: unique });
  } catch {
    return NextResponse.json({ error: "Address lookup failed" }, { status: 502 });
  }
}
