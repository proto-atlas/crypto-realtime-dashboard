import { describe, expect, test } from "vitest";
import { readCachedJson, writeCachedJson } from "./cache";
import type { CachePort } from "./types";

describe("readCachedJson", () => {
  test("cache readが失敗したらnullを返す", async () => {
    const cache = createCachePort({
      get: async () => {
        throw new Error("kv_read_failed");
      },
    });

    await expect(readCachedJson(cache, "coingecko:test", isCachedTestValue)).resolves.toBeNull();
  });
});

describe("writeCachedJson", () => {
  test("cache writeが失敗しても例外を投げない", async () => {
    const cache = createCachePort({
      put: async () => {
        throw new Error("kv_write_failed");
      },
    });

    await expect(writeCachedJson(cache, "coingecko:test", { ok: true })).resolves.toBeUndefined();
  });
});

function createCachePort(overrides: Partial<CachePort>): CachePort {
  return {
    get: async () => null,
    put: async () => undefined,
    ...overrides,
  };
}

function isCachedTestValue(value: unknown): value is { ok: true } {
  return isRecord(value) && value.ok === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
