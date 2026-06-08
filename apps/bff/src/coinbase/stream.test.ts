import { describe, expect, test } from "vitest";
import {
  createCoinbaseRelayName,
  createCoinbaseStatusMessage,
  createCoinbaseStreamPath,
  createCoinbaseSubscribeMessage,
} from "./stream";

describe("createCoinbaseRelayName", () => {
  test("固定のDurable Object名を返す", () => {
    expect(createCoinbaseRelayName()).toBe("coinbase-ticker-batch");
  });
});

describe("createCoinbaseStreamPath", () => {
  test("Coinbase relay用のAPI pathを返す", () => {
    expect(createCoinbaseStreamPath()).toBe("/api/ws/coinbase/ticker");
  });
});

describe("createCoinbaseSubscribeMessage", () => {
  test("ticker_batch channelの購読JSONを返す", () => {
    expect(JSON.parse(createCoinbaseSubscribeMessage())).toEqual({
      type: "subscribe",
      product_ids: ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"],
      channels: ["ticker_batch"],
    });
  });
});

describe("createCoinbaseStatusMessage", () => {
  test("relay状態をJSON文字列で返す", () => {
    expect(JSON.parse(createCoinbaseStatusMessage("subscribed"))).toEqual({
      type: "coinbase_relay_status",
      status: "subscribed",
      channel: "ticker_batch",
    });
  });
});
