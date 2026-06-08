import type {
  AssetSymbol,
  AssetTicker,
  CandlestickPoint,
  CoinMarketChart,
  CoinMarketChartPoint,
} from "@crypto-realtime-dashboard/shared-types";

const DEMO_CHART_START_TIMESTAMP = Date.UTC(2026, 0, 1, 0, 0, 0);
const DEMO_CHART_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_DEMO_CHART_POINTS = 24;

const demoTickers: readonly AssetTicker[] = [
  {
    symbol: "BTC",
    displayName: "Bitcoin",
    priceUsd: 43120.52,
    change24hPercent: 1.24,
    volume24hUsd: 18_240_000_000,
    updatedAt: "demo",
  },
  {
    symbol: "ETH",
    displayName: "Ethereum",
    priceUsd: 2288.16,
    change24hPercent: -0.86,
    volume24hUsd: 9_350_000_000,
    updatedAt: "demo",
  },
  {
    symbol: "SOL",
    displayName: "Solana",
    priceUsd: 104.72,
    change24hPercent: 3.42,
    volume24hUsd: 2_140_000_000,
    updatedAt: "demo",
  },
  {
    symbol: "XRP",
    displayName: "XRP",
    priceUsd: 0.62,
    change24hPercent: -1.18,
    volume24hUsd: 1_420_000_000,
    updatedAt: "demo",
  },
];

const demoBasePriceBySymbol = {
  BTC: 43_000,
  ETH: 2_300,
  SOL: 105,
  XRP: 0.62,
} as const satisfies Record<AssetSymbol, number>;

const demoMarketCapMultiplierBySymbol = {
  BTC: 19_600_000,
  ETH: 120_000_000,
  SOL: 440_000_000,
  XRP: 54_000_000_000,
} as const satisfies Record<AssetSymbol, number>;

const demoVolumeBaseBySymbol = {
  BTC: 18_000_000_000,
  ETH: 9_000_000_000,
  SOL: 2_100_000_000,
  XRP: 1_400_000_000,
} as const satisfies Record<AssetSymbol, number>;

export function createDemoTickers() {
  return demoTickers.map((ticker) => ({ ...ticker }));
}

export function createDemoMarketChart(
  symbol: AssetSymbol,
  pointCount = DEFAULT_DEMO_CHART_POINTS,
): CoinMarketChart {
  if (pointCount < 1) {
    throw new Error("invalid_demo_chart_point_count");
  }

  const prices: CoinMarketChartPoint[] = [];
  const marketCaps: CoinMarketChartPoint[] = [];
  const totalVolumes: CoinMarketChartPoint[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const timestamp = DEMO_CHART_START_TIMESTAMP + DEMO_CHART_INTERVAL_MS * index;
    const price = createDemoPrice(symbol, index);
    prices.push({ timestamp, value: price });
    marketCaps.push({
      timestamp,
      value: roundUsd(price * demoMarketCapMultiplierBySymbol[symbol]),
    });
    totalVolumes.push({
      timestamp,
      value: roundUsd(demoVolumeBaseBySymbol[symbol] * (1 + (index % 4) * 0.015)),
    });
  }

  return {
    prices,
    marketCaps,
    totalVolumes,
  };
}

export function createDemoCandlesticks(
  symbol: AssetSymbol,
  pointCount = DEFAULT_DEMO_CHART_POINTS,
): CandlestickPoint[] {
  if (pointCount < 1) {
    throw new Error("invalid_demo_chart_point_count");
  }

  const candles: CandlestickPoint[] = [];
  let previousClose = createDemoPrice(symbol, 0);

  for (let index = 0; index < pointCount; index += 1) {
    const timestamp = DEMO_CHART_START_TIMESTAMP + DEMO_CHART_INTERVAL_MS * index;
    const close = createDemoPrice(symbol, index);
    const open = index === 0 ? previousClose * 0.998 : previousClose;
    const spread = Math.max(close * 0.003, 0.01);
    const high = Math.max(open, close) + spread;
    const low = Math.max(0, Math.min(open, close) - spread);
    const volume = demoVolumeBaseBySymbol[symbol] * (1 + (index % 4) * 0.015);

    candles.push({
      timestamp,
      open: roundUsd(open),
      high: roundUsd(high),
      low: roundUsd(low),
      close: roundUsd(close),
      volume: roundUsd(volume / close),
      quoteVolume: roundUsd(volume),
    });
    previousClose = close;
  }

  return candles;
}

function createDemoPrice(symbol: AssetSymbol, index: number) {
  const basePrice = demoBasePriceBySymbol[symbol];
  const trend = index * 0.001;
  const wave = ((index % 6) - 2) * 0.0025;

  return roundUsd(basePrice * (1 + trend + wave));
}

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}
