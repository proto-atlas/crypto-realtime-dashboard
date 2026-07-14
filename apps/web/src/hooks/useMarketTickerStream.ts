import { useEffect, useMemo, useState } from "react";
import { createBinanceTickerWebSocketUrl, createCoinbaseTickerWebSocketUrl } from "@/api/ws";
import {
  type BinanceMiniTickerSummary,
  summarizeBinanceMiniTickerMessage,
} from "@/lib/binanceMiniTicker";
import { type CoinbaseTickerSummary, summarizeCoinbaseTickerMessage } from "@/lib/coinbaseTicker";

export type TickerStreamStatus = "idle" | "connecting" | "open" | "closed" | "error";
export type TickerStreamSource = "coinbase" | "binance";
export type TickerStreamFallbackReason = "coinbase_closed" | "coinbase_error" | null;
export type TickerStreamSummary = CoinbaseTickerSummary | BinanceMiniTickerSummary;

export type TickerStreamState = {
  status: TickerStreamStatus;
  activeSource: TickerStreamSource | null;
  fallbackReason: TickerStreamFallbackReason;
  lastSummary: TickerStreamSummary | null;
};

export const COINBASE_RECOVERY_INTERVAL_MS = 30_000;

const initialState: TickerStreamState = {
  status: "idle",
  activeSource: null,
  fallbackReason: null,
  lastSummary: null,
};

const streamSymbolOrder = new Map([
  ["BTC-USD", 0],
  ["ETH-USD", 1],
  ["SOL-USD", 2],
  ["XRP-USD", 3],
  ["BTCUSDT", 0],
  ["ETHUSDT", 1],
  ["SOLUSDT", 2],
  ["XRPUSDT", 3],
]);

export function useMarketTickerStream(enabled: boolean) {
  const [state, setState] = useState<TickerStreamState>(initialState);
  const urls = useMemo(
    () => ({
      coinbase: createCoinbaseTickerWebSocketUrl(window.location),
      binance: createBinanceTickerWebSocketUrl(window.location),
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
    let recoverySocket: WebSocket | null = null;
    let recoveryTimer: ReturnType<typeof setInterval> | null = null;
    let isFallbackActive = false;
    let fallbackReason: TickerStreamFallbackReason = null;

    connectPrimaryCoinbase();

    function connectPrimaryCoinbase() {
      const socket = new WebSocket(urls.coinbase);
      activeSocket = socket;
      setState({
        status: "connecting",
        activeSource: "coinbase",
        fallbackReason: null,
        lastSummary: null,
      });

      socket.addEventListener("open", () => {
        if (!shouldHandleActiveSocket(socket)) {
          return;
        }

        setState((current) => ({ ...current, status: "open" }));
      });

      socket.addEventListener("message", (event) => {
        if (!shouldHandleActiveSocket(socket) || typeof event.data !== "string") {
          return;
        }

        const summary = summarizeCoinbaseTickerMessage(event.data);
        if (summary !== null) {
          applySummary("coinbase", summary);
        }
      });

      socket.addEventListener("close", () => {
        if (shouldHandleActiveSocket(socket)) {
          startBinanceFallback("coinbase_closed");
        }
      });

      socket.addEventListener("error", () => {
        if (shouldHandleActiveSocket(socket)) {
          startBinanceFallback("coinbase_error");
        }
      });
    }

    function startBinanceFallback(reason: Exclude<TickerStreamFallbackReason, null>) {
      if (!isActive || isFallbackActive) {
        return;
      }

      isFallbackActive = true;
      fallbackReason = reason;
      const socket = new WebSocket(urls.binance);
      activeSocket = socket;
      setState((current) => ({
        ...current,
        status: "connecting",
        activeSource: "binance",
        fallbackReason,
      }));

      socket.addEventListener("open", () => {
        if (shouldHandleActiveSocket(socket)) {
          setState((current) => ({ ...current, status: "open" }));
        }
      });

      socket.addEventListener("message", (event) => {
        if (!shouldHandleActiveSocket(socket) || typeof event.data !== "string") {
          return;
        }

        const summary = summarizeBinanceMiniTickerMessage(event.data);
        if (summary !== null) {
          applySummary("binance", summary);
        }
      });

      socket.addEventListener("close", () => {
        if (shouldHandleActiveSocket(socket)) {
          setState((current) => ({ ...current, status: "closed" }));
        }
      });

      socket.addEventListener("error", () => {
        if (shouldHandleActiveSocket(socket)) {
          setState((current) => ({ ...current, status: "error" }));
        }
      });

      recoveryTimer = setInterval(tryRecoverCoinbase, COINBASE_RECOVERY_INTERVAL_MS);
    }

    function tryRecoverCoinbase() {
      if (!isActive || !isFallbackActive || recoverySocket !== null) {
        return;
      }

      const socket = new WebSocket(urls.coinbase);
      recoverySocket = socket;

      socket.addEventListener("message", (event) => {
        if (!shouldHandleRecoverySocket(socket) || typeof event.data !== "string") {
          return;
        }

        const summary = summarizeCoinbaseTickerMessage(event.data);
        if (summary === null) {
          return;
        }

        const fallbackSocket = activeSocket;
        activeSocket = socket;
        recoverySocket = null;
        isFallbackActive = false;
        fallbackReason = null;
        clearRecoveryTimer();
        applySummary("coinbase", summary);

        if (fallbackSocket !== null && fallbackSocket !== socket) {
          fallbackSocket.close(1000, "Coinbase接続が復旧しました。");
        }
      });

      socket.addEventListener("close", () => {
        if (shouldHandleRecoverySocket(socket)) {
          recoverySocket = null;
          return;
        }

        if (shouldHandleActiveSocket(socket)) {
          startBinanceFallback("coinbase_closed");
        }
      });

      socket.addEventListener("error", () => {
        if (shouldHandleRecoverySocket(socket)) {
          recoverySocket = null;
          return;
        }

        if (shouldHandleActiveSocket(socket)) {
          startBinanceFallback("coinbase_error");
        }
      });
    }

    function applySummary(source: TickerStreamSource, summary: TickerStreamSummary) {
      setState((current) => ({
        status: "open",
        activeSource: source,
        fallbackReason,
        lastSummary: mergeTickerStreamSummary(current.lastSummary, summary),
      }));
    }

    function shouldHandleActiveSocket(socket: WebSocket) {
      return isActive && socket === activeSocket;
    }

    function shouldHandleRecoverySocket(socket: WebSocket) {
      return isActive && socket === recoverySocket;
    }

    function clearRecoveryTimer() {
      if (recoveryTimer !== null) {
        clearInterval(recoveryTimer);
        recoveryTimer = null;
      }
    }

    return () => {
      isActive = false;
      clearRecoveryTimer();
      activeSocket?.close(1000, "画面の接続を終了しました。");
      if (recoverySocket !== null && recoverySocket !== activeSocket) {
        recoverySocket.close(1000, "画面の接続を終了しました。");
      }
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

  if (previous.source === "coinbase" && next.source === "coinbase") {
    return {
      ...next,
      updates: mergeStreamUpdates(previous.updates, next.updates),
    };
  }

  if (previous.source === "binance" && next.source === "binance") {
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
