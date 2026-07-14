import "server-only";
import { redis } from "@/core/cache/redis";

export const CACHE_TTL = {
  dashboard: 60,
  doctorList: 300,
  appointments: 60,
  healthCardLookup: 120,
  patientList: 60,
  medicalHistory: 120,
  departmentList: 300,
  specializationList: 300,
} as const;

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  let cached: T | null = null;
  try {
    cached = await redis.get<T>(key);
  } catch (error) {
    console.error(`[cache] read failed for key "${key}"`, error);
  }

  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const fresh = await fetcher();

  try {
    await redis.set(key, fresh, { ex: ttlSeconds });
  } catch (error) {
    console.error(`[cache] write failed for key "${key}"`, error);
  }

  return fresh;
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (error) {
    console.error(
      `[cache] invalidate failed for keys "${keys.join(", ")}"`,
      error
    );
  }
}
