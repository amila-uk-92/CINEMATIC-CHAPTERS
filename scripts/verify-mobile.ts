import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

async function run() {
  const screenshotDir = path.resolve("public/screenshots");
  await fs.mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ channel: "msedge" });
  const viewports = [
    { name: "mobile-375", width: 375, height: 667, isMobile: true },
    { name: "mobile-390", width: 390, height: 844, isMobile: true },
    { name: "mobile-402", width: 402, height: 874, isMobile: true },
    { name: "mobile-440", width: 440, height: 956, isMobile: true },
    { name: "mobile-390-short", width: 390, height: 600, isMobile: true },
    { name: "mobile-landscape", width: 844, height: 390, isMobile: true },
    { name: "desktop-1280", width: 1280, height: 800, isMobile: false },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });

    await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // 1. Check for horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`[${vp.name}] Width: ${vp.width}px, Horizontal overflow: ${hasHorizontalOverflow}`);

    // 2. Capture Hero Screenshot
    await page.screenshot({
      path: path.join(screenshotDir, `${vp.name}-hero.png`),
      fullPage: false,
    });

    if (vp.isMobile && vp.name === "mobile-390") {
      // Check top booking button is removed from mobile header
      const mobileHeaderBook = await page.locator(".header-quick-book").count();
      console.log(`[mobile-390] Top mobile header booking button count: ${mobileHeaderBook} (expected 0)`);

      // Check bottom nav exists
      const bottomNav = page.locator(".mobile-bottom-nav");
      console.log(`[mobile-390] Bottom nav isVisible: ${await bottomNav.isVisible()}`);

      // Test Bottom Nav Navigation to Gallery
      const galleryNavLink = page.locator('.mobile-bottom-nav a[href="#gallery"]');
      await galleryNavLink.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(screenshotDir, `${vp.name}-gallery.png`),
        fullPage: false,
      });

      // Test Compact 3-Column Gallery: count thumbnails
      const thumbCount = await page.locator(".mobile-gallery-card").count();
      console.log(`[mobile-390] Gallery thumbnail count: ${thumbCount} (expected 9)`);

      // Test Lightbox: Click first thumbnail
      const firstCard = page.locator(".mobile-gallery-card").first();
      await firstCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(screenshotDir, `${vp.name}-lightbox.png`),
      });

      // Close Lightbox
      await page.locator(".gallery-modal-close").click();
      await page.waitForTimeout(400);

      // Test Bottom Nav Navigation to Packages
      const packagesNavLink = page.locator('.mobile-bottom-nav a[href="#packages"]');
      await packagesNavLink.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(screenshotDir, `${vp.name}-packages.png`),
        fullPage: false,
      });

      // Check all 3 packages are visible together
      const packageCardCount = await page.locator(".mobile-package-card").count();
      console.log(`[mobile-390] Mobile package comparison cards: ${packageCardCount} (expected 3)`);

      // Test Expanding Package Inclusions & Terms
      const firstPackageToggle = page.locator(".mobile-package-toggle-btn").first();
      await firstPackageToggle.click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(screenshotDir, `${vp.name}-package-expanded.png`),
      });

      // Test Bottom Nav Navigation to About Us
      const teamNavLink = page.locator('.mobile-bottom-nav a[href="#team"]');
      await teamNavLink.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(screenshotDir, `${vp.name}-about.png`),
        fullPage: false,
      });

      // Test Bottom Nav Navigation to Contact
      const contactNavLink = page.locator('.mobile-bottom-nav a[href="#contact"]');
      await contactNavLink.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(screenshotDir, `${vp.name}-contact.png`),
        fullPage: false,
      });

      // Verify FAQ is HIDDEN on mobile
      const faqVisible = await page.locator(".faq").isVisible();
      console.log(`[mobile-390] FAQ isVisible on mobile: ${faqVisible} (expected false)`);

      // Verify Mobile Booking Terms card IS visible
      const mobileTermsVisible = await page.locator(".mobile-booking-info").isVisible();
      console.log(`[mobile-390] Mobile booking info isVisible: ${mobileTermsVisible} (expected true)`);
    } else if (!vp.isMobile) {
      // Desktop checks
      const desktopHeaderBook = await page.locator(".header-book").isVisible();
      const desktopFaqVisible = await page.locator(".faq").isVisible();
      const desktopBottomNavVisible = await page.locator(".mobile-bottom-nav").isVisible();
      console.log(`[desktop-1280] Header booking button visible: ${desktopHeaderBook} (expected true)`);
      console.log(`[desktop-1280] FAQ visible on desktop: ${desktopFaqVisible} (expected true)`);
      console.log(`[desktop-1280] Bottom nav visible on desktop: ${desktopBottomNavVisible} (expected false)`);

      // Scroll to packages on desktop
      await page.evaluate(() => document.getElementById("packages")?.scrollIntoView());
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(screenshotDir, `${vp.name}-packages.png`),
        fullPage: false,
      });
    } else {
      // Other mobile viewports screenshots
      await page.evaluate(() => document.getElementById("packages")?.scrollIntoView());
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(screenshotDir, `${vp.name}-packages.png`),
        fullPage: false,
      });
    }

    await page.close();
  }

  await browser.close();
  console.log("All viewport verifications completed successfully!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
