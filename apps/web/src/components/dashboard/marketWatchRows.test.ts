import { describe, expect, test } from "vitest";
import { createStreamMarketRows } from "./marketWatchRows";
import type { MarketRow } from "./types";

const baseRows: readonly MarketRow[] = [
  {
    symbol: "BTC",
    displayName: "Bitcoin",
    priceUsd: 43_000,
    change24hPercent: 1,
    volume24hUsd: 18_000_000_000,
    updatedAt: "demo",
    sourceLabel: "デモ",
  },
  {
    symbol: "ETH",
    displayName: "Ethereum",
    priceUsd: 2_300,
    change24hPercent: -1,
    volume24hUsd: 9_000_000_000,
    updatedAt: "demo",
    sourceLabel: "デモ",
  },
  {
    symbol: "SOL",
    displayName: "Solana",
    priceUsd: 105,
    change24hPercent: 2,
    volume24hUsd: 2_100_000_000,
    updatedAt: "demo",
    sourceLabel: "デモ",
  },
  {
    symbol: "XRP",
    displayName: "XRP",
    priceUsd: 0.62,
    change24hPercent: -2,
    volume24hUsd: 1_400_000_000,
    updatedAt: "demo",
    sourceLabel: "デモ",
  },
];

describe("createStreamMarketRows", () => {
  test("summaryがない場合はbaseRowsを同じ件数で返す", () => {
    const rows = createStreamMarketRows(baseRows, null);

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.symbol)).toEqual(["BTC", "ETH", "SOL", "XRP"]);
    expect(rows.map((row) => row.updatedAt)).toEqual(["demo", "demo", "demo", "demo"]);
  });

  test("一部のWS更新だけが届いても4資産の行数を維持する", () => {
    const rows = createStreamMarketRows(baseRows, {
      source: "binance",
      receivedAt: "2026-07-18T00:00:00.000Z",
      updates: [
        {
          symbol: "BTCUSDT",
          closePriceUsd: 70_000,
          openPriceUsd: 68_000,
          quoteVolumeUsd: 20_000_000_000,
        },
      ],
    });

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.symbol)).toEqual(["BTC", "ETH", "SOL", "XRP"]);
    expect(rows[0]).toEqual({
      symbol: "BTC",
      displayName: "Bitcoin",
      priceUsd: 70_000,
      change24hPercent: 2.941176470588235,
      volume24hUsd: 20_000_000_000,
      updatedAt: "2026-07-18T00:00:00.000Z",
      sourceLabel: "Binance WebSocket",
    });
    expect(rows.slice(1).map((row) => row.updatedAt)).toEqual([null, null, null]);
  });
});
