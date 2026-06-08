import type { CachePort } from "./types";

export const COINGECKO_CACHE_TTL_SECONDS = 300;

export async function readCachedJson<TValue>(
  cache: CachePort | undefined,
  key: string,
  isValue: (value: unknown) => value is TValue,
) {
  if (cache === undefined) {
    return null;
  }

  const cached = await cache.get(key, { type: "json" }).catch(() => null);

  return isValue(cached) ? cached : null;
}

export async function writeCachedJson(cache: CachePort | undefined, key: string, value: unknown) {
  if (cache === undefined) {
    return;
  }

  await cache
    .put(key, JSON.stringify(value), {
      expirationTtl: COINGECKO_CACHE_TTL_SECONDS,
    })
    .catch(() => undefined);
}
