import type { ApiErrorResponse } from "@crypto-realtime-dashboard/shared-types";
import type { Context, Next } from "hono";
import type { Bindings } from "./bindings";

const clientIpHeader = "cf-connecting-ip";
const forwardedForHeader = "x-forwarded-for";
const anonymousClientKey = "anonymous";

export const COINGECKO_RATE_LIMIT_RETRY_AFTER_SECONDS = 60;
let hasWarnedMissingRateLimitBinding = false;

export async function enforceCoinGeckoRateLimit(c: Context<{ Bindings: Bindings }>, next: Next) {
  const limiter = c.env?.COINGECKO_RATE_LIMITER;

  if (limiter === undefined) {
    if (!hasWarnedMissingRateLimitBinding) {
      console.warn("COINGECKO_RATE_LIMITER binding missing; CoinGecko REST is passing through.");
      hasWarnedMissingRateLimitBinding = true;
    }
    await next();
    return;
  }

  const { success } = await limiter.limit({
    key: resolveClientRateLimitKey(c.req.raw),
  });

  if (!success) {
    const response: ApiErrorResponse = {
      error: {
        type: "rate_limited",
        message: "Market data request rate limit exceeded.",
      },
    };

    return c.json(response, 429, {
      "Retry-After": String(COINGECKO_RATE_LIMIT_RETRY_AFTER_SECONDS),
    });
  }

  await next();
}

export function resolveClientRateLimitKey(request: Request) {
  return `coingecko:${resolveClientAddress(request)}`;
}

function resolveClientAddress(request: Request) {
  const cloudflareIp = request.headers.get(clientIpHeader)?.trim();

  if (cloudflareIp !== undefined && cloudflareIp.length > 0) {
    return cloudflareIp;
  }

  const forwardedFor = request.headers.get(forwardedForHeader)?.split(",")[0]?.trim();

  return forwardedFor !== undefined && forwardedFor.length > 0 ? forwardedFor : anonymousClientKey;
}
