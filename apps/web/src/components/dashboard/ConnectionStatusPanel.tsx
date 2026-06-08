import type { MarketDataMode } from "@crypto-realtime-dashboard/shared-types";
import { Cable } from "lucide-react";
import type { TickerStreamState } from "@/hooks/useBinanceTickerStream";
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
          label="切り替え先プロバイダー"
          value={tickerStream.activeSource === "coinbase" ? "Coinbase active" : "Coinbase standby"}
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
