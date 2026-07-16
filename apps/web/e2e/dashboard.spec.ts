import { expect, type Page, test } from "@playwright/test";

type RuntimeObservation = {
  consoleErrors: string[];
  pageErrors: string[];
  apiRequests: string[];
};

test("デモモード初期表示では主要パネルを表示し外部APIを呼ばない", async ({ page }) => {
  const runtime = observeRuntime(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "公開マーケットデータ監視UI" })).toBeVisible();
  await expect(page.getByText("固定データ / デモ")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Market Watch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "BTC/USD ローソク足" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Connection Status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "取引履歴ラボ" })).toBeVisible();
  expect(runtime.apiRequests).toEqual([]);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test("デモモード初期表示でローソク足チャートのcanvasを描画する", async ({ page }) => {
  await page.goto("/");

  const chart = page.getByTestId("candlestick-chart");
  await expect(chart).toBeVisible();
  await expect(chart.locator("canvas").first()).toBeVisible();
});

test("テーマ切替はdark表示を適用しリロード後も保持する", async ({ page }) => {
  const runtime = observeRuntime(page);

  await page.goto("/");

  const documentRoot = page.locator("html");
  await expect(documentRoot).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Switch to dark theme" }).click();

  await expect(documentRoot).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();

  await page.reload();

  await expect(documentRoot).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  expect(runtime.apiRequests).toEqual([]);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test("取引履歴ラボで検索と仮想スクロールを操作できる", async ({ page }) => {
  const runtime = observeRuntime(page);

  await page.goto("/");
  await page.getByRole("heading", { name: "取引履歴ラボ" }).scrollIntoViewIfNeeded();

  const searchInput = page.getByRole("searchbox", { name: "Search trades" });
  await expect(searchInput).toBeVisible();
  await expect(page.getByText(/Visible:\s*100,000/)).toBeVisible();

  const tradeHistoryTable = page.getByRole("table").filter({ hasText: "Trade ID" });
  const firstRenderedRow = tradeHistoryTable.locator("tbody tr").first();
  await expect(firstRenderedRow).toContainText("TRD-000001");

  await searchInput.fill("ETH");
  await expect(page.getByText(/Visible:\s*20,000/)).toBeVisible();
  await expect(firstRenderedRow).toContainText("ETH/USDT");

  const rowTextBeforeScroll = await firstRenderedRow.textContent();
  await tradeHistoryTable.locator("xpath=..").evaluate((element) => {
    element.scrollTop = element.scrollHeight / 4;
  });

  await expect(firstRenderedRow).not.toHaveText(rowTextBeforeScroll ?? "");
  expect(runtime.apiRequests).toEqual([]);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test("仮想ポートフォリオで初期数量のまま追加操作を実行できる", async ({ page }) => {
  const runtime = observeRuntime(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "仮想ポートフォリオ" })).toBeVisible();
  await expect(page.getByLabel("数量")).toHaveValue("0.1");
  await page.getByRole("button", { name: "BTCを0.1追加する" }).click();

  await expect(page.getByText("BTCの仮想保有を追加しました。")).toBeVisible();
  await expect(page.getByText("0.1000 単位")).toBeVisible();
  await expect(page.getByText("BTCを追加")).toBeVisible();
  await page.reload();
  await expect(page.getByText("0.1000 単位")).toBeVisible();
  await expect(page.getByText("BTCを追加")).toBeVisible();
  expect(runtime.apiRequests).toEqual([]);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test("仮想ポートフォリオの数量入力でEnterを押して追加できる", async ({ page }) => {
  const runtime = observeRuntime(page);

  await page.goto("/");

  await page.getByLabel("数量").press("Enter");

  await expect(page.getByText("BTCの仮想保有を追加しました。")).toBeVisible();
  await expect(page.getByText("0.1000 単位")).toBeVisible();
  expect(runtime.apiRequests).toEqual([]);
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test("localStorageを利用できなくても仮想ポートフォリオを操作できる", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Storage access is disabled.", "SecurityError");
      },
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "仮想ポートフォリオ" })).toBeVisible();
  await page.getByRole("button", { name: "BTCを0.1追加する" }).click();
  await expect(page.getByText("BTCの仮想保有を追加しました。")).toBeVisible();
  await expect(page.getByText("0.1000 単位")).toBeVisible();
});

test("仮想保有の操作グループと選択状態を識別できる", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("group", { name: "操作" })).toBeVisible();
  await expect(page.getByRole("button", { name: "追加", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "減らす", pressed: false })).toBeVisible();
});

