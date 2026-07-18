import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getPriceDirection, LivePrice } from "./LivePrice";

afterEach(() => {
  vi.useRealTimers();
});

describe("getPriceDirection", () => {
  test("価格が上がったらupを返す", () => {
    expect(getPriceDirection(100, 101)).toBe("up");
  });

  test("価格が下がったらdownを返す", () => {
    expect(getPriceDirection(100, 99)).toBe("down");
  });

  test("同じ価格なら方向なしを返す", () => {
    expect(getPriceDirection(100, 100)).toBeNull();
  });
});

test("価格更新時だけ方向を表示し500ミリ秒後に解除する", () => {
  vi.useFakeTimers();
  const { rerender } = render(<LivePrice priceUsd={100} label="BTCの現在価格" />);

  rerender(<LivePrice priceUsd={101} label="BTCの現在価格" />);
  expect(screen.getByLabelText("BTCの現在価格")).toHaveAttribute("data-price-direction", "up");

  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByLabelText("BTCの現在価格")).toHaveAttribute(
    "data-price-direction",
    "unchanged",
  );
});
