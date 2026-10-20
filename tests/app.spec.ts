import { test, expect } from "@playwright/test";
test("键盘跳转保留当前页面，弹窗焦点不会逃逸", async ({ page }) => {
  await page.goto("/#duel");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  expect(page.url()).toContain("#duel");
  await page.locator(".topbar").getByRole("button", { name: "帮助与设置" }).click();
  await expect(page.getByRole("button", { name: "关闭设置" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("link", { name: "查看规则与概念" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "关闭设置" })).toBeFocused();
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("trust-lab-v1"))
      localStorage.setItem(
        "trust-lab-v1",
        JSON.stringify({
          reports: [],
          completed: [],
          reduced: false,
          onboarded: true,
        }),
      );
  });
});
for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440])
  test(`全部核心页面无页面横向溢出 · ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const route of [
      "home",
      "learn",
      "duel",
      "tournament",
      "evolution",
      "lab",
      "atlas",
      "archive",
    ]) {
      await page.goto(`/#${route}`);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route,
      ).toBe(true);
      if (route === "home" && (width === 390 || width === 1440))
        await page.screenshot({
          path: `docs/screenshots/home-${width}.png`,
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
test("真实对局、单步、播放、暂停、报告与导出", async ({ page }) => {
  await page.goto("/#duel");
  await page.getByLabel("每场最多回合", { exact: true }).first().fill("3");
  await page.getByRole("button", { name: "选择合作" }).click();
  await expect(page.locator(".arena-top")).toContainText("01 / 3");
  await page.getByRole("button", { name: "单步", exact: true }).click();
  await expect(page.locator(".arena-top")).toContainText("02 / 3");
  await page.getByRole("button", { name: "自动播放", exact: true }).click();
  await expect(page.getByText("策略揭晓 · 以牙还牙")).toBeVisible();
  await page.goto("/#archive");
  await page
    .getByRole("button", { name: "对局 · 以牙还牙", exact: true })
    .click();
  await expect(page.locator(".report-sheet")).toContainText("回合数");
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect((await jsonDownload).suggestedFilename()).toMatch(/\.json$/);
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/);
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "清空", exact: true }).click();
  await expect(page.locator(".archive-record")).toHaveCount(1);
});
test("锦标赛更新、演化控制、双条件计算", async ({ page }) => {
  await page.goto("/#tournament");
  await page.getByRole("button", { name: "运行锦标赛" }).click();
  await expect(page.getByText("真实模拟已完成")).toBeVisible();
  const before = await page.locator(".heatmap").innerText();
  await page.getByLabel("行动噪声", { exact: true }).first().fill("0.3");
  await page.getByRole("button", { name: "运行锦标赛" }).click();
  expect(await page.locator(".heatmap").innerText()).not.toBe(before);
  await page.getByRole("button", { name: "合作率", exact: true }).click();
  await expect(page.locator(".heatmap")).toContainText("%");
  await page.goto("/#evolution");
  await page.getByRole("button", { name: "单步", exact: true }).click();
  await expect(page.locator(".evolution-top>strong")).toContainText("1");
  await page.getByRole("button", { name: "播放演化" }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "重置播放" }).click();
  await expect(page.locator(".evolution-top>strong")).toContainText("0");
  await page.goto("/#lab");
  await page.getByRole("button", { name: "运行双实验并保存" }).click();
  await expect(page.getByText("条件对照结果", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/lab-1440.png",
    fullPage: true,
  });
});
test("七个互动章节真正推进与记忆", async ({ page }) => {
  await page.goto("/#learn");
  for (let i = 0; i < 7; i++) {
    if (i < 4) {
      for (let r = 0; r < (i === 0 ? 1 : 5); r++)
        await page.getByRole("button", { name: "合作", exact: true }).click();
    } else await page.getByRole("button", { name: "运行章节实验" }).click();
    await expect(page.locator(".story-feedback")).toBeVisible();
    if (i < 6) await page.getByRole("button", { name: "下一章" }).click();
  }
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("trust-lab-v1")!).completed.length,
    ),
  ).toBe(7);
});
test("手机导航、参数验证、设置与存档异常", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#home");
  await page
    .getByRole("navigation", { name: "手机快捷导航" })
    .getByRole("button", { name: "全部" })
    .click();
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "策略锦标赛" })
    .click();
  await expect(
    page.getByRole("heading", { name: "没有永远的赢家。" }),
  ).toBeVisible();
  await page.getByLabel("每场最多回合", { exact: true }).first().fill("0");
  await expect(page.getByRole("button", { name: "运行锦标赛" })).toBeDisabled();
  await page
    .locator(".topbar")
    .getByRole("button", { name: "帮助与设置", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "减弱动态效果" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-reduced", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("trust-lab-v1", "{broken"));
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "欢迎来到信任实验室" }),
  ).toBeVisible();
});

for (const width of [320, 390, 768])
  test(`窄屏真实结果与触控可达 · ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#duel");
    await page.getByLabel("每场最多回合", { exact: true }).first().fill("2");
    await page.getByRole("button", { name: "选择合作" }).click();
    await page.getByRole("button", { name: "选择背叛" }).click();
    await expect(page.getByText("策略揭晓 · 以牙还牙")).toBeVisible();
    expect(
      await page
        .getByRole("button", { name: "选择合作" })
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    if (width === 390)
      await page.screenshot({
        path: "docs/screenshots/duel-390.png",
        fullPage: true,
      });
    await page.goto("/#tournament");
    await page.getByRole("button", { name: "运行锦标赛" }).click();
    await expect(page.getByText("真实模拟已完成")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const heat = page.locator(".heatmap").locator("..");
    if (width < 768)
      expect(await heat.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
        true,
      );
    await page.goto("/#evolution");
    await page.getByLabel("演化世代", { exact: true }).fill("100");
    await expect(page.locator(".evolution-top>strong")).toContainText("100");
    if (width === 390)
      await page.screenshot({
        path: "docs/screenshots/evolution-390.png",
        fullPage: true,
      });
    await page.goto("/#lab");
    await page.getByRole("button", { name: "运行双实验并保存" }).click();
    await expect(page.getByText("策略交锋探针 · 逐轮收益")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.goto("/#archive");
    await page.locator(".archive-record .record-title>button").first().click();
    await expect(page.locator(".report-sheet")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });

test("档案重命名、复制、JSON 导入校验、对照与清除确认", async ({ page }) => {
  await page.goto("/#duel");
  await page.getByLabel("每场最多回合", { exact: true }).first().fill("1");
  await page.getByRole("button", { name: "选择合作" }).click();
  await page.goto("/#archive");
  const report = await page.evaluate(
    () => JSON.parse(localStorage.getItem("trust-lab-v1")!).reports[0],
  );
  await page.getByRole("button", { name: "重命名", exact: true }).click();
  await page.getByRole("textbox", { name: "报告名称" }).fill("我的第一个实验");
  await page.getByRole("button", { name: "保存名称" }).click();
  await expect(
    page.getByRole("button", { name: "我的第一个实验", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await expect(page.locator(".archive-record")).toHaveCount(2);
  await page.locator(".record-check input").nth(0).check();
  await page.locator(".record-check input").nth(1).check();
  await expect(page.getByText("历史实验对照", { exact: true })).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "import.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(report)),
    });
  await expect(page.locator(".archive-record")).toHaveCount(3);
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad"),
    });
  await expect(page.getByRole("status")).toContainText("导入失败");
  await expect(page.locator(".archive-record")).toHaveCount(3);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "清空", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "第一份记录，等你写下。" }),
  ).toBeVisible();
});
