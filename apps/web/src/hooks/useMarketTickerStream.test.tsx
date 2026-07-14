import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { COINBASE_RECOVERY_INTERVAL_MS, useMarketTickerStream } from "./useMarketTickerStream";

class MockWebSocket extends EventTarget {
  static instances: MockWebSocket[] = [];

  readonly url: string;

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.dispatchEvent(new CloseEvent("close"));
  }

  send() {
    return;
  }

  open() {
    this.dispatchEvent(new Event("open"));
  }

  fail() {
    this.dispatchEvent(new Event("error"));
  }

  receive(data: string) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

function StreamProbe({ enabled }: { enabled: boolean }) {
  const state = useMarketTickerStream(enabled);
  const summarySource = state.lastSummary?.source ?? "none";
  const updateCount = state.lastSummary?.updates.length ?? 0;
  const updateSymbols =
    state.lastSummary?.updates.map((update) => update.symbol).join(",") ?? "none";

  return (
    <div>
      <p data-testid="status">{state.status}</p>
      <p data-testid="active-source">{state.activeSource ?? "none"}</p>
      <p data-testid="fallback-reason">{state.fallbackReason ?? "none"}</p>
      <p data-testid="summary-source">{summarySource}</p>
      <p data-testid="update-count">{updateCount}</p>
      <p data-testid="update-symbols">{updateSymbols}</p>
    </div>
  );
}

describe("useMarketTickerStream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("開始時はCoinbaseへ接続する", () => {
    render(<StreamProbe enabled={true} />);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toBe("ws://localhost:3000/api/ws/coinbase/ticker");
    expect(screen.getByTestId("active-source")).toHaveTextContent("coinbase");
  });

  test("Coinbase接続がerrorになったらBinanceへ切り替える", () => {
    render(<StreamProbe enabled={true} />);

    act(() => {
      MockWebSocket.instances[0]?.fail();
    });

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1]?.url).toBe("ws://localhost:3000/api/ws/binance/ticker");
    expect(screen.getByTestId("active-source")).toHaveTextContent("binance");
    expect(screen.getByTestId("fallback-reason")).toHaveTextContent("coinbase_error");
  });

  test("30秒後のCoinbase接続は有効ticker受信後にだけ切り戻す", () => {
    render(<StreamProbe enabled={true} />);

    act(() => {
      MockWebSocket.instances[0]?.fail();
      MockWebSocket.instances[1]?.open();
    });

    act(() => {
      vi.advanceTimersByTime(COINBASE_RECOVERY_INTERVAL_MS);
    });

    expect(MockWebSocket.instances).toHaveLength(3);
    expect(MockWebSocket.instances[2]?.url).toBe("ws://localhost:3000/api/ws/coinbase/ticker");

    act(() => {
      MockWebSocket.instances[2]?.open();
    });
    expect(screen.getByTestId("active-source")).toHaveTextContent("binance");

    act(() => {
      MockWebSocket.instances[2]?.receive(createCoinbaseTickerMessage());
    });

    expect(screen.getByTestId("active-source")).toHaveTextContent("coinbase");
    expect(screen.getByTestId("fallback-reason")).toHaveTextContent("none");
    expect(screen.getByTestId("summary-source")).toHaveTextContent("coinbase");
  });

  test("Binanceの次回payloadにない銘柄もlast-known更新として保持する", () => {
    render(<StreamProbe enabled={true} />);

    act(() => {
      MockWebSocket.instances[0]?.fail();
      MockWebSocket.instances[1]?.open();
      MockWebSocket.instances[1]?.receive(
        createBinanceTickerMessage([
          createBinanceTicker("BTCUSDT", "70000.00"),
          createBinanceTicker("ETHUSDT", "3600.00"),
        ]),
      );
    });

    expect(screen.getByTestId("update-count")).toHaveTextContent("2");

    act(() => {
      MockWebSocket.instances[1]?.receive(
        createBinanceTickerMessage([createBinanceTicker("BTCUSDT", "70100.00")]),
      );
    });

    expect(screen.getByTestId("update-symbols")).toHaveTextContent("BTCUSDT,ETHUSDT");
  });

  test("両方の接続が停止しても直近のBinance更新を保持する", () => {
    render(<StreamProbe enabled={true} />);

    act(() => {
      MockWebSocket.instances[0]?.fail();
      MockWebSocket.instances[1]?.open();
      MockWebSocket.instances[1]?.receive(
        createBinanceTickerMessage([createBinanceTicker("BTCUSDT", "70000.00")]),
      );
      MockWebSocket.instances[1]?.fail();
    });

    expect(screen.getByTestId("status")).toHaveTextContent("error");
    expect(screen.getByTestId("summary-source")).toHaveTextContent("binance");
    expect(screen.getByTestId("update-count")).toHaveTextContent("1");
  });
});

function createCoinbaseTickerMessage() {
  return JSON.stringify({
    type: "ticker",
    product_id: "BTC-USD",
    price: "70000.50",
    open_24h: "69000.00",
    high_24h: "71000.00",
    low_24h: "68000.00",
    volume_24h: "1200.5",
    time: "2026-05-06T00:00:00.000Z",
  });
}

function createBinanceTicker(symbol: string, closePrice: string) {
  return {
    s: symbol,
    c: closePrice,
    o: "69000.00",
    h: "71000.00",
    l: "68000.00",
    v: "1000.00",
    q: "70000000.00",
    E: 1_778_185_600_000,
  };
}

function createBinanceTickerMessage(tickers: ReturnType<typeof createBinanceTicker>[]) {
  return JSON.stringify(tickers);
}
