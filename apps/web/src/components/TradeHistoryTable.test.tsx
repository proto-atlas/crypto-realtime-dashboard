import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { TradeHistoryTable } from "./TradeHistoryTable";

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

    expect(getColumnHeaderByText("Time (UTC)")).toHaveAttribute("aria-sort", "descending");
    expect(getColumnHeaderByText("Price")).toHaveAttribute("aria-sort", "none");
  });

  test("Trade ID固定ボタンを押したらaria-pressedが切り替わる", () => {
    render(<TradeHistoryTable />);

    const toggleButton = screen.getByRole("button", { name: "Trade ID固定" });

    expect(toggleButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute("aria-pressed", "false");
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
