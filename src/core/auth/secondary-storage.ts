import "server-only";
import { Redis } from "@upstash/redis";
import type { SecondaryStorage } from "better-auth";

import { serverEnv } from "@/core/config/env.server";

// A dedicated client with automaticDeserialization disabled: Better Auth's
// SecondaryStorage contract stores/reads raw strings (often pre-serialized
// JSON) and must get back exactly what it wrote, not Upstash's auto-parsed
// value.
const rawRedis = new Redis({
  url: serverEnv.UPSTASH_REDIS_REST_URL,
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
  automaticDeserialization: false,
});

export const authSecondaryStorage: SecondaryStorage = {
  get: async (key) => {
    return (await rawRedis.get(key)) as string | null;
  },
  set: async (key, value, ttl) => {
    if (ttl) {
      await rawRedis.set(key, value, { ex: ttl });
    } else {
      await rawRedis.set(key, value);
    }
  },
  delete: async (key) => {
    await rawRedis.del(key);
  },
  // INCR atomically creates the key at 1 if absent; the immediately-following
  // EXPIRE (only on the creating request) applies the TTL. There's a brief
  // window where a concurrent reader could see the key before EXPIRE lands,
  // but the counter itself never double-increments — this is the standard
  // Redis counter+TTL pattern used by most rate limiters.
  increment: async (key, ttl) => {
    const value = await rawRedis.incr(key);
    if (value === 1) {
      await rawRedis.expire(key, ttl);
    }
    return value;
  },
};
