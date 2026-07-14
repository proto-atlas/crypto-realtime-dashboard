import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CandlestickPanel } from "./CandlestickPanel";

vi.mock("@/components/CandlestickChart", () => ({
  CandlestickChart: () => <div>チャート描画済み</div>,
}));

class SilentIntersectionObserver {
  observe() {
    return;
  }

  unobserve() {
    return;
  }

  disconnect() {
    return;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

describe("CandlestickPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("交差通知が発生しなくても遅延読み込みしたチャートを描画する", async () => {
    vi.stubGlobal("IntersectionObserver", SilentIntersectionObserver);

    render(
      <CandlestickPanel
        intervals={["1m"]}
        selectedInterval="1m"
        chartStatus="デモ用ローソク足"
        candles={[]}
        isStreamEnabled={false}
        isCandlesError={false}
        onSelectInterval={vi.fn()}
      />,
    );

    expect(await screen.findByText("チャート描画済み")).toBeInTheDocument();
  });
});
