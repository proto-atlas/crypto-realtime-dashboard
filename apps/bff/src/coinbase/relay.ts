import { DurableObject } from "cloudflare:workers";
import { isWebSocketUpgrade } from "../binance/stream";
import type { Bindings } from "../bindings";
import {
  COINBASE_MARKET_STREAM_URL,
  closeOpenCoinbaseRelayClients,
  createCoinbaseStatusMessage,
  createCoinbaseSubscribeMessage,
} from "./stream";

export class CoinbaseTickerRelay extends DurableObject<Bindings> {
  private upstream: WebSocket | null = null;

  async fetch(request: Request): Promise<Response> {
    if (!isWebSocketUpgrade(request)) {
      return new Response("Expected WebSocket upgrade.", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    server.send(createCoinbaseStatusMessage("connected"));
    this.ensureUpstream();

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  webSocketClose(ws: WebSocket, code: number, reason: string) {
    ws.close(code, reason);
    this.closeUpstreamIfIdle();
  }

  webSocketError(ws: WebSocket) {
    ws.close(1011, "Relay WebSocket error.");
    this.closeUpstreamIfIdle();
  }

  private ensureUpstream() {
    if (this.upstream !== null && this.upstream.readyState < WebSocket.CLOSING) {
      return;
    }

    const upstream = new WebSocket(COINBASE_MARKET_STREAM_URL);
    this.upstream = upstream;

    upstream.addEventListener("open", () => {
      upstream.send(createCoinbaseSubscribeMessage());
      this.broadcast(createCoinbaseStatusMessage("upstream_open"));
      this.broadcast(createCoinbaseStatusMessage("subscribed"));
    });

    upstream.addEventListener("message", (event) => {
      this.broadcast(event.data);
    });

    upstream.addEventListener("close", () => {
      this.handleUpstreamUnavailable(upstream);
    });

    upstream.addEventListener("error", () => {
      this.handleUpstreamUnavailable(upstream);
    });
  }

  private handleUpstreamUnavailable(upstream: WebSocket) {
    if (this.upstream !== upstream) {
      return;
    }

    this.upstream = null;
    this.broadcast(createCoinbaseStatusMessage("upstream_closed"));
    closeOpenCoinbaseRelayClients(this.ctx.getWebSockets());
  }

  private broadcast(message: string | ArrayBuffer) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  private closeUpstreamIfIdle() {
    if (this.ctx.getWebSockets().length > 0) {
      return;
    }

    this.upstream?.close(1000, "relay clientなし");
    this.upstream = null;
  }
}
