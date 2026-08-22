import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function streetViewAvailable(lat: string, lon: string, apiKey: string): Promise<boolean> {
  const metaUrl = new URL("https://maps.googleapis.com/maps/api/streetview/metadata");
  metaUrl.searchParams.set("location", `${lat},${lon}`);
  metaUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(metaUrl.toString(), { next: { revalidate: 86400 } });
    if (!response.ok) return false;
    const data = (await response.json()) as { status?: string };
    return data.status === "OK";
  } catch {
    return false;
  }
}

function buildMapUrl(lat: string, lon: string, apiKey: string, useStreetView: boolean): string {
  if (useStreetView) {
    const url = new URL("https://maps.googleapis.com/maps/api/streetview");
    url.searchParams.set("size", "640x320");
    url.searchParams.set("location", `${lat},${lon}`);
    url.searchParams.set("fov", "90");
    url.searchParams.set("pitch", "0");
    url.searchParams.set("key", apiKey);
    return url.toString();
  }

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${lat},${lon}`);
  url.searchParams.set("zoom", "18");
  url.searchParams.set("size", "640x320");
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "satellite");
  url.searchParams.set("markers", `color:red|${lat},${lon}`);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Map images are not configured" }, { status: 503 });
  }

  const hasStreetView = await streetViewAvailable(lat, lon, apiKey);
  const mapUrl = buildMapUrl(lat, lon, apiKey, hasStreetView);

  try {
    const response = await fetch(mapUrl, { next: { revalidate: 86400 } });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to load map image" }, { status: 502 });
    }

    const bytes = await response.arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load map image" }, { status: 502 });
  }
}
