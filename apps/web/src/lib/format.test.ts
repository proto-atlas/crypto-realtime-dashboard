import { describe, expect, test } from "vitest";
import { formatCompactUsd, formatPercent, formatUsd } from "./format";

describe("formatUsd", () => {
  test("1000以上のUSDを渡したら小数なしの通貨表記を返す", () => {
    expect(formatUsd(43120.52)).toBe("$43,121");
  });

  test("1000未満のUSDを渡したら小数2桁までの通貨表記を返す", () => {
    expect(formatUsd(42.25)).toBe("$42.25");
  });
});

describe("formatCompactUsd", () => {
  test("大きなUSDを渡したら短縮通貨表記を返す", () => {
    expect(formatCompactUsd(1234567890)).toBe("$1.2B");
  });
});

describe("formatPercent", () => {
  test("正の数を渡したら先頭にプラス記号を付ける", () => {
    expect(formatPercent(1.234)).toBe("+1.23%");
  });

  test("負の数を渡したらマイナス記号のまま返す", () => {
    expect(formatPercent(-2.5)).toBe("-2.50%");
  });

  test("NaNを渡したらN/Aを返す", () => {
    expect(formatPercent(Number.NaN)).toBe("N/A");
  });
});
