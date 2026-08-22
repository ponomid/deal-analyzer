export function googleStaticMapUrl(lat: number, lon: number, apiKey: string): string {
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

/** Free fallback when Google Maps is unavailable or misconfigured. */
export function osmEmbedMapUrl(lat: number, lon: number): string {
  const delta = 0.006;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const params = new URLSearchParams({
    bbox,
    layer: "mapnik",
    marker: `${lat},${lon}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

export function mapImageProxyUrl(lat: number, lon: number): string {
  return `/api/map-image?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;
}

export function getReportMapCoords(report: {
  form: { verifiedAddress?: { lat: number; lon: number } | null };
}): { lat: number; lon: number } | null {
  const { lat, lon } = report.form.verifiedAddress ?? {};
  if (typeof lat === "number" && typeof lon === "number") return { lat, lon };
  return null;
}
