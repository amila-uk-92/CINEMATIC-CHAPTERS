import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function captureScreenshots() {
  console.log('Capturing responsive screenshots of the application...');
  const outDir = path.resolve(process.cwd(), 'reports/screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch();

  // 1. Desktop 1440px Home Page
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '01_desktop_home_hero.png'), fullPage: false });

  // Scroll to Packages
  await page.evaluate(() => window.scrollTo(0, 1800));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '02_desktop_packages.png'), fullPage: false });

  // Scroll to Calendar
  await page.evaluate(() => window.scrollTo(0, 2600));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03_desktop_calendar.png'), fullPage: false });

  // 2. Mobile 390px (iPhone size)
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: path.join(outDir, '04_mobile_home.png'), fullPage: false });

  // Mobile Packages Tabs
  await mobilePage.evaluate(() => window.scrollTo(0, 1600));
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(outDir, '05_mobile_packages.png'), fullPage: false });

  // 3. Admin Login & Dashboard
  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await adminPage.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' });
  await adminPage.screenshot({ path: path.join(outDir, '06_admin_login.png') });

  await adminPage.fill('input[type="email"]', 'admin@cinematicchapters.co.uk');
  await adminPage.fill('input[type="password"]', 'LeicesterStudio2026!');
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForNavigation({ waitUntil: 'networkidle' });
  await adminPage.screenshot({ path: path.join(outDir, '07_admin_dashboard.png') });

  // 4. Client Portal Login & Gallery
  const clientPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await clientPage.goto('http://localhost:3000/client/login', { waitUntil: 'networkidle' });
  await clientPage.screenshot({ path: path.join(outDir, '08_client_login.png') });

  await clientPage.fill('input[type="text"]', 'PORTAL-DEMO-2026');
  await clientPage.click('button[type="submit"]');
  await clientPage.waitForNavigation({ waitUntil: 'networkidle' });
  await clientPage.screenshot({ path: path.join(outDir, '09_client_gallery.png') });

  await browser.close();
  console.log('✓ All 9 responsive screenshots captured successfully in reports/screenshots/');
}

captureScreenshots().catch(console.error);
