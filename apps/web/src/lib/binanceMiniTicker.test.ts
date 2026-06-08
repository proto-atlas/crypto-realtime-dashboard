import { describe, expect, test } from "vitest";
import { summarizeBinanceMiniTickerMessage } from "./binanceMiniTicker";

describe("summarizeBinanceMiniTickerMessage", () => {
  test("Binance miniTicker配列を渡したら追跡対象だけを要約する", () => {
    const summary = summarizeBinanceMiniTickerMessage(
      JSON.stringify([
        {
          e: "24hrMiniTicker",
          E: 1711843200000,
          s: "BTCUSDT",
          c: "70000.50",
          o: "69000.00",
          h: "71000.00",
          l: "68000.00",
          v: "1200.5",
          q: "84000000.25",
        },
        {
          e: "24hrMiniTicker",
          E: 1711843200000,
          s: "DOGEUSDT",
          c: "0.12",
          o: "0.11",
          h: "0.13",
          l: "0.10",
          v: "1",
          q: "1",
        },
      ]),
      "2026-05-06T00:00:00.000Z",
    );

    expect(summary).toEqual({
      source: "binance",
      payloadSize: 2,
      receivedAt: "2026-05-06T00:00:00.000Z",
      updates: [
        {
          symbol: "BTCUSDT",
          closePriceUsd: 70000.5,
          openPriceUsd: 69000,
          highPriceUsd: 71000,
          lowPriceUsd: 68000,
          baseVolume: 1200.5,
          quoteVolumeUsd: 84000000.25,
          eventTime: 1711843200000,
        },
      ],
    });
  });

  test("JSONではない文字列を渡したらnullを返す", () => {
    expect(summarizeBinanceMiniTickerMessage("not json")).toBeNull();
  });

  test("配列ではないJSONを渡したらnullを返す", () => {
    expect(summarizeBinanceMiniTickerMessage("{}")).toBeNull();
  });
});
