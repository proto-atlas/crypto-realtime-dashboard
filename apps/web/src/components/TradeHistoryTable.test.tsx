import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { getFilterOptionLabel, TradeHistoryTable } from "./TradeHistoryTable";

vi.mock("@/lib/tradeHistory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tradeHistory")>();

  return {
    ...actual,
    createTradeHistoryRows: () => actual.createTradeHistoryRows(30),
  };
});

describe("TradeHistoryTable", () => {
  test("30件の取引履歴を表示したらaria-rowcountがヘッダー行込みの31になる", () => {
    render(<TradeHistoryTable />);

    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "31");
  });

  test("ソート可能列はaria-sortで現在の状態を伝える", () => {
    render(<TradeHistoryTable />);

    expect(getColumnHeaderByText("時刻 (UTC)")).toHaveAttribute("aria-sort", "descending");
    expect(getColumnHeaderByText("価格")).toHaveAttribute("aria-sort", "none");
  });

  test("Trade ID固定ボタンを押したらaria-pressedが切り替わる", () => {
    render(<TradeHistoryTable />);

    const toggleButton = screen.getByRole("button", { name: "Trade ID固定" });

    expect(toggleButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute("aria-pressed", "false");
  });
});

describe("getFilterOptionLabel", () => {
  test("allは絞り込み項目を含む日本語で返す", () => {
    expect(getFilterOptionLabel("ペア", "all")).toBe("すべてのペア");
  });

  test("売買と状態の内部値を日本語へ変換する", () => {
    expect([getFilterOptionLabel("売買", "buy"), getFilterOptionLabel("状態", "filled")]).toEqual([
      "買い",
      "約定",
    ]);
  });
});

function getColumnHeaderByText(text: string): HTMLElement {
  const header = screen
    .getAllByRole("columnheader")
    .find((element) => element.textContent?.includes(text) ?? false);

  if (header === undefined) {
    throw new Error(`Column header was not found: ${text}`);
  }

  return header;
}
