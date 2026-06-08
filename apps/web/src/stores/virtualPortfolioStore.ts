import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  applyVirtualOrder,
  createInitialVirtualPortfolioState,
  type VirtualOrderError,
  type VirtualOrderInput,
  type VirtualPortfolioState,
} from "@/lib/virtualPortfolio";

type VirtualOrderStoreInput = Omit<VirtualOrderInput, "id" | "createdAt">;

type VirtualPortfolioStore = VirtualPortfolioState & {
  placeVirtualOrder: (
    order: VirtualOrderStoreInput,
  ) => { ok: true } | { ok: false; error: VirtualOrderError };
  resetVirtualPortfolio: () => void;
};

export const useVirtualPortfolioStore = create<VirtualPortfolioStore>()(
  persist(
    (set, get) => ({
      ...createInitialVirtualPortfolioState(),
      placeVirtualOrder: (order) => {
        const result = applyVirtualOrder(get(), {
          ...order,
          id: createVirtualTransactionId(),
          createdAt: new Date().toISOString(),
        });

        if (!result.ok) {
          return result;
        }

        set(result.state);

        return { ok: true };
      },
      resetVirtualPortfolio: () => set(createInitialVirtualPortfolioState()),
    }),
    {
      name: "crypto-realtime-dashboard-virtual-portfolio-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        cashUsd: state.cashUsd,
        holdings: state.holdings,
        transactions: state.transactions,
      }),
    },
  ),
);

function createVirtualTransactionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `virtual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
