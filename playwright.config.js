import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    ...devices["Desktop Chrome"],
    headless: true,
    browserName: "chromium",
  },
  reporter: [["html", { open: "never" }], ["list"]],
});
