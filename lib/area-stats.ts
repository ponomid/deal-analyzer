export type AreaStats = {
  crime_grade: string;
  crime_index: number | null;
  school_rating: number | null;
  school_summary: string;
  walk_score: number | null;
  median_income: number | null;
  notes: string;
  source: "web" | "fallback";
};

export type AreaStatsRequest = {
  address: string;
  zip?: string;
  state?: string;
  city?: string;
};

export async function fetchAreaStats(request: AreaStatsRequest): Promise<AreaStats> {
  const response = await fetch("/api/area-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Failed to load area statistics");
  }
  return (await response.json()) as AreaStats;
}
