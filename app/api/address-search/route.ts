import { NextResponse } from "next/server";
import {
  formatGooglePlace,
  formatNominatimResult,
  formatPhotonFeature,
  type AddressSuggestion,
} from "@/lib/address";

export const runtime = "nodejs";

async function searchGooglePlaces(query: string, apiKey: string): Promise<AddressSuggestion[]> {
  const autoUrl = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  autoUrl.searchParams.set("input", query);
  autoUrl.searchParams.set("types", "address");
  autoUrl.searchParams.set("components", "country:us");
  autoUrl.searchParams.set("key", apiKey);

  const autoResponse = await fetch(autoUrl.toString(), { cache: "no-store" });
  if (!autoResponse.ok) return [];

  const autoData = (await autoResponse.json()) as {
    status?: string;
    predictions?: { place_id?: string; description?: string }[];
  };
  if (autoData.status !== "OK" && autoData.status !== "ZERO_RESULTS") return [];

  const predictions = (autoData.predictions || []).slice(0, 6);
  const detailed = await Promise.all(
    predictions.map(async (prediction) => {
      if (!prediction.place_id) return null;
      const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      detailsUrl.searchParams.set("place_id", prediction.place_id);
      detailsUrl.searchParams.set(
        "fields",
        "place_id,formatted_address,geometry,address_component"
      );
      detailsUrl.searchParams.set("key", apiKey);

      const detailsResponse = await fetch(detailsUrl.toString(), { cache: "no-store" });
      if (!detailsResponse.ok) return null;
      const detailsData = (await detailsResponse.json()) as {
        status?: string;
        result?: Parameters<typeof formatGooglePlace>[0];
      };
      if (detailsData.status !== "OK" || !detailsData.result) return null;
      return formatGooglePlace(detailsData.result);
    })
  );

  return detailed.filter((s): s is AddressSuggestion => Boolean(s));
}

async function searchNominatim(query: string): Promise<AddressSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "us");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "deal-analyzer/1.0 (personal rental worksheet)",
    },
    cache: "no-store",
  });
  if (!response.ok) return [];

  const data = (await response.json()) as unknown[];
  return (data || [])
    .map((result, index) =>
      formatNominatimResult(result as Parameters<typeof formatNominatimResult>[0], index)
    )
    .filter((s): s is AddressSuggestion => Boolean(s));
}

async function searchPhoton(query: string): Promise<AddressSuggestion[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bbox", "-125,24,-66,50");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];

  const data = (await response.json()) as { features?: unknown[] };
  return (data.features || [])
    .map((feature, index) =>
      formatPhotonFeature(feature as Parameters<typeof formatPhotonFeature>[0], index)
    )
    .filter((s): s is AddressSuggestion => Boolean(s));
}

function dedupe(suggestions: AddressSuggestion[]): AddressSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = s.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] satisfies AddressSuggestion[] });
  }

  try {
    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
      "";

    let suggestions: AddressSuggestion[] = [];

    if (apiKey) {
      suggestions = await searchGooglePlaces(q, apiKey);
    }

    if (suggestions.length === 0) {
      suggestions = await searchNominatim(q);
    }

    if (suggestions.length === 0) {
      suggestions = await searchPhoton(q);
    }

    return NextResponse.json({ suggestions: dedupe(suggestions) });
  } catch {
    return NextResponse.json({ error: "Address lookup failed" }, { status: 502 });
  }
}
