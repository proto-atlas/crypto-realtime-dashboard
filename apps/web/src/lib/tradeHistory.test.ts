import { describe, expect, test } from "vitest";
import {
  createTradeHistoryRows,
  matchesTradeSearch,
  summarizeTradeHistory,
  type TradeHistoryRow,
} from "./tradeHistory";

describe("createTradeHistoryRows", () => {
  test("3件を指定したら決定的な約定履歴を返す", () => {
    expect(createTradeHistoryRows(3)).toEqual([
      {
        id: "TRD-000001",
        executedAtMs: 1_777_626_000_000,
        symbol: "BTC/USDT",
        side: "buy",
        priceUsd: 93462.04,
        quantity: 0.004,
        notionalUsd: 373.85,
        feeUsd: 0.22,
        venue: "Binance Demo",
        status: "filled",
      },
      {
        id: "TRD-000002",
        executedAtMs: 1_777_625_963_000,
        symbol: "ETH/USDT",
        side: "sell",
        priceUsd: 3234.43,
        quantity: 0.0595,
        notionalUsd: 192.45,
        feeUsd: 0.12,
        venue: "Coinbase Demo",
        status: "filled",
      },
      {
        id: "TRD-000003",
        executedAtMs: 1_777_625_926_000,
        symbol: "SOL/USDT",
        side: "buy",
        priceUsd: 141.05,
        quantity: 1.656,
        notionalUsd: 233.58,
        feeUsd: 0.14,
        venue: "Kraken Demo",
        status: "filled",
      },
    ]);
  });

  test("0件を指定したら空配列を返す", () => {
    expect(createTradeHistoryRows(0)).toEqual([]);
  });

  test("負の件数を指定したら空配列を返す", () => {
    expect(createTradeHistoryRows(-1)).toEqual([]);
  });
});

describe("summarizeTradeHistory", () => {
  test("3件を渡したら件数と売買方向と想定元本を集計する", () => {
    const rows: TradeHistoryRow[] = [
      createTradeRow("TRD-1", "buy", "filled", 100),
      createTradeRow("TRD-2", "sell", "rejected", 50),
      createTradeRow("TRD-3", "buy", "canceled", 25),
    ];

    expect(summarizeTradeHistory(rows)).toEqual({
      totalRows: 3,
      totalNotionalUsd: 175,
      filledRows: 1,
      rejectedRows: 1,
      buyRows: 2,
      sellRows: 1,
    });
  });

  test("空配列を渡したら0で集計する", () => {
    expect(summarizeTradeHistory([])).toEqual({
      totalRows: 0,
      totalNotionalUsd: 0,
      filledRows: 0,
      rejectedRows: 0,
      buyRows: 0,
      sellRows: 0,
    });
  });
});

describe("matchesTradeSearch", () => {
  test("銘柄名が一致したらtrueを返す", () => {
    expect(matchesTradeSearch(createTradeRow("TRD-1", "buy", "filled", 100), "btc")).toBe(true);
  });

  test("取引IDが一致したらtrueを返す", () => {
    expect(matchesTradeSearch(createTradeRow("TRD-909", "buy", "filled", 100), "909")).toBe(true);
  });

  test("一致する文字列がない場合はfalseを返す", () => {
    expect(matchesTradeSearch(createTradeRow("TRD-1", "buy", "filled", 100), "solana")).toBe(false);
  });
});

function createTradeRow(
  id: string,
  side: TradeHistoryRow["side"],
  status: TradeHistoryRow["status"],
  notionalUsd: number,
): TradeHistoryRow {
  return {
    id,
    executedAtMs: 1_777_626_000_000,
    symbol: "BTC/USDT",
    side,
    priceUsd: 100,
    quantity: 1,
    notionalUsd,
    feeUsd: 0.06,
    venue: "Binance Demo",
    status,
  };
}
