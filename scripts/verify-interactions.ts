import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  page.on("response", (res) => {
    if (res.status() === 404 || res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });
  page.on("console", (msg) => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`[PAGE ERROR] ${err.message}`));

  await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const nextState = await page.evaluate(() => {
    return {
      hasReactRoot: document.querySelector("[data-reactroot]") !== null,
      scripts: Array.from(document.querySelectorAll("script")).map((s) => s.src || "inline"),
      nextData: (window as any).__NEXT_DATA__ ? true : false,
    };
  });
  console.log("NextState:", JSON.stringify(nextState, null, 2));

  // 1. Open mobile navigation drawer
  const menuBtn = page.locator(".mobile-menu");
  console.log("menuBtn isVisible:", await menuBtn.isVisible());
  console.log("menuBtn boundingBox:", await menuBtn.boundingBox());
  await menuBtn.click();
  await page.waitForTimeout(400);
  console.log("nav class after click:", await page.locator("nav").first().getAttribute("class"));
  await page.screenshot({ path: "public/screenshots/mobile-menu-drawer.png" });

  // 2. Close navigation drawer
  await menuBtn.click();
  await page.waitForTimeout(300);

  // 3. Scroll to gallery and click the "Explore our gallery" button
  const exploreBtn = page.locator(".mobile-gallery-explore-btn");
  await exploreBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await exploreBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "public/screenshots/mobile-lightbox-modal.png" });

  await browser.close();
  console.log("Interactive screenshots captured successfully!");
}

main().catch(console.error);
