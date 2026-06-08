import type {
  CandlestickPoint,
  CoinMarket,
  MarketDataResponse,
} from "@crypto-realtime-dashboard/shared-types";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { TickerStreamState } from "@/hooks/useBinanceTickerStream";
import { DashboardPage } from "./dashboard";

type QueryState<TData> = {
  data: TData | undefined;
  isFetching: boolean;
  isError: boolean;
};

type HookState = {
  coinMarkets: QueryState<MarketDataResponse<CoinMarket[]>>;
  klines: QueryState<MarketDataResponse<CandlestickPoint[]>>;
  tickerStream: TickerStreamState;
};

const hookState = vi.hoisted(
  (): HookState => ({
    coinMarkets: {
      data: undefined,
      isFetching: false,
      isError: false,
    },
    klines: {
      data: undefined,
      isFetching: false,
      isError: false,
    },
    tickerStream: {
      status: "idle",
      activeSource: null,
      fallbackReason: null,
      lastSummary: null,
    },
  }),
);

vi.mock("@/hooks/useCoinMarkets", () => ({
  useCoinMarkets: () => hookState.coinMarkets,
}));

vi.mock("@/hooks/useBinanceKlines", () => ({
  useBinanceKlines: () => hookState.klines,
}));

// 接続の状態遷移はhook単体で確認し、このテストでは表示状態だけを固定する。
vi.mock("@/hooks/useBinanceTickerStream", () => ({
  useBinanceTickerStream: () => hookState.tickerStream,
}));

class StableIntersectionObserver {
  observe() {
    return;
  }

  unobserve() {
    return;
  }

  disconnect() {
    return;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

describe("DashboardPage", () => {
  beforeEach(() => {
    hookState.coinMarkets = createCoinMarketsState();
    hookState.klines = createKlinesState();
    hookState.tickerStream = createTickerStreamState();
    vi.stubGlobal("IntersectionObserver", StableIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("REST連携ボタンを押したらMarket Watchの状態表示がREST連携になる", () => {
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "REST連携" }));

    expect(screen.getByText("REST取得データ / REST連携")).toBeInTheDocument();
  });

  test("REST連携で市場データを受け取ったら通貨名と価格を表示する", () => {
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "REST連携" }));

    expect(screen.getByText("Bitcoin Test")).toBeInTheDocument();
    expect(screen.getByText("$91,235")).toBeInTheDocument();
  });

  test("WebSocket連携ボタンを押したらWebSocketの接続状態を表示する", () => {
    hookState.tickerStream = createTickerStreamState({
      status: "open",
      activeSource: "binance",
      lastSummary: {
        source: "binance",
        payloadSize: 2,
        receivedAt: "2026-05-07T00:00:00.000Z",
        updates: [
          {
            symbol: "BTCUSDT",
            closePriceUsd: 93_400,
            openPriceUsd: 92_000,
            highPriceUsd: 94_100,
            lowPriceUsd: 91_800,
            baseVolume: 140,
            quoteVolumeUsd: 12_500_000,
            eventTime: 1_778_112_000_000,
          },
        ],
      },
    });
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "WebSocket連携" }));

    expect(
      screen.getByText("Binanceマーケットデータをストリーミング中 / WebSocket連携 (Binance)"),
    ).toBeInTheDocument();
  });
});

function createCoinMarketsState(): QueryState<MarketDataResponse<CoinMarket[]>> {
  return {
    data: {
      source: "coingecko",
      cache: "hit",
      updatedAt: "2026-05-07T00:00:00.000Z",
      data: [
        {
          id: "bitcoin",
          symbol: "btc",
          // 初期表示のデモモードとREST連携表示を区別するためのfixture名。
          name: "Bitcoin Test",
          image: null,
          currentPriceUsd: 91_234.56,
          marketCapUsd: 1_800_000_000_000,
          marketCapRank: 1,
          totalVolumeUsd: 42_000_000_000,
          priceChangePercentage24h: 1.23,
          lastUpdated: "coingecko fixture",
        },
      ],
    },
    isFetching: false,
    isError: false,
  };
}

function createKlinesState(): QueryState<MarketDataResponse<CandlestickPoint[]>> {
  return {
    data: undefined,
    isFetching: false,
    isError: false,
  };
}

function createTickerStreamState(overrides: Partial<TickerStreamState> = {}): TickerStreamState {
  return {
    status: "idle",
    activeSource: null,
    fallbackReason: null,
    lastSummary: null,
    ...overrides,
  };
}
