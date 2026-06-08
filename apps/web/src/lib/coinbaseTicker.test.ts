import { describe, expect, test } from "vitest";
import { summarizeCoinbaseTickerMessage } from "./coinbaseTicker";

describe("summarizeCoinbaseTickerMessage", () => {
  test("Coinbase ticker messageを渡したら追跡対象を要約する", () => {
    const summary = summarizeCoinbaseTickerMessage(
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
      "2026-05-06T00:00:01.000Z",
    );

    expect(summary).toEqual({
      source: "coinbase",
      payloadSize: 1,
      receivedAt: "2026-05-06T00:00:01.000Z",
      updates: [
        {
          symbol: "BTC-USD",
          closePriceUsd: 70000.5,
          openPriceUsd: 69000,
          highPriceUsd: 71000,
          lowPriceUsd: 68000,
          baseVolume: 1200.5,
          quoteVolumeUsd: 84035600.25,
          eventTime: 1778025600000,
        },
      ],
    });
  });

  test("追跡対象ではないproduct_idならnullを返す", () => {
    const summary = summarizeCoinbaseTickerMessage(
      JSON.stringify({
        type: "ticker",
        product_id: "DOGE-USD",
        price: "0.12",
        open_24h: "0.11",
        high_24h: "0.13",
        low_24h: "0.10",
        volume_24h: "1",
        time: "2026-05-06T00:00:00.000Z",
      }),
    );

    expect(summary).toBeNull();
  });

  test("tickerではないmessageならnullを返す", () => {
    expect(summarizeCoinbaseTickerMessage('{"type":"subscriptions"}')).toBeNull();
  });

  test("JSONではない文字列を渡したらnullを返す", () => {
    expect(summarizeCoinbaseTickerMessage("not json")).toBeNull();
  });
});
