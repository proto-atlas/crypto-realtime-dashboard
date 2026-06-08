export const INITIAL_VIRTUAL_CASH_USD = 100_000;
export const VIRTUAL_TRANSACTION_LIMIT = 12;

const QUANTITY_EPSILON = 1e-9;

export type VirtualOrderSide = "buy" | "sell";

export type VirtualHolding = {
  symbol: string;
  displayName: string;
  quantity: number;
  averageCostUsd: number;
};

export type VirtualTransaction = {
  id: string;
  symbol: string;
  side: VirtualOrderSide;
  quantity: number;
  priceUsd: number;
  totalUsd: number;
  createdAt: string;
};

export type VirtualPortfolioState = {
  cashUsd: number;
  holdings: readonly VirtualHolding[];
  transactions: readonly VirtualTransaction[];
};

export type VirtualOrderInput = {
  id: string;
  symbol: string;
  displayName: string;
  side: VirtualOrderSide;
  quantity: number;
  priceUsd: number;
  createdAt: string;
};

export type VirtualOrderError =
  | "invalid_quantity"
  | "invalid_price"
  | "insufficient_cash"
  | "insufficient_holding";

export type VirtualOrderResult =
  | { ok: true; state: VirtualPortfolioState }
  | { ok: false; error: VirtualOrderError };

export type VirtualHoldingSummary = VirtualHolding & {
  currentPriceUsd: number;
  marketValueUsd: number;
  costBasisUsd: number;
  unrealizedPnlUsd: number;
};

export type VirtualPortfolioSummary = {
  cashUsd: number;
  holdingsValueUsd: number;
  totalValueUsd: number;
  unrealizedPnlUsd: number;
  exposurePercent: number;
  holdings: readonly VirtualHoldingSummary[];
};

export function createInitialVirtualPortfolioState(): VirtualPortfolioState {
  return {
    cashUsd: INITIAL_VIRTUAL_CASH_USD,
    holdings: [],
    transactions: [],
  };
}

export function applyVirtualOrder(
  state: VirtualPortfolioState,
  order: VirtualOrderInput,
): VirtualOrderResult {
  if (!Number.isFinite(order.quantity) || order.quantity <= 0) {
    return { ok: false, error: "invalid_quantity" };
  }

  if (!Number.isFinite(order.priceUsd) || order.priceUsd <= 0) {
    return { ok: false, error: "invalid_price" };
  }

  const quantity = roundCryptoQuantity(order.quantity);
  const totalUsd = roundUsd(quantity * order.priceUsd);

  if (order.side === "buy") {
    if (totalUsd > state.cashUsd + QUANTITY_EPSILON) {
      return { ok: false, error: "insufficient_cash" };
    }

    return {
      ok: true,
      state: {
        cashUsd: roundUsd(state.cashUsd - totalUsd),
        holdings: upsertBoughtHolding(state.holdings, order, quantity, totalUsd),
        transactions: prependTransaction(state.transactions, order, quantity, totalUsd),
      },
    };
  }

  const currentHolding = state.holdings.find((holding) => holding.symbol === order.symbol);

  if (currentHolding === undefined || currentHolding.quantity + QUANTITY_EPSILON < quantity) {
    return { ok: false, error: "insufficient_holding" };
  }

  return {
    ok: true,
    state: {
      cashUsd: roundUsd(state.cashUsd + totalUsd),
      holdings: applySoldHolding(state.holdings, order.symbol, quantity),
      transactions: prependTransaction(state.transactions, order, quantity, totalUsd),
    },
  };
}

export function summarizeVirtualPortfolio(
  state: VirtualPortfolioState,
  priceBySymbol: ReadonlyMap<string, number>,
): VirtualPortfolioSummary {
  const holdings = state.holdings.map((holding) => {
    const currentPriceUsd = priceBySymbol.get(holding.symbol) ?? holding.averageCostUsd;
    const marketValueUsd = roundUsd(holding.quantity * currentPriceUsd);
    const costBasisUsd = roundUsd(holding.quantity * holding.averageCostUsd);

    return {
      ...holding,
      currentPriceUsd,
      marketValueUsd,
      costBasisUsd,
      unrealizedPnlUsd: roundUsd(marketValueUsd - costBasisUsd),
    };
  });
  const holdingsValueUsd = roundUsd(
    holdings.reduce((total, holding) => total + holding.marketValueUsd, 0),
  );
  const unrealizedPnlUsd = roundUsd(
    holdings.reduce((total, holding) => total + holding.unrealizedPnlUsd, 0),
  );
  const totalValueUsd = roundUsd(state.cashUsd + holdingsValueUsd);

  return {
    cashUsd: state.cashUsd,
    holdingsValueUsd,
    totalValueUsd,
    unrealizedPnlUsd,
    exposurePercent: totalValueUsd > 0 ? roundPercent((holdingsValueUsd / totalValueUsd) * 100) : 0,
    holdings,
  };
}

function upsertBoughtHolding(
  holdings: readonly VirtualHolding[],
  order: VirtualOrderInput,
  quantity: number,
  totalUsd: number,
) {
  const existing = holdings.find((holding) => holding.symbol === order.symbol);

  if (existing === undefined) {
    return [
      ...holdings,
      {
        symbol: order.symbol,
        displayName: order.displayName,
        quantity,
        averageCostUsd: order.priceUsd,
      },
    ];
  }

  const nextQuantity = roundCryptoQuantity(existing.quantity + quantity);
  const currentCostBasis = existing.quantity * existing.averageCostUsd;
  const nextAverageCostUsd = roundUsd((currentCostBasis + totalUsd) / nextQuantity);

  return holdings.map((holding) =>
    holding.symbol === order.symbol
      ? {
          ...holding,
          displayName: order.displayName,
          quantity: nextQuantity,
          averageCostUsd: nextAverageCostUsd,
        }
      : holding,
  );
}

function applySoldHolding(holdings: readonly VirtualHolding[], symbol: string, quantity: number) {
  return holdings.flatMap((holding) => {
    if (holding.symbol !== symbol) {
      return [holding];
    }

    const nextQuantity = roundCryptoQuantity(holding.quantity - quantity);

    return nextQuantity > QUANTITY_EPSILON ? [{ ...holding, quantity: nextQuantity }] : [];
  });
}

function prependTransaction(
  transactions: readonly VirtualTransaction[],
  order: VirtualOrderInput,
  quantity: number,
  totalUsd: number,
) {
  return [
    {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity,
      priceUsd: order.priceUsd,
      totalUsd,
      createdAt: order.createdAt,
    },
    ...transactions,
  ].slice(0, VIRTUAL_TRANSACTION_LIMIT);
}

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

function roundCryptoQuantity(value: number) {
  return Math.round(value * 100_000_000) / 100_000_000;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}
