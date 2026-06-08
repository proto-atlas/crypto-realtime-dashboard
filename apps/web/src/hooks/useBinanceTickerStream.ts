import { useEffect, useMemo, useState } from "react";
import { createBinanceTickerWebSocketUrl, createCoinbaseTickerWebSocketUrl } from "@/api/ws";
import {
  type BinanceMiniTickerSummary,
  summarizeBinanceMiniTickerMessage,
} from "@/lib/binanceMiniTicker";
import { type CoinbaseTickerSummary, summarizeCoinbaseTickerMessage } from "@/lib/coinbaseTicker";

export type TickerStreamStatus = "idle" | "connecting" | "open" | "closed" | "error";
export type TickerStreamSource = "binance" | "coinbase";
export type TickerStreamFallbackReason = "binance_closed" | "binance_error" | null;
export type TickerStreamSummary = BinanceMiniTickerSummary | CoinbaseTickerSummary;

export type TickerStreamState = {
  status: TickerStreamStatus;
  activeSource: TickerStreamSource | null;
  fallbackReason: TickerStreamFallbackReason;
  lastSummary: TickerStreamSummary | null;
};

const initialState: TickerStreamState = {
  status: "idle",
  activeSource: null,
  fallbackReason: null,
  lastSummary: null,
};

const streamSymbolOrder = new Map([
  ["BTCUSDT", 0],
  ["ETHUSDT", 1],
  ["SOLUSDT", 2],
  ["XRPUSDT", 3],
  ["BTC-USD", 0],
  ["ETH-USD", 1],
  ["SOL-USD", 2],
  ["XRP-USD", 3],
]);

export function useBinanceTickerStream(enabled: boolean) {
  const [state, setState] = useState<TickerStreamState>(initialState);
  const urls = useMemo(
    () => ({
      binance: createBinanceTickerWebSocketUrl(window.location),
      coinbase: createCoinbaseTickerWebSocketUrl(window.location),
    }),
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setState(initialState);
      return;
    }

    let isActive = true;
    let activeSocket: WebSocket | null = null;
    let fallbackReason: TickerStreamFallbackReason = null;

    connect("binance");

    function connect(source: TickerStreamSource) {
      const socket = new WebSocket(urls[source]);
      activeSocket = socket;
      setState((current) => ({
        status: "connecting",
        activeSource: source,
        fallbackReason,
        lastSummary: source === "coinbase" ? current.lastSummary : null,
      }));

      socket.addEventListener("open", () => {
        if (!shouldHandle(socket)) {
          return;
        }

        setState((current) => ({ ...current, status: "open", activeSource: source }));
      });

      socket.addEventListener("message", (event) => {
        if (!shouldHandle(socket) || typeof event.data !== "string") {
          return;
        }

        const summary =
          source === "binance"
            ? summarizeBinanceMiniTickerMessage(event.data)
            : summarizeCoinbaseTickerMessage(event.data);

        if (summary !== null) {
          setState((current) => ({
            status: "open",
            activeSource: source,
            fallbackReason,
            lastSummary: mergeTickerStreamSummary(current.lastSummary, summary),
          }));
        }
      });

      socket.addEventListener("close", () => {
        if (!shouldHandle(socket)) {
          return;
        }

        if (source === "binance") {
          fallbackReason = "binance_closed";
          connect("coinbase");
          return;
        }

        setState((current) => ({ ...current, status: "closed" }));
      });

      socket.addEventListener("error", () => {
        if (!shouldHandle(socket)) {
          return;
        }

        if (source === "binance") {
          fallbackReason = "binance_error";
          connect("coinbase");
          return;
        }

        setState((current) => ({ ...current, status: "error" }));
      });
    }

    function shouldHandle(socket: WebSocket) {
      return isActive && socket === activeSocket;
    }

    return () => {
      isActive = false;
      activeSocket?.close(1000, "Component unmounted.");
    };
  }, [enabled, urls]);

  return state;
}

function mergeTickerStreamSummary(
  previous: TickerStreamSummary | null,
  next: TickerStreamSummary,
): TickerStreamSummary {
  if (previous === null || previous.source !== next.source) {
    return next;
  }

  if (previous.source === "binance" && next.source === "binance") {
    return {
      ...next,
      updates: mergeStreamUpdates(previous.updates, next.updates),
    };
  }

  if (previous.source === "coinbase" && next.source === "coinbase") {
    return {
      ...next,
      updates: mergeStreamUpdates(previous.updates, next.updates),
    };
  }

  return next;
}

function mergeStreamUpdates<TUpdate extends { symbol: string }>(
  previousUpdates: readonly TUpdate[],
  nextUpdates: readonly TUpdate[],
) {
  const updatesBySymbol = new Map<string, TUpdate>();

  for (const update of previousUpdates) {
    updatesBySymbol.set(update.symbol, update);
  }

  for (const update of nextUpdates) {
    updatesBySymbol.set(update.symbol, update);
  }

  return Array.from(updatesBySymbol.values()).sort(compareStreamSymbols);
}

function compareStreamSymbols(left: { symbol: string }, right: { symbol: string }) {
  const leftOrder = streamSymbolOrder.get(left.symbol) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = streamSymbolOrder.get(right.symbol) ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.symbol.localeCompare(right.symbol);
}
