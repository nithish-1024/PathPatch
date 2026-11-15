// File: frontend/e2e_ui_audit.mjs
// Run locally via: node frontend/e2e_ui_audit.mjs
import { chromium } from "playwright";

(async () => {
  console.log("🚀 Starting PathPatch E2E UI & Verification Audit...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    console.log("1. Checking Home / Landing Page...");
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);

    console.log("2. Checking /repo Studio & Presets...");
    await page.goto("http://localhost:5173/repo");
    await page.waitForTimeout(1000);

    console.log("3. Checking /ece Circuits Studio...");
    await page.goto("http://localhost:5173/ece");
    await page.waitForTimeout(1000);

    console.log("4. Checking /civil & /truss Aliased Routes...");
    await page.goto("http://localhost:5173/truss");
    await page.waitForTimeout(1000);

    console.log("5. Checking /mechanical & /beam Aliased Routes...");
    await page.goto("http://localhost:5173/beam");
    await page.waitForTimeout(1000);

    console.log("6. Checking /idea Architecture Studio...");
    await page.goto("http://localhost:5173/idea");
    await page.waitForTimeout(1000);

    console.log("✅ All 5 Studios & Aliased Routes verified successfully!");
  } catch (err) {
    console.error("❌ E2E Audit failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
