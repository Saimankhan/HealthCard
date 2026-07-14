import "server-only";
import { redis } from "@/core/cache/redis";

/**
 * Fixed-window counter using Redis INCR+EXPIRE. Good enough to blunt abuse
 * on a handful of sensitive endpoints (checkout creation, broadcasts)
 * without pulling in a dedicated rate-limiting library.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }
  return count <= limit;
}
