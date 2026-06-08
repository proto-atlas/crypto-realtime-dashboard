import type { MarketRow } from "./types";

type StreamMarketSummary = {
  source: "binance" | "coinbase";
  updates: readonly StreamMarketUpdate[];
};

type StreamMarketUpdate = {
  symbol: string;
  closePriceUsd: number;
  openPriceUsd: number;
  quoteVolumeUsd: number;
};

const streamAssetNames = new Map([
  ["BTCUSDT", { displayName: "Bitcoin", symbol: "BTC" }],
  ["ETHUSDT", { displayName: "Ethereum", symbol: "ETH" }],
  ["SOLUSDT", { displayName: "Solana", symbol: "SOL" }],
  ["XRPUSDT", { displayName: "XRP", symbol: "XRP" }],
  ["BTC-USD", { displayName: "Bitcoin", symbol: "BTC" }],
  ["ETH-USD", { displayName: "Ethereum", symbol: "ETH" }],
  ["SOL-USD", { displayName: "Solana", symbol: "SOL" }],
  ["XRP-USD", { displayName: "XRP", symbol: "XRP" }],
]);

export function createStreamMarketRows(
  baseRows: readonly MarketRow[],
  summary: StreamMarketSummary | null,
): MarketRow[] {
  if (summary === null) {
    return baseRows.map((row) => ({ ...row }));
  }

  const sourceLabel = summary.source === "coinbase" ? "coinbase ws" : "binance ws";
  const updatesByAssetSymbol = createUpdatesByAssetSymbol(summary.updates);

  return baseRows.map((row) => {
    const update = updatesByAssetSymbol.get(row.symbol);

    if (update === undefined) {
      return {
        ...row,
        updatedAt: "waiting ws",
      };
    }

    const asset = streamAssetNames.get(update.symbol);
    const change24hPercent =
      update.openPriceUsd > 0
        ? ((update.closePriceUsd - update.openPriceUsd) / update.openPriceUsd) * 100
        : 0;

    return {
      symbol: asset?.symbol ?? row.symbol,
      displayName: asset?.displayName ?? row.displayName,
      priceUsd: update.closePriceUsd,
      change24hPercent,
      volume24hUsd: update.quoteVolumeUsd,
      updatedAt: sourceLabel,
    };
  });
}

function createUpdatesByAssetSymbol(updates: readonly StreamMarketUpdate[]) {
  const updatesByAssetSymbol = new Map<string, StreamMarketUpdate>();

  for (const update of updates) {
    const asset = streamAssetNames.get(update.symbol);

    if (asset !== undefined) {
      updatesByAssetSymbol.set(asset.symbol, update);
    }
  }

  return updatesByAssetSymbol;
}
