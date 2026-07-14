import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/cache/redis", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));

import { redis } from "@/core/cache/redis";
import { getOrSetCache, invalidateCache } from "@/core/cache/cache";

const mockedRedis = vi.mocked(redis, true);

describe("getOrSetCache", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the cached value without calling the fetcher on a hit", async () => {
    mockedRedis.get.mockResolvedValue({ cached: true });
    const fetcher = vi.fn().mockResolvedValue({ cached: false });

    const result = await getOrSetCache("key", 60, fetcher);

    expect(result).toEqual({ cached: true });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("calls the fetcher and stores the result on a miss", async () => {
    mockedRedis.get.mockResolvedValue(null);
    mockedRedis.set.mockResolvedValue("OK" as never);
    const fetcher = vi.fn().mockResolvedValue({ fresh: true });

    const result = await getOrSetCache("key", 60, fetcher);

    expect(result).toEqual({ fresh: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mockedRedis.set).toHaveBeenCalledWith(
      "key",
      { fresh: true },
      { ex: 60 }
    );
  });

  it("falls back to the fetcher when the Redis read fails", async () => {
    mockedRedis.get.mockRejectedValue(new Error("connection refused"));
    mockedRedis.set.mockResolvedValue("OK" as never);
    const fetcher = vi.fn().mockResolvedValue({ fresh: true });

    const result = await getOrSetCache("key", 60, fetcher);

    expect(result).toEqual({ fresh: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("still returns the fresh value when the Redis write fails", async () => {
    mockedRedis.get.mockResolvedValue(null);
    mockedRedis.set.mockRejectedValue(new Error("connection refused"));
    const fetcher = vi.fn().mockResolvedValue({ fresh: true });

    const result = await getOrSetCache("key", 60, fetcher);

    expect(result).toEqual({ fresh: true });
  });
});

describe("invalidateCache", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("deletes all given keys", async () => {
    mockedRedis.del.mockResolvedValue(1 as never);
    await invalidateCache("a", "b");
    expect(mockedRedis.del).toHaveBeenCalledWith("a", "b");
  });

  it("does nothing when called with no keys", async () => {
    await invalidateCache();
    expect(mockedRedis.del).not.toHaveBeenCalled();
  });

  it("swallows Redis errors instead of throwing", async () => {
    mockedRedis.del.mockRejectedValue(new Error("connection refused"));
    await expect(invalidateCache("a")).resolves.toBeUndefined();
  });
});
