export type BinanceMiniTickerUpdate = {
  symbol: string;
  closePriceUsd: number;
  openPriceUsd: number;
  highPriceUsd: number;
  lowPriceUsd: number;
  baseVolume: number;
  quoteVolumeUsd: number;
  eventTime: number;
};

export type BinanceMiniTickerSummary = {
  source: "binance";
  payloadSize: number;
  receivedAt: string;
  updates: BinanceMiniTickerUpdate[];
};

const TRACKED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"]);

export function summarizeBinanceMiniTickerMessage(
  message: string,
  receivedAt = new Date().toISOString(),
): BinanceMiniTickerSummary | null {
  const payload = parseJson(message);

  if (!Array.isArray(payload)) {
    return null;
  }

  const updates = payload
    .map(normalizeMiniTicker)
    .filter((item): item is BinanceMiniTickerUpdate => item !== null)
    .filter((item) => TRACKED_SYMBOLS.has(item.symbol));

  return {
    source: "binance",
    payloadSize: payload.length,
    receivedAt,
    updates,
  };
}

function normalizeMiniTicker(value: unknown): BinanceMiniTickerUpdate | null {
  if (!isRecord(value)) {
    return null;
  }

  const symbol = readString(value.s);
  const closePriceUsd = readNumberString(value.c);
  const openPriceUsd = readNumberString(value.o);
  const highPriceUsd = readNumberString(value.h);
  const lowPriceUsd = readNumberString(value.l);
  const baseVolume = readNumberString(value.v);
  const quoteVolumeUsd = readNumberString(value.q);
  const eventTime = readNumber(value.E);

  if (
    symbol === null ||
    closePriceUsd === null ||
    openPriceUsd === null ||
    highPriceUsd === null ||
    lowPriceUsd === null ||
    baseVolume === null ||
    quoteVolumeUsd === null ||
    eventTime === null
  ) {
    return null;
  }

  return {
    symbol,
    closePriceUsd,
    openPriceUsd,
    highPriceUsd,
    lowPriceUsd,
    baseVolume,
    quoteVolumeUsd,
    eventTime,
  };
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNumberString(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}
