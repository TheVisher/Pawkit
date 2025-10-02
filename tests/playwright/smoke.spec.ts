import { expect, test } from "@playwright/test";

const uniqueUrl = `https://example.com/${Date.now()}`;

test("create → list → open → delete card", async ({ page }) => {
  await page.goto("/library");
  const omni = page.getByPlaceholder("Paste a URL to save or type to search…");
  await omni.fill(uniqueUrl);
  await omni.press("Enter");
  await expect(page.getByText("Saving…")).toBeVisible();
  await expect(page.getByText("Saving…")).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText(uniqueUrl)).toBeVisible({ timeout: 10_000 });

  await page.getByText(uniqueUrl).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const notes = page.getByLabel("Notes");
  await notes.fill("Playwright was here");
  await expect(page.getByText("Saving…")).toBeVisible();
  await expect(page.getByText("Saving…")).toBeHidden({ timeout: 10_000 });
  await page.getByRole("button", { name: "Delete card" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText(uniqueUrl)).toBeHidden({ timeout: 10_000 });
});
