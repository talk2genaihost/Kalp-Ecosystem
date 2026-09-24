import { test } from "@playwright/test";

const CINEMATIC_URL = process.env.KALP_CINEMATIC_URL || "http://127.0.0.1:4173/cinematic-studio/";

test("Retro 64 runtime diagnostic: published bootstrap state", async ({ page }) => {
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  const httpErrors = [];

  await page.addInitScript(() => {
    window.__retroRuntimeErrors = [];
    window.addEventListener("error", event => {
      window.__retroRuntimeErrors.push({
        message: String(event.message || ""),
        filename: String(event.filename || ""),
        lineno: Number(event.lineno || 0),
        colno: Number(event.colno || 0)
      });
    }, true);
  });

  page.on("console", msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", error => {
    pageErrors.push(String(error?.stack || error));
  });
  page.on("requestfailed", request => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || null
    });
  });
  page.on("response", response => {
    if (response.status() >= 400) {
      httpErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  await page.goto(CINEMATIC_URL, { waitUntil: "networkidle" });

  const state = await page.evaluate(() => ({
    url: location.href,
    readyState: document.readyState,
    retroReadyExists: Boolean(window.__retroReady),
    retroReadyIsThenable: Boolean(window.__retroReady && typeof window.__retroReady.then === "function"),
    retroBootstrap: window.__retroBootstrap || null,
    retroBootstrapError: window.__retroBootstrapError || null,
    retroGameCount: document.querySelectorAll("#retroGame").length,
    retroGameOptions: Array.from(document.querySelectorAll("#retroGame option")).map(option => ({ value: option.value, text: option.textContent })),
    bootstrapScripts: Array.from(document.scripts).map(script => script.src || "inline").filter(src => src.includes("retro64") || src === "inline"),
    allScriptUrls: Array.from(document.scripts).map(script => script.src).filter(Boolean),
    runtimeErrors: window.__retroRuntimeErrors || []
  }));

  console.log("[RETRO-64 DIAGNOSTIC]", JSON.stringify({
    state,
    consoleMessages,
    pageErrors,
    failedRequests,
    httpErrors
  }, null, 2));
});
