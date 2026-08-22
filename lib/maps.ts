export function mapImageSrc(lat: number, lon: number): string {
  return `/api/map-image?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;
}

export function getReportMapCoords(report: {
  form: { verifiedAddress?: { lat: number; lon: number } | null };
}): { lat: number; lon: number } | null {
  const { lat, lon } = report.form.verifiedAddress ?? {};
  if (typeof lat === "number" && typeof lon === "number") return { lat, lon };
  return null;
}
