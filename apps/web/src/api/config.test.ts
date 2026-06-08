import { describe, expect, test } from "vitest";
import { normalizeBffOrigin, resolveBffOrigin } from "./config";

describe("normalizeBffOrigin", () => {
  test("末尾スラッシュを含むoriginを渡したら取り除く", () => {
    expect(normalizeBffOrigin("https://bff.example.test///")).toBe("https://bff.example.test");
  });

  test("空白だけを渡したら空文字を返す", () => {
    expect(normalizeBffOrigin("   ")).toBe("");
  });
});

describe("resolveBffOrigin", () => {
  test("明示されたBFF originがあればその値を優先する", () => {
    expect(
      resolveBffOrigin("https://bff.example.test/", "crypto-realtime-dashboard.pages.dev"),
    ).toBe("https://bff.example.test");
  });

  test("本番PagesでBFF originが空なら本番BFF Workerを返す", () => {
    expect(resolveBffOrigin("", "crypto-realtime-dashboard.pages.dev")).toBe(
      "https://crypto-realtime-dashboard-bff.atlas-lab.workers.dev",
    );
  });

  test("Pages preview hostでBFF originが空なら本番BFF Workerを返す", () => {
    expect(resolveBffOrigin("", "b8e00e4a.crypto-realtime-dashboard.pages.dev")).toBe(
      "https://crypto-realtime-dashboard-bff.atlas-lab.workers.dev",
    );
  });

  test("ローカルhostでBFF originが空なら相対API用に空文字を返す", () => {
    expect(resolveBffOrigin("", "localhost:5173")).toBe("");
  });
});
