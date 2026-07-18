import type { CandlestickPoint, MarketDataResponse } from "@crypto-realtime-dashboard/shared-types";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DashboardPage, findSelectedChartPrice } from "./dashboard";

const navigateMock = vi.hoisted(() => vi.fn());
const searchState = vi.hoisted(() => ({ asset: "BTC" as const, interval: "1m" as const }));
const candlesState = vi.hoisted(
  (): {
    data: MarketDataResponse<CandlestickPoint[]> | undefined;
    isFetching: boolean;
    isError: boolean;
  } => ({ data: undefined, isFetching: false, isError: false }),
);
const marketDataState = vi.hoisted(() => ({
  mode: "demo" as "demo" | "rest" | "websocket",
  rows: [
    {
      symbol: "BTC" as const,
      displayName: "Bitcoin",
      priceUsd: 70_000,
      change24hPercent: 2.5,
      volume24hUsd: 25_000_000_000,
      updatedAt: "demo",
      sourceLabel: "デモ",
    },
    {
      symbol: "ETH" as const,
      displayName: "Ethereum",
      priceUsd: 3_500,
      change24hPercent: -1.25,
      volume24hUsd: 12_000_000_000,
      updatedAt: "demo",
      sourceLabel: "デモ",
    },
  ],
  marketStatus: "固定データ",
  modeLabel: "デモ",
  activeStreamLabel: "WebSocket",
  isMarketError: false,
  isStreamError: false,
  tickerStream: {
    status: "idle" as const,
    activeSource: null,
    fallbackReason: null,
    lastSummary: null,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useSearch: () => searchState,
}));

vi.mock("@/contexts/MarketDataContext", () => ({
  useMarketData: () => marketDataState,
}));

vi.mock("@/hooks/useMarketCandles", () => ({
  useMarketCandles: () => candlesState,
}));

vi.mock("@/components/CandlestickChart", () => ({
  CandlestickChart: () => <div>チャート描画済み</div>,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    searchState.asset = "BTC";
    searchState.interval = "1m";
    candlesState.data = undefined;
    candlesState.isFetching = false;
    candlesState.isError = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("選択中のBTC価格とローソク足見出しを表示する", async () => {
    render(<DashboardPage />);

    expect(screen.getByLabelText("BTCの現在価格")).toHaveTextContent("$70,000");
    expect(screen.getByRole("heading", { name: "BTC/USD ローソク足" })).toBeInTheDocument();
    expect(await screen.findByText("チャート描画済み")).toBeInTheDocument();
  });

  test("ETHを選んだらURL検索値の更新を要求する", () => {
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("option", { name: /ETH/ }));

    expect(navigateMock).toHaveBeenCalledWith({
      search: { asset: "ETH", interval: "1m" },
      replace: true,
    });
  });

  test("ローソク足APIがデモfallbackなら警告を表示する", () => {
    candlesState.data = {
      source: "demo",
      cache: "bypass",
      updatedAt: "2026-07-18T00:00:00.000Z",
      data: [],
    };
    marketDataState.mode = "rest";

    render(<DashboardPage />);

    expect(screen.getByText("Coinbaseローソク足を取得できません")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Coinbaseローソク足の取得に失敗しました。デモデータで表示を継続しています。",
      ),
    ).toBeInTheDocument();

    marketDataState.mode = "demo";
  });
});

describe("findSelectedChartPrice", () => {
  const updates = [
    { symbol: "BTC-USD", closePriceUsd: 70_000 },
    { symbol: "ETH-USD", closePriceUsd: 3_500 },
  ];

  test("Coinbase接続中なら選択ペアの価格を返す", () => {
    expect(findSelectedChartPrice("coinbase", "ETH-USD", updates)).toBe(3_500);
  });

  test("Binance予備経路ではCoinbaseローソク足へ価格を混ぜない", () => {
    expect(findSelectedChartPrice("binance", "BTC-USD", updates)).toBeNull();
  });
});
