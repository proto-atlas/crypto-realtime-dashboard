import { describe, expect, test } from "vitest";
import {
  applyVirtualOrder,
  createInitialVirtualPortfolioState,
  summarizeVirtualPortfolio,
  type VirtualPortfolioState,
} from "./virtualPortfolio";

describe("virtualPortfolio", () => {
  test("仮想保有を追加したら現金が減り保有数量が増える", () => {
    const result = applyVirtualOrder(createInitialVirtualPortfolioState(), {
      id: "order-1",
      symbol: "BTC",
      displayName: "Bitcoin",
      side: "buy",
      quantity: 0.5,
      priceUsd: 40_000,
      createdAt: "2026-05-07T00:00:00.000Z",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.state.cashUsd).toBe(80_000);
    expect(result.state.holdings).toEqual([
      {
        symbol: "BTC",
        displayName: "Bitcoin",
        quantity: 0.5,
        averageCostUsd: 40_000,
      },
    ]);
  });

  test("同じ銘柄を追加したら平均取得単価が加重平均になる", () => {
    const state: VirtualPortfolioState = {
      cashUsd: 80_000,
      holdings: [
        {
          symbol: "BTC",
          displayName: "Bitcoin",
          quantity: 0.5,
          averageCostUsd: 40_000,
        },
      ],
      transactions: [],
    };

    const result = applyVirtualOrder(state, {
      id: "order-2",
      symbol: "BTC",
      displayName: "Bitcoin",
      side: "buy",
      quantity: 0.5,
      priceUsd: 50_000,
      createdAt: "2026-05-07T00:01:00.000Z",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.state.holdings[0]?.quantity).toBe(1);
    expect(result.state.holdings[0]?.averageCostUsd).toBe(45_000);
  });

  test("仮想保有を減らしたら保有数量が減り現金が増える", () => {
    const state: VirtualPortfolioState = {
      cashUsd: 50_000,
      holdings: [
        {
          symbol: "ETH",
          displayName: "Ethereum",
          quantity: 2,
          averageCostUsd: 2_000,
        },
      ],
      transactions: [],
    };

    const result = applyVirtualOrder(state, {
      id: "order-3",
      symbol: "ETH",
      displayName: "Ethereum",
      side: "sell",
      quantity: 0.75,
      priceUsd: 2_400,
      createdAt: "2026-05-07T00:02:00.000Z",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.state.cashUsd).toBe(51_800);
    expect(result.state.holdings[0]?.quantity).toBe(1.25);
  });

  test("仮想現金を超える追加操作は失敗する", () => {
    const result = applyVirtualOrder(createInitialVirtualPortfolioState(), {
      id: "order-4",
      symbol: "BTC",
      displayName: "Bitcoin",
      side: "buy",
      quantity: 3,
      priceUsd: 40_000,
      createdAt: "2026-05-07T00:03:00.000Z",
    });

    expect(result).toEqual({ ok: false, error: "insufficient_cash" });
  });

  test("保有数量を超える減算操作は失敗する", () => {
    const result = applyVirtualOrder(createInitialVirtualPortfolioState(), {
      id: "order-5",
      symbol: "SOL",
      displayName: "Solana",
      side: "sell",
      quantity: 1,
      priceUsd: 100,
      createdAt: "2026-05-07T00:04:00.000Z",
    });

    expect(result).toEqual({ ok: false, error: "insufficient_holding" });
  });

  test("評価サマリーを作成したら市場価格で評価額と含み損益を計算する", () => {
    const summary = summarizeVirtualPortfolio(
      {
        cashUsd: 60_000,
        holdings: [
          {
            symbol: "BTC",
            displayName: "Bitcoin",
            quantity: 1,
            averageCostUsd: 40_000,
          },
        ],
        transactions: [],
      },
      new Map([["BTC", 45_000]]),
    );

    expect(summary.cashUsd).toBe(60_000);
    expect(summary.holdingsValueUsd).toBe(45_000);
    expect(summary.totalValueUsd).toBe(105_000);
    expect(summary.unrealizedPnlUsd).toBe(5_000);
    expect(summary.exposurePercent).toBe(42.86);
  });
});
