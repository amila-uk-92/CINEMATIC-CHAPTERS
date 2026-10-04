import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.UI_TEST_URL || "http://127.0.0.1:3010",
    headless: true,
    timezoneId: "Europe/London",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
