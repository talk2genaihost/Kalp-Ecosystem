import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4174",
    ...devices["Desktop Chrome"],
    headless: true,
    browserName: "chromium",
  },
  reporter: [["html", { open: "never" }], ["list"]],
});
