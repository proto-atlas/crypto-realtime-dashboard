import { expect, type Page, test } from "@playwright/test";

type RuntimeObservation = {
  consoleErrors: string[];
  pageErrors: string[];
};

test("公開環境で初期数量のままクリックしたら仮想保有を追加して再読込後も保持する", async ({
  page,
}) => {
  const runtime = observeRuntime(page);
  await openResetDashboard(page);

  await page.getByRole("button", { name: "BTCを0.1追加する" }).click();

  await expect(page.getByText("BTCの仮想保有を追加しました。")).toBeVisible();
  await expect(page.getByText("0.1000 単位")).toBeVisible();
  await page.reload();
  await expect(page.getByText("0.1000 単位")).toBeVisible();
  await expect(page.getByText("BTCを追加")).toBeVisible();
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test("公開環境の数量入力でEnterを押したら仮想保有を追加する", async ({ page }) => {
  const runtime = observeRuntime(page);
  await openResetDashboard(page);

  await page.getByLabel("数量").press("Enter");

  await expect(page.getByText("BTCの仮想保有を追加しました。")).toBeVisible();
  await expect(page.getByText("0.1000 単位")).toBeVisible();
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test("公開環境で減らすを選んだら実行内容と保有不足を表示する", async ({ page }) => {
  const runtime = observeRuntime(page);
  await openResetDashboard(page);

  await page.getByRole("button", { name: "減らす", pressed: false }).click();

  await expect(page.getByRole("button", { name: "減らす", pressed: true })).toBeVisible();
  await page.getByRole("button", { name: "BTCを0.1減らす" }).click();
  await expect(page.getByText("仮想保有数量が不足しています。")).toBeVisible();
  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
});

test("公開環境で仮想保有の操作グループを識別できる", async ({ page }) => {
  await openResetDashboard(page);

  await expect(page.getByRole("group", { name: "操作" })).toBeVisible();
  await expect(page.getByRole("button", { name: "追加", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "減らす", pressed: false })).toBeVisible();
});

test("公開環境の390px幅で仮想ポートフォリオを横スクロールなしで操作できる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1_000 });
  await openResetDashboard(page);

  await expect(page.getByRole("button", { name: "BTCを0.1追加する" })).toBeVisible();
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
});

async function openResetDashboard(page: Page) {
  await page.goto("/portfolio");
  await expect(page.getByRole("heading", { level: 1, name: "仮想ポートフォリオ" })).toBeVisible();
  await page.getByRole("button", { name: "初期化" }).click();
  await expect(page.getByText("仮想ポートフォリオを初期化しました。")).toBeVisible();
}

function observeRuntime(page: Page): RuntimeObservation {
  const observation: RuntimeObservation = {
    consoleErrors: [],
    pageErrors: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      observation.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    observation.pageErrors.push(error.message);
  });

  return observation;
}
