import type { MarketDataMode } from "@crypto-realtime-dashboard/shared-types";
import { Cable } from "lucide-react";
import type { TickerStreamState } from "@/hooks/useMarketTickerStream";
import { Panel } from "./Panel";
import { StatusRow } from "./StatusRow";

export function ConnectionStatusPanel({
  dataMode,
  streamEnabled,
  activeStreamLabel,
  marketStatus,
  tickerStream,
}: {
  dataMode: MarketDataMode;
  streamEnabled: boolean;
  activeStreamLabel: string;
  marketStatus: string;
  tickerStream: TickerStreamState;
}) {
  return (
    <Panel title="Connection Status" icon={<Cable className="size-5" aria-hidden="true" />}>
      <div className="space-y-3">
        <StatusRow label="Active WS stream" value={`${activeStreamLabel} ${tickerStream.status}`} />
        <StatusRow
          label="WebSocket経路"
          value={tickerStream.activeSource === "binance" ? "Binance予備経路" : "Coinbase主経路"}
        />
        <StatusRow
          label="WebSocket payload"
          value={
            tickerStream.lastSummary === null
              ? "Waiting"
              : `${tickerStream.lastSummary.payloadSize} symbols`
          }
        />
        <StatusRow
          label="CoinGecko cached REST"
          value={dataMode === "live" ? marketStatus : "Ready"}
        />
        <StatusRow
          label="Cloudflare Durable Object"
          value={streamEnabled ? "Relay requested" : "Ready"}
        />
      </div>
    </Panel>
  );
}
