export type CoinbaseTickerUpdate = {
  symbol: string;
  closePriceUsd: number;
  openPriceUsd: number;
  highPriceUsd: number;
  lowPriceUsd: number;
  baseVolume: number;
  quoteVolumeUsd: number;
  eventTime: number;
};

export type CoinbaseTickerSummary = {
  source: "coinbase";
  payloadSize: number;
  receivedAt: string;
  updates: CoinbaseTickerUpdate[];
};

const TRACKED_PRODUCTS = new Set(["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"]);

export function summarizeCoinbaseTickerMessage(
  message: string,
  receivedAt = new Date().toISOString(),
): CoinbaseTickerSummary | null {
  const payload = parseJson(message);
  const update = normalizeTicker(payload);

  if (update === null || !TRACKED_PRODUCTS.has(update.symbol)) {
    return null;
  }

  return {
    source: "coinbase",
    payloadSize: 1,
    receivedAt,
    updates: [update],
  };
}

function normalizeTicker(value: unknown): CoinbaseTickerUpdate | null {
  if (!isRecord(value) || value.type !== "ticker") {
    return null;
  }

  const symbol = readString(value.product_id);
  const closePriceUsd = readNumberString(value.price);
  const openPriceUsd = readNumberString(value.open_24h);
  const highPriceUsd = readNumberString(value.high_24h);
  const lowPriceUsd = readNumberString(value.low_24h);
  const baseVolume = readNumberString(value.volume_24h);
  const eventTime = readDateMillis(value.time);

  if (
    symbol === null ||
    closePriceUsd === null ||
    openPriceUsd === null ||
    highPriceUsd === null ||
    lowPriceUsd === null ||
    baseVolume === null ||
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
    // 表示用の近似値として、Coinbase tickerのbase volumeに直近価格を掛ける。
    quoteVolumeUsd: baseVolume * closePriceUsd,
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

function readNumberString(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function readDateMillis(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : null;
}
