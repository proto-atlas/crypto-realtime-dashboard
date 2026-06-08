export type TradeSide = "buy" | "sell";
export type TradeStatus = "filled" | "canceled" | "rejected";

export type TradeHistoryRow = {
  id: string;
  executedAtMs: number;
  symbol: string;
  side: TradeSide;
  priceUsd: number;
  quantity: number;
  notionalUsd: number;
  feeUsd: number;
  venue: string;
  status: TradeStatus;
};

export type TradeHistorySummary = {
  totalRows: number;
  totalNotionalUsd: number;
  filledRows: number;
  rejectedRows: number;
  buyRows: number;
  sellRows: number;
};

type AssetSeed = {
  symbol: string;
  basePriceUsd: number;
  quantityBase: number;
  quantityPrecision: number;
};

const assetSeeds: readonly AssetSeed[] = [
  { symbol: "BTC/USDT", basePriceUsd: 94_200, quantityBase: 0.004, quantityPrecision: 5 },
  { symbol: "ETH/USDT", basePriceUsd: 3_240, quantityBase: 0.05, quantityPrecision: 4 },
  { symbol: "SOL/USDT", basePriceUsd: 142, quantityBase: 1.2, quantityPrecision: 3 },
  { symbol: "XRP/USDT", basePriceUsd: 0.63, quantityBase: 280, quantityPrecision: 1 },
  { symbol: "DOGE/USDT", basePriceUsd: 0.14, quantityBase: 1_800, quantityPrecision: 1 },
];

const venues = ["Binance Demo", "Coinbase Demo", "Kraken Demo", "Bitstamp Demo"] as const;
const statuses: readonly TradeStatus[] = ["filled", "filled", "filled", "canceled", "rejected"];
const sides: readonly TradeSide[] = ["buy", "sell"];
const baseExecutedAtMs = Date.UTC(2026, 4, 1, 9, 0, 0);
const tradeSpacingMs = 37_000;

export const TRADE_HISTORY_ROW_COUNT = 100_000;

export function createTradeHistoryRows(count = TRADE_HISTORY_ROW_COUNT): TradeHistoryRow[] {
  if (count <= 0) {
    return [];
  }

  const rows = new Array<TradeHistoryRow>(count);

  for (let index = 0; index < count; index += 1) {
    const asset = assetSeeds[index % assetSeeds.length];
    const wave = Math.sin(index * 0.017 + asset.basePriceUsd * 0.0001);
    const drift = ((index % 89) - 44) * 0.00018;
    const priceUsd = roundDecimal(asset.basePriceUsd * (1 + wave * 0.018 + drift), 2);
    const quantity = roundDecimal(
      asset.quantityBase * (1 + (index % 29) * 0.19),
      asset.quantityPrecision,
    );
    const notionalUsd = roundDecimal(priceUsd * quantity, 2);
    const status = statuses[index % statuses.length];
    const feeUsd = status === "filled" ? roundDecimal(notionalUsd * 0.0006, 2) : 0;

    rows[index] = {
      id: `TRD-${String(index + 1).padStart(6, "0")}`,
      executedAtMs: baseExecutedAtMs - index * tradeSpacingMs,
      symbol: asset.symbol,
      side: sides[(index + Math.floor(index / 7)) % sides.length],
      priceUsd,
      quantity,
      notionalUsd,
      feeUsd,
      venue: venues[index % venues.length],
      status,
    };
  }

  return rows;
}

export function summarizeTradeHistory(rows: readonly TradeHistoryRow[]): TradeHistorySummary {
  return rows.reduce<TradeHistorySummary>(
    (summary, row) => ({
      totalRows: summary.totalRows + 1,
      totalNotionalUsd: roundDecimal(summary.totalNotionalUsd + row.notionalUsd, 2),
      filledRows: row.status === "filled" ? summary.filledRows + 1 : summary.filledRows,
      rejectedRows: row.status === "rejected" ? summary.rejectedRows + 1 : summary.rejectedRows,
      buyRows: row.side === "buy" ? summary.buyRows + 1 : summary.buyRows,
      sellRows: row.side === "sell" ? summary.sellRows + 1 : summary.sellRows,
    }),
    {
      totalRows: 0,
      totalNotionalUsd: 0,
      filledRows: 0,
      rejectedRows: 0,
      buyRows: 0,
      sellRows: 0,
    },
  );
}

export function matchesTradeSearch(row: TradeHistoryRow, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return true;
  }

  return [row.id, row.symbol, row.side, row.status, row.venue].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

function roundDecimal(value: number, fractionDigits: number) {
  const factor = 10 ** fractionDigits;

  return Math.round((value + Number.EPSILON) * factor) / factor;
}
