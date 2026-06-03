/**
 * Component screenshot helper for figma-from-code-validator
 *
 * Usage — single screenshot (element):
 *   node screenshot.js <url> <output> --selector "css" [--click "css"] [--hover "css"] [width] [height]
 *
 * Usage — single screenshot (full page):
 *   node screenshot.js <url> <output> [width] [height]
 *
 * Usage — batch mode (one browser, many screenshots):
 *   node screenshot.js --batch manifest.json
 *
 *   manifest.json format:
 *   [
 *     {"url": "http://...", "output": "path.png", "selector": "css", "click": "css", "hover": "css", "nth": 0, "variant": "label"},
 *     ...
 *   ]
 *
 * Flags:
 *   --selector "css"   Target a specific DOM element
 *   --click "css"      Click this element before screenshotting
 *   --hover "css"      Hover over this element before screenshotting
 *   --nth N            Use the Nth matching element (0-indexed, default: 0)
 *   --variant "name"   Label printed in output message (no effect on screenshot)
 *   --batch file.json  Process multiple screenshots in a single browser session
 */
const { getBrowser } = require('./browser-connect');
const path = require('path');
const fs = require('fs');

const DEVICE_SCALE_FACTOR = 1;
const SCRIPT_TIMEOUT = 60000;
const _scriptTimer = setTimeout(() => {
  console.error('screenshot.js: script timeout after 60s — exiting');
  process.exit(124);
}, SCRIPT_TIMEOUT);
_scriptTimer.unref();

async function captureOne(
  page,
  { url, output, selector, click, hover, nth = 0, variant, width = 1440, height = 900 }
) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  if (click) {
    const trigger = page.locator(click).first();
    await trigger.waitFor({ state: 'visible', timeout: 8000 });
    await trigger.click();
    await page.waitForTimeout(400);
  }

  if (hover) {
    const hoverTarget = page.locator(hover).first();
    await hoverTarget.waitFor({ state: 'visible', timeout: 8000 });
    await hoverTarget.hover();
    await page.waitForTimeout(600);
  }

  if (selector) {
    const el = page.locator(selector).nth(nth);
    await el.waitFor({ state: 'visible', timeout: 8000 });
    await el.screenshot({ path: output });
  } else {
    await page.screenshot({ path: output });
  }

  const label = variant ? ` [${variant}]` : '';
  console.log(`Saved${label}: ${output}`);
}

const args = process.argv.slice(2);

const batchIdx = args.indexOf('--batch');
if (batchIdx !== -1) {
  const manifestPath = args[batchIdx + 1];
  if (!manifestPath) {
    console.error('Usage: node screenshot.js --batch manifest.json');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  (async () => {
    const browser = await getBrowser();
    const context = await browser.newContext({ deviceScaleFactor: DEVICE_SCALE_FACTOR });
    const page = await context.newPage();
    const results = { captured: [], failed: [] };

    for (const entry of manifest) {
      try {
        await captureOne(page, entry);
        results.captured.push(entry.output);
      } catch (err) {
        console.error(`Failed ${entry.output}: ${err.message.split('\n')[0]}`);
        results.failed.push({ output: entry.output, error: err.message.split('\n')[0] });
      }
    }

    await browser.close();
    console.log(
      `\nBatch complete: ${results.captured.length} captured, ${results.failed.length} failed`
    );
  })().catch((err) => {
    console.error(err.message.split('\n')[0]);
    process.exit(1);
  });
} else {
  if (args.length < 2) {
    console.error(
      'Usage: node screenshot.js <url> <output> [--selector "sel"] [--click "sel"] [--hover "sel"] [--nth N] [--variant "name"] [width] [height]'
    );
    process.exit(1);
  }

  const url = args[0];
  const output = args[1];

  let selector = null,
    clickSel = null,
    hoverSel = null,
    nthIndex = 0,
    variantLabel = null;
  let width = 1440,
    height = 900;

  const numericArgs = [];
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--selector') {
      selector = args[++i];
    } else if (args[i] === '--click') {
      clickSel = args[++i];
    } else if (args[i] === '--hover') {
      hoverSel = args[++i];
    } else if (args[i] === '--nth') {
      nthIndex = Number(args[++i]);
    } else if (args[i] === '--variant') {
      variantLabel = args[++i];
    } else if (!isNaN(Number(args[i]))) {
      numericArgs.push(Number(args[i]));
    }
  }
  if (numericArgs[0] != null) width = numericArgs[0];
  if (numericArgs[1] != null) height = numericArgs[1];

  (async () => {
    const browser = await getBrowser();
    const context = await browser.newContext({ deviceScaleFactor: DEVICE_SCALE_FACTOR });
    const page = await context.newPage();
    await captureOne(page, {
      url,
      output,
      selector,
      click: clickSel,
      hover: hoverSel,
      nth: nthIndex,
      variant: variantLabel,
      width,
      height,
    });
    await browser.close();
  })().catch((err) => {
    console.error(err.message.split('\n')[0]);
    process.exit(1);
  });
}
