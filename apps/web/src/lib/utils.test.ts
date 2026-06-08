import { describe, expect, test } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  test("複数のclassNameを渡したら空白区切りで結合する", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  test("競合するTailwind classNameを渡したら後勝ちで統合する", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