test("Coinbase WSが失敗したらBinanceへ切り替えMarket Watchの4行を維持する", async ({ page }) => {
  const runtime = observeRuntime(page);
  await mockTickerWebSocketFallback(page);
  await mockMarketCandlesResponse(page);

  await page.goto("/");
  await page.getByRole("button", { name: "WebSocket連携" }).click();

  await expect(
    page.getByText("Binanceマーケットデータをストリーミング中 / WebSocket連携 (Binance)"),
  ).toBeVisible();
  await expect(
    page.locator('xpath=//p[normalize-space()="Visible Assets"]/following-sibling::p[1]'),
  ).toHaveText("4");

  const marketWatchTable = page
    .locator('xpath=//h2[normalize-space()="Market Watch"]/ancestor::section[1]')
    .locator("tbody tr");

  await expect(marketWatchTable).toHaveCount(4);
  await expect(marketWatchTable.locator("td:first-child div:first-child")).toHaveText([
    "BTC",
    "ETH",
    "SOL",
    "XRP",
  ]);
  await expect(marketWatchTable.locator("td:last-child")).toHaveText([
    "binance ws",
    "binance ws",
    "binance ws",
    "binance ws",
  ]);
  expect(runtime.apiRequests).toHaveLength(1);
  expect(new URL(runtime.apiRequests[0]).pathname).toBe("/api/market/candles");
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

const responsiveViewports = [
  { name: "375px幅", width: 375, height: 1000 },
  { name: "390px幅", width: 390, height: 1000 },
  { name: "768px幅", width: 768, height: 1000 },
] as const;

for (const viewport of responsiveViewports) {
  test(`${viewport.name}でも主要操作に到達でき外部APIを呼ばない`, async ({ page }) => {
    const runtime = observeRuntime(page);

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "公開マーケットデータ監視UI" })).toBeVisible();
    await expect(page.getByRole("button", { name: "デモモード" })).toBeVisible();
    await expect(page.getByRole("button", { name: "REST連携" })).toBeVisible();
    await expect(page.getByRole("button", { name: "WebSocket連携" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Market Watch" })).toBeVisible();
    await expectNoBodyHorizontalOverflow(page);

    await page.getByRole("heading", { name: "仮想ポートフォリオ" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "仮想ポートフォリオ" })).toBeVisible();
    await expect(page.getByLabel("数量")).toBeVisible();
    await expect(page.getByRole("button", { name: "追加", pressed: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "減らす", pressed: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "BTCを0.1追加する" })).toBeVisible();
    await expectNoBodyHorizontalOverflow(page);
    expect(runtime.apiRequests).toEqual([]);
    expect(runtime.consoleErrors).toEqual([]);
    expect(runtime.pageErrors).toEqual([]);
  });
}

test("desktop表示後に390pxへ変更しても横幅が画面内に収まる", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByTestId("candlestick-chart")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 1000 });

  await expectNoBodyHorizontalOverflow(page);
});

function observeRuntime(page: Page): RuntimeObservation {
  const observation: RuntimeObservation = {
    consoleErrors: [],
    pageErrors: [],
    apiRequests: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      observation.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    observation.pageErrors.push(error.message);
  });
  page.on("request", (request) => {
    const url = new URL(request.url());

    if (url.pathname.startsWith("/api")) {
      observation.apiRequests.push(request.url());
    }
  });

  return observation;
}

async function expectNoBodyHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    const overflowingElements = Array.from(document.querySelectorAll("body *"))
      .map((element) => ({
        element,
        rect: element.getBoundingClientRect(),
      }))
      .filter(
        ({ element, rect }) =>
          rect.right > window.innerWidth + 2 && !isClippedByHorizontalOverflow(element),
      )
      .slice(0, 10)
      .map(({ element, rect }) => ({
        tag: element.tagName.toLowerCase(),
        className: element.className,
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      }));

    return {
      overflowPixels: scrollingElement.scrollWidth - window.innerWidth,
      overflowingElements,
    };

    function isClippedByHorizontalOverflow(element: Element) {
      let ancestor = element.parentElement;

      while (ancestor !== null && ancestor !== document.body) {
        const style = getComputedStyle(ancestor);
        const clipsOverflow =
          style.overflowX === "auto" ||
          style.overflowX === "scroll" ||
          style.overflowX === "hidden";

        if (clipsOverflow && ancestor.getBoundingClientRect().right <= window.innerWidth + 2) {
          return true;
        }

        ancestor = ancestor.parentElement;
      }

      return false;
    }
  });

  expect(
    layout.overflowPixels,
    JSON.stringify({ overflowingElements: layout.overflowingElements }, null, 2),
  ).toBeLessThanOrEqual(2);
}

