import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { useVirtualPortfolioStore } from "@/stores/virtualPortfolioStore";
import type { MarketRow } from "./types";
import { VirtualPortfolioPanel } from "./VirtualPortfolioPanel";

const rows: readonly MarketRow[] = [
  {
    symbol: "BTC",
    displayName: "Bitcoin",
    priceUsd: 43_120.52,
    change24hPercent: 1.24,
    volume24hUsd: 18_240_000_000,
    updatedAt: "demo",
  },
  {
    symbol: "ETH",
    displayName: "Ethereum",
    priceUsd: 2_288.16,
    change24hPercent: -0.86,
    volume24hUsd: 9_350_000_000,
    updatedAt: "demo",
  },
];

describe("VirtualPortfolioPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    useVirtualPortfolioStore.getState().resetVirtualPortfolio();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("初期数量のまま追加実行ボタンを押したら保有数量と更新履歴を表示する", () => {
    render(<VirtualPortfolioPanel rows={rows} />);

    fireEvent.click(screen.getByRole("button", { name: "BTCを0.1追加する" }));

    expect(screen.getByText("BTCの仮想保有を追加しました。")).toBeInTheDocument();
    expect(screen.getByText("0.1000 単位")).toBeInTheDocument();
    expect(screen.getByText("BTCを追加")).toBeInTheDocument();
  });

  test("減らすを選んで実行したら保有不足メッセージを表示する", () => {
    render(<VirtualPortfolioPanel rows={rows} />);

    fireEvent.click(screen.getByRole("button", { name: "減らす", pressed: false }));
    fireEvent.click(screen.getByRole("button", { name: "BTCを0.1減らす" }));

    expect(screen.getByText("仮想保有数量が不足しています。")).toBeInTheDocument();
  });
});
