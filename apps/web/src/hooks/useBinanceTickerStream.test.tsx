import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useBinanceTickerStream } from "./useBinanceTickerStream";

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
  const state = useBinanceTickerStream(enabled);
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

describe("useBinanceTickerStream", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("Binance接続がerrorになったらCoinbaseへfallbackする", async () => {
    render(<StreamProbe enabled={true} />);

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    expect(MockWebSocket.instances[0].url).toBe("ws://localhost:3000/api/ws/binance/ticker");

    act(() => {
      MockWebSocket.instances[0].fail();
    });

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(2));
    expect(MockWebSocket.instances[1].url).toBe("ws://localhost:3000/api/ws/coinbase/ticker");
    expect(screen.getByTestId("fallback-reason")).toHaveTextContent("binance_error");

    act(() => {
      MockWebSocket.instances[1].open();
      MockWebSocket.instances[1].receive(
        JSON.stringify({
          type: "ticker",
          product_id: "BTC-USD",
          price: "70000.50",
          open_24h: "69000.00",
          high_24h: "71000.00",
          low_24h: "68000.00",
          volume_24h: "1200.5",
          time: "2026-05-06T00:00:00.000Z",
        }),
      );
    });

    await waitFor(() => expect(screen.getByTestId("summary-source")).toHaveTextContent("coinbase"));
    expect(screen.getByTestId("status")).toHaveTextContent("open");
    expect(screen.getByTestId("active-source")).toHaveTextContent("coinbase");
    expect(screen.getByTestId("update-count")).toHaveTextContent("1");
  });

  test("Binanceの次回payloadに含まれない銘柄もlast-known更新として保持する", async () => {
    render(<StreamProbe enabled={true} />);

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(
        JSON.stringify([
          {
            s: "BTCUSDT",
            c: "70000.00",
            o: "69000.00",
            h: "71000.00",
            l: "68000.00",
            v: "1000.00",
            q: "70000000.00",
            E: 1_778_185_600_000,
          },
          {
            s: "ETHUSDT",
            c: "3600.00",
            o: "3500.00",
            h: "3700.00",
            l: "3400.00",
            v: "9000.00",
            q: "32400000.00",
            E: 1_778_185_600_000,
          },
        ]),
      );
    });

    await waitFor(() => expect(screen.getByTestId("update-count")).toHaveTextContent("2"));
    expect(screen.getByTestId("update-symbols")).toHaveTextContent("BTCUSDT,ETHUSDT");

    act(() => {
      MockWebSocket.instances[0].receive(
        JSON.stringify([
          {
            s: "BTCUSDT",
            c: "70100.00",
            o: "69000.00",
            h: "71000.00",
            l: "68000.00",
            v: "1001.00",
            q: "70170100.00",
            E: 1_778_185_601_000,
          },
        ]),
      );
    });

    await waitFor(() => expect(screen.getByTestId("update-count")).toHaveTextContent("2"));
    expect(screen.getByTestId("update-symbols")).toHaveTextContent("BTCUSDT,ETHUSDT");
  });
});