async function mockMarketCandlesResponse(page: Page) {
  await page.route("**/api/market/candles?**", async (route) => {
    await route.fulfill({
      json: {
        source: "coinbase",
        cache: "bypass",
        updatedAt: "2026-05-17T00:00:00.000Z",
        data: [],
      },
    });
  });
}

async function mockTickerWebSocketFallback(page: Page) {
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;

    class FailedWebSocket extends EventTarget {
      readonly url: string;
      readonly bufferedAmount = 0;
      readonly extensions = "";
      readonly protocol = "";
      binaryType: BinaryType = "blob";
      readyState = NativeWebSocket.CLOSED;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;

      constructor(url: string) {
        super();
        this.url = url;
        window.setTimeout(() => {
          const event = new Event("error");
          this.onerror?.(event);
          this.dispatchEvent(event);
        }, 0);
      }

      close() {
        const event = new CloseEvent("close");
        this.onclose?.(event);
        this.dispatchEvent(event);
      }

      send() {
        return;
      }
    }

    class BinanceWebSocket extends EventTarget {
      readonly url: string;
      readonly bufferedAmount = 0;
      readonly extensions = "";
      readonly protocol = "";
      binaryType: BinaryType = "blob";
      readyState = NativeWebSocket.CONNECTING;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;

      constructor(url: string) {
        super();
        this.url = url;
        window.setTimeout(() => {
          this.readyState = NativeWebSocket.OPEN;
          const openEvent = new Event("open");
          this.onopen?.(openEvent);
          this.dispatchEvent(openEvent);
          this.emitTickerMessage();
        }, 0);
      }

      close() {
        this.readyState = NativeWebSocket.CLOSED;
        const event = new CloseEvent("close");
        this.onclose?.(event);
        this.dispatchEvent(event);
      }

      send() {
        return;
      }

      private emitTickerMessage() {
        const message = [
          createBinanceTickerMessage("BTCUSDT", "70000.00", "69000.00", "1000.00"),
          createBinanceTickerMessage("ETHUSDT", "3600.00", "3500.00", "9000.00"),
          createBinanceTickerMessage("SOLUSDT", "180.00", "175.00", "8000.00"),
          createBinanceTickerMessage("XRPUSDT", "0.62", "0.60", "120000.00"),
        ];
        const event = new MessageEvent("message", { data: JSON.stringify(message) });
        this.onmessage?.(event);
        this.dispatchEvent(event);
      }
    }

    function createBinanceTickerMessage(
      symbol: string,
      price: string,
      open24h: string,
      volume24h: string,
    ) {
      return {
        s: symbol,
        c: price,
        o: open24h,
        h: price,
        l: open24h,
        v: volume24h,
        q: String(Number(price) * Number(volume24h)),
        E: 1_778_976_000_000,
      };
    }

    function WrappedWebSocket(url: string | URL, protocols?: string | string[]): WebSocket {
      const textUrl = String(url);

      if (textUrl.includes("/api/ws/binance/ticker")) {
        return new BinanceWebSocket(textUrl) as unknown as WebSocket;
      }

      if (textUrl.includes("/api/ws/coinbase/ticker")) {
        return new FailedWebSocket(textUrl) as unknown as WebSocket;
      }

      if (protocols === undefined) {
        return new NativeWebSocket(url);
      }

      return new NativeWebSocket(url, protocols);
    }

    Object.defineProperties(WrappedWebSocket, {
      CONNECTING: { value: NativeWebSocket.CONNECTING },
      OPEN: { value: NativeWebSocket.OPEN },
      CLOSING: { value: NativeWebSocket.CLOSING },
      CLOSED: { value: NativeWebSocket.CLOSED },
    });

    WrappedWebSocket.prototype = NativeWebSocket.prototype;
    window.WebSocket = WrappedWebSocket as typeof WebSocket;
  });
}
