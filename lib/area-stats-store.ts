import { promises as fs } from "fs";
import path from "path";
import type { AreaStats } from "@/lib/area-stats";

const CACHE_FILE = path.join(process.cwd(), "data", "area-stats-cache.json");

type CacheEntry = {
  stats: AreaStats;
  cachedAt: string;
};

type CacheFile = Record<string, CacheEntry>;

function cacheKey(zip: string, state?: string, city?: string): string {
  return [zip, state || "", city || ""].join("|").toLowerCase();
}

export async function readAreaStatsCache(
  zip: string,
  state?: string,
  city?: string
): Promise<AreaStats | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const cache = JSON.parse(raw) as CacheFile;
    const entry = cache[cacheKey(zip, state, city)];
    if (!entry) return null;
    const ageMs = Date.now() - new Date(entry.cachedAt).getTime();
    if (ageMs > 30 * 24 * 60 * 60 * 1000) return null;
    return entry.stats;
  } catch {
    return null;
  }
}

export async function writeAreaStatsCache(
  zip: string,
  state: string | undefined,
  city: string | undefined,
  stats: AreaStats
): Promise<void> {
  let cache: CacheFile = {};
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    cache = JSON.parse(raw) as CacheFile;
  } catch {
    // start fresh
  }

  cache[cacheKey(zip, state, city)] = { stats, cachedAt: new Date().toISOString() };
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}
