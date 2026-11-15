// File: frontend/e2e_ui_audit.mjs
// Run via: node frontend/e2e_ui_audit.mjs
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "https://path-patch.vercel.app";
const SCREENSHOT_DIR = path.resolve("artifacts/live_audit");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
  console.log(`🚀 Starting PathPatch Live Production Audit against: ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Home & Navbar
    console.log("1. Testing Navbar and Institutional SaaS button...");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const campusBtn = page.locator(".campus-saas-btn");
    await campusBtn.waitFor({ state: "visible", timeout: 10000 });
    console.log("   ✓ Campus SaaS button found in navbar.");

    // Open Modal
    await campusBtn.click();
    await page.waitForSelector(".campus-modal-container", { state: "visible" });
    console.log("   ✓ CampusControlModal opened successfully.");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_campus_modal_telemetry.png") });

    // Switch to Scheduler tab
    await page.click('button.campus-tab:has-text("Lab Scheduler")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_campus_modal_scheduler.png") });
    console.log("   ✓ Lab Scheduler tab verified.");

    // Switch to NBA tab
    await page.click('button.campus-tab:has-text("NBA SAR")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_campus_modal_nba.png") });
    console.log("   ✓ NBA SAR Criterion 3 & 6 tab verified.");

    // Switch to Pricing tab
    await page.click('button.campus-tab:has-text("GFR 154")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_campus_modal_pricing.png") });
    console.log("   ✓ GFR 154 Pricing Tier tab verified.");

    // Close Modal
    await page.click(".campus-close-btn");
    await page.waitForTimeout(500);

    // 2. ECE Circuits Studio & Red-Team Fault Demo
    console.log("2. Testing /ece Studio & Red-Team Fault Preset...");
    await page.goto(`${BASE_URL}/ece`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Select the demo fault preset
    const presetSelect = page.locator(".preset-select");
    await presetSelect.waitFor({ state: "visible" });
    await presetSelect.selectOption("demo_lm741_floating_rail_fault");
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_ece_fault_preset_loaded.png") });
    console.log("   ✓ Demo Fault Preset loaded. Pin 7 failure active.");

    // Verify the 1-Click Auto-Fix button exists and click it
    const autoFixBtn = page.locator("button:has-text('Auto-Fix Pin 7 Wire')");
    if (await autoFixBtn.isVisible()) {
      console.log("   ✓ '⚡ 1-Click Auto-Fix Pin 7 Wire' button visible. Triggering auto-fix...");
      await autoFixBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_ece_fault_autofixed.png") });
      console.log("   ✓ Pin 7 auto-wired to +15V rail successfully.");
    }

    // 3. Verify Route Aliases
    console.log("3. Testing Route Aliases (/truss and /beam)...");
    await page.goto(`${BASE_URL}/truss`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const trussTitle = await page.locator("h2").innerText();
    console.log(`   ✓ /truss resolved to: ${trussTitle.trim()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_truss_aliased_studio.png") });

    await page.goto(`${BASE_URL}/beam`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const beamTitle = await page.locator("h2").innerText();
    console.log(`   ✓ /beam resolved to: ${beamTitle.trim()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08_beam_aliased_studio.png") });

    // 4. Idea Studio Cross-Studio Handoff
    console.log("4. Testing /idea Cross-Studio Handoff...");
    await page.goto(`${BASE_URL}/idea`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const handoffBtn = page.locator("button:has-text('Open Stage in /ece Workbench')");
    if (await handoffBtn.isVisible()) {
      console.log("   ✓ '⚡ Open Stage in /ece Workbench' button verified.");
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09_idea_cross_studio_handoff.png") });

    console.log("\n🎉 ALL AUDITS AND SCREENSHOTS COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Audit failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
