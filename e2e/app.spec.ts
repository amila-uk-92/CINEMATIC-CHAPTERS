import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { DateTime } from "luxon";
if (process.env.TEST_ISOLATED !== "true")
  throw new Error("Use npm run test:browser; disposable database required");
const signIn = async (page: Page) => {
  await page.goto("/admin");
  await page.getByLabel("Email address").fill(process.env.UI_TEST_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.UI_TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "SIGN IN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "THE STUDIO." }),
  ).toBeVisible();
};
test("public page layouts, mobile tabs, focus indicator, no overflow, reduced motion and accessibility", async ({
  page,
}) => {
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 760 ? 844 : 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "MOMENTS",
    );
    await page.locator(".hero .photo").first().waitFor({ state: "visible" });
    await expect
      .poll(() =>
        page
          .locator(".hero .photo")
          .first()
          .evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `screenshots/portfolio-${width}.png`,
      fullPage: true,
    });
    if (width === 1440)
      await page.screenshot({ path: "screenshots/hero-desktop.png" });
    if (width === 390)
      await page.screenshot({ path: "screenshots/hero-mobile.png" });
    if (width < 760) {
      await page.getByRole("button", { name: "Toggle navigation" }).click();
      await page.getByRole("link", { name: "Packages", exact: true }).click();
      await page.getByRole("tab", { name: "4 Hours", exact: true }).click();
      await expect(
        page.getByRole("tab", { name: "4 Hours", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(page.locator(".package-card:visible")).toHaveCount(1);
      await expect(page.locator(".package-card:visible")).toContainText("£600");
      await expect(page.locator(".focus-mobile")).toContainText("PACKAGES");
      await page.screenshot({ path: `screenshots/packages-${width}.png` });
      const dock = await page.locator(".focus-rail").boundingBox();
      const scroll = await page.locator(".portfolio-scroll").boundingBox();
      expect(dock!.y).toBeGreaterThanOrEqual(scroll!.y + scroll!.height);
    }
  }
  const scan = await new AxeBuilder({ page }).analyze();
  expect(
    scan.violations
      .filter((v) => ["critical", "serious"].includes(v.impact || ""))
      .map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.getByRole("button", { name: "Chat with the studio" }).click();
  await expect(
    page.getByText("Not configured · Please email the studio."),
  ).toBeVisible();
});
test("content draft, preview and publish; hidden packages remove navigation and focus labels", async ({
  page,
  context,
}) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Website Content", exact: true }).click();
  await page.getByLabel("Brand name").fill("Browser Verified Studio");
  await page.getByRole("button", { name: "SAVE DRAFT", exact: true }).click();
  await expect(page.locator(".success")).toContainText("Draft saved");
  const publicPage = await context.newPage();
  await publicPage.goto("/");
  await expect(publicPage.locator(".site-header .brand")).toContainText(
    "CINEMATIC CHAPTERS",
  );
  const preview = await context.newPage();
  await preview.goto("/preview");
  await expect(preview.locator(".site-header .brand")).toContainText(
    "BROWSER VERIFIED STUDIO",
  );
  await page.getByRole("tab", { name: "Packages", exact: true }).click();
  await page
    .getByLabel("Show packages section, navigation and public booking actions")
    .uncheck();
  await page
    .getByRole("button", { name: "SAVE & PUBLISH", exact: true })
    .click();
  await expect(page.locator(".success")).toContainText("Published");
  await publicPage.reload();
  await expect(publicPage.locator("#packages")).toHaveCount(0);
  await expect(publicPage.locator(".site-header nav")).not.toContainText(
    "Packages",
  );
  await expect(publicPage.locator(".focus-rail")).not.toContainText("PACKAGES");
  await publicPage.goto("/book");
  await expect(
    publicPage.getByRole("heading", { name: "LET’S TALK." }),
  ).toBeVisible();
  await page
    .getByLabel("Show packages section, navigation and public booking actions")
    .check();
  await page
    .getByRole("button", { name: "SAVE & PUBLISH", exact: true })
    .click();
  await expect(page.locator(".success")).toContainText("Published");
  await publicPage.close();
  await preview.close();
});
test("booking request and approval with local email preview", async ({
  page,
  context,
}) => {
  await page.goto("/book");
  const date = DateTime.now()
    .setZone("Europe/London")
    .plus({ days: 2 })
    .toISODate()!;
  while (
    !(await page.getByRole("button", { name: new RegExp(date + ",") }).count())
  )
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(date + ",") }).click();
  await page.locator(".slots button").first().click();
  await page.getByRole("button", { name: "CONTINUE", exact: true }).click();
  await page
    .getByLabel("Your name", { exact: true })
    .fill("Browser Fictional Booking");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("browser-booking@example.invalid");
  await page.getByLabel("Phone number", { exact: true }).fill("07000000000");
  await page
    .getByRole("button", { name: "REVIEW REQUEST", exact: true })
    .click();
  await page
    .getByRole("button", { name: "SEND BOOKING REQUEST", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "YOUR REQUEST IS RECEIVED." }),
  ).toBeVisible();
  await expect(
    page.getByText("Your request is pending approval. It is not confirmed.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({ path: "screenshots/booking-request.png" });
  const admin = await context.newPage();
  await signIn(admin);
  await admin.getByRole("tab", { name: "Bookings", exact: true }).click();
  const booking = admin
    .locator("article.record")
    .filter({ hasText: "Browser Fictional Booking" });
  await booking.getByRole("button", { name: "APPROVE", exact: true }).click();
  await expect(booking.locator(".badge")).toHaveText("confirmed");
  await admin.screenshot({ path: "screenshots/booking-approved.png" });
  await admin.close();
});
test("admin public upload, gallery creation, client login and ZIP download, deletion cleanup", async ({
  page,
  browser,
}) => {
  await signIn(page);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles(process.env.UI_TEST_UPLOAD!);
  await page
    .getByLabel("Descriptive alternative text")
    .fill("Fictional uploaded studio photograph");
  await page
    .getByRole("button", { name: "UPLOAD PHOTOGRAPH", exact: true })
    .click();
  await expect(page.locator(".success")).toContainText("Photograph processed");
  const media = page
    .locator(".media-item")
    .filter({ hasText: "test-photo.png" });
  await expect(media).toBeVisible();
  await page
    .getByRole("tab", { name: "Clients & Galleries", exact: true })
    .click();
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("Browser Fictional Client");
  await page
    .getByLabel("Email", { exact: true })
    .fill("browser-client@example.invalid");
  await page
    .getByRole("button", { name: "CREATE CUSTOMER", exact: true })
    .click();
  await expect(page.locator(".success")).toContainText("Customer created");
  await page
    .getByRole("button", { name: "ISSUE / RESET ACCESS", exact: true })
    .click();
  await expect(page.locator(".success")).toContainText("Access reset");
  await page
    .getByRole("combobox", { name: "Client", exact: true })
    .selectOption({
      label: "Browser Fictional Client · browser-client@example.invalid",
    });
  await page
    .getByLabel("Album title", { exact: true })
    .fill("Browser Fictional Collection");
  await page
    .getByLabel("Session date", { exact: true })
    .fill(DateTime.now().toISODate()!);
  await page
    .getByLabel("Gallery expiry · Europe/London", { exact: true })
    .fill(DateTime.now().plus({ days: 30 }).toFormat("yyyy-MM-dd'T'HH:mm"));
  await page
    .getByRole("button", { name: "CREATE GALLERY", exact: true })
    .click();
  await expect(page.locator(".success")).toContainText("Gallery created");
  const gallery = page
    .locator("article.panel")
    .filter({ hasText: "Browser Fictional Collection" });
  await gallery
    .locator("input[type=file]")
    .setInputFiles(process.env.UI_TEST_UPLOAD!);
  await gallery
    .getByLabel("Descriptive alternative text")
    .fill("Fictional private client photograph");
  await gallery
    .getByRole("button", { name: "UPLOAD PHOTOGRAPH", exact: true })
    .click();
  await expect(page.locator(".success")).toContainText("Photograph uploaded");
  await expect
    .poll(async () => {
      await page.getByRole("button", { name: "REFRESH", exact: true }).click();
      return gallery.locator(".badge").innerText();
    })
    .toBe("ready");
  await page.screenshot({ path: "screenshots/admin-gallery.png" });
  const inbox = await page.request.get("/api/admin/inbox");
  let entries = await inbox.json();
  await expect
    .poll(async () => {
      entries = await (await page.request.get("/api/admin/inbox")).json();
      return entries.find(
        (n: any) =>
          n.kind === "access-setup" &&
          n.recipient === "browser-client@example.invalid",
      )?.state;
    })
    .toBe("preview");
  const setup = entries.find(
    (n: any) =>
      n.kind === "access-setup" &&
      n.recipient === "browser-client@example.invalid",
  );
  const token = new URL(setup.payload.link).searchParams.get("setup");
  const password = process.env.UI_TEST_ADMIN_PASSWORD! + "client";
  const clientContext = await browser.newContext({
    baseURL: process.env.UI_TEST_URL,
    timezoneId: "Europe/London",
  });
  const clientPage = await clientContext.newPage();
  await clientPage.goto("/client?setup=" + token);
  await clientPage
    .getByLabel("New password · at least 12 characters")
    .fill(password);
  await clientPage.getByLabel("Confirm password").fill(password);
  await clientPage
    .getByRole("button", { name: "SET PASSWORD", exact: true })
    .click();
  await expect(
    clientPage.getByText("Your password is set. Sign in below."),
  ).toBeVisible();
  await clientPage
    .getByLabel("Email address")
    .fill("browser-client@example.invalid");
  await clientPage.getByLabel("Password", { exact: true }).fill(password);
  await clientPage
    .getByRole("button", { name: "SIGN IN", exact: true })
    .click();
  await clientPage
    .getByRole("button", { name: "OPEN CHAPTER", exact: true })
    .click();
  await expect(clientPage.locator(".album-preview img")).toHaveCount(1);
  const downloadPromise = clientPage.waitForEvent("download");
  await clientPage
    .getByRole("link", { name: "DOWNLOAD ALL PHOTOS", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(
    "Browser Fictional Collection",
  );
  await download.saveAs("test-results/verified-client.zip");
  await clientPage.screenshot({ path: "screenshots/client-gallery.png" });
  await gallery
    .getByRole("button", { name: "DELETE GALLERY", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("All 1 photographs");
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await dialog
    .getByRole("button", { name: "DELETE PERMANENTLY", exact: true })
    .click();
  await expect
    .poll(async () => {
      await page.getByRole("button", { name: "REFRESH", exact: true }).click();
      return gallery.locator(".badge").innerText();
    })
    .toBe("revoked · deleted");
  const response = await clientPage.request.get("/api/client");
  const clientData = await response.json();
  expect(clientData.galleries).toHaveLength(0);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page
    .locator(".media-item")
    .filter({ hasText: "test-photo.png" })
    .getByRole("button", { name: "DELETE ASSET", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Type DELETE to confirm")
    .fill("DELETE");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "DELETE PERMANENTLY", exact: true })
    .click();
  await expect
    .poll(async () => {
      await page.getByRole("button", { name: "REFRESH", exact: true }).click();
      return page
        .locator(".media-item")
        .filter({ hasText: "test-photo.png" })
        .count();
    })
    .toBe(0);
  await clientContext.close();
});

test("admin responsive views and working-hours/override/block configuration", async ({
  page,
}) => {
  await signIn(page);
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("tab", { name: "Availability", exact: true }).click();
  await page.getByLabel("Setup / travel buffer · minutes").fill("20");
  const overrideDate = DateTime.now().plus({ days: 20 }).toISODate()!;
  await page.getByLabel("Date", { exact: true }).fill(overrideDate);
  await page.getByLabel("Closed for the whole day").check();
  await page
    .getByRole("button", { name: "ADD OVERRIDE TO DRAFT", exact: true })
    .click();
  await expect(
    page.getByText(overrideDate + " · Closed all day", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Internal block label").fill("Fictional test block");
  await page
    .getByLabel("Block starts · Europe/London")
    .fill(DateTime.now().plus({ days: 21 }).toFormat("yyyy-MM-dd'T'10:00"));
  await page
    .getByLabel("Block ends · Europe/London")
    .fill(DateTime.now().plus({ days: 21 }).toFormat("yyyy-MM-dd'T'12:00"));
  await page
    .getByRole("button", { name: "ADD BLOCK TO DRAFT", exact: true })
    .click();
  await page
    .getByRole("button", { name: "SAVE AVAILABILITY", exact: true })
    .click();
  await expect(page.locator(".success")).toContainText("Availability updated");
  const cfg = await (await page.request.get("/api/admin/settings")).json();
  expect(cfg.buffer).toBe(20);
  expect(cfg.overrides[overrideDate]).toBeNull();
  expect(cfg.blocks[0].label).toBe("Fictional test block");
  const scan = await new AxeBuilder({ page }).analyze();
  expect(
    scan.violations
      .filter((v) => ["critical", "serious"].includes(v.impact || ""))
      .map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.screenshot({ path: "screenshots/admin-availability.png" });
});
