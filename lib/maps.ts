function buildStaticMapUrl(lat: number, lon: number, apiKey: string): string {
  const params = new URLSearchParams({
    center: `${lat},${lon}`,
    zoom: "18",
    size: "640x320",
    scale: "2",
    maptype: "satellite",
    markers: `color:red|${lat},${lon}`,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function mapImageSrc(lat: number, lon: number): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    return buildStaticMapUrl(lat, lon, apiKey);
  }
  return `/api/map-image?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;
}

export function getReportMapCoords(report: {
  form: { verifiedAddress?: { lat: number; lon: number } | null };
}): { lat: number; lon: number } | null {
  const { lat, lon } = report.form.verifiedAddress ?? {};
  if (typeof lat === "number" && typeof lon === "number") return { lat, lon };
  return null;
}
