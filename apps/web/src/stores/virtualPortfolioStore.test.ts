import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { INITIAL_VIRTUAL_CASH_USD } from "@/lib/virtualPortfolio";
import { useVirtualPortfolioStore } from "./virtualPortfolioStore";

describe("virtualPortfolioStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useVirtualPortfolioStore.getState().resetVirtualPortfolio();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("仮想ポジションを更新したらstoreの現金と保有数量が更新される", () => {
    const result = useVirtualPortfolioStore.getState().placeVirtualOrder({
      symbol: "BTC",
      displayName: "Bitcoin",
      side: "buy",
      quantity: 0.25,
      priceUsd: 40_000,
    });

    expect(result).toEqual({ ok: true });
    expect(useVirtualPortfolioStore.getState().cashUsd).toBe(90_000);
    expect(useVirtualPortfolioStore.getState().holdings).toEqual([
      {
        symbol: "BTC",
        displayName: "Bitcoin",
        quantity: 0.25,
        averageCostUsd: 40_000,
      },
    ]);
  });

  test("リセットしたら初期の仮想現金へ戻る", () => {
    useVirtualPortfolioStore.getState().placeVirtualOrder({
      symbol: "ETH",
      displayName: "Ethereum",
      side: "buy",
      quantity: 1,
      priceUsd: 2_000,
    });

    useVirtualPortfolioStore.getState().resetVirtualPortfolio();

    expect(useVirtualPortfolioStore.getState().cashUsd).toBe(INITIAL_VIRTUAL_CASH_USD);
    expect(useVirtualPortfolioStore.getState().holdings).toEqual([]);
    expect(useVirtualPortfolioStore.getState().transactions).toEqual([]);
  });
});
