/**
 * Custom screenshot with --nth support for click
 */
const { getBrowser } = require('./browser-connect');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node screenshot_nth.js <url> <output> [--selector "sel"] [--click-nth N]');
  process.exit(1);
}

const url    = args[0];
const output = args[1];

let selector = null;
let clickNth = null;
let width = 1440;
let height = 900;

for (let i = 2; i < args.length; i++) {
  if (args[i] === '--selector') selector = args[++i];
  else if (args[i] === '--click-nth') clickNth = Number(args[++i]);
  else if (!isNaN(Number(args[i]))) {
    if (width === 1440) width = Number(args[i]);
    else height = Number(args[i]);
  }
}

fs.mkdirSync(path.dirname(output), { recursive: true });

(async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  if (clickNth !== null) {
    const trigger = page.locator('h1').nth(clickNth);
    await trigger.waitFor({ state: 'visible', timeout: 8000 });
    await trigger.click();
    await page.waitForTimeout(400);
  }

  if (selector) {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: 8000 });
    await el.screenshot({ path: output });
  } else {
    await page.screenshot({ path: output });
  }

  await browser.close();
  console.log(`Saved: ${output}`);
})().catch(err => {
  console.error(err.message.split('\n')[0]);
  process.exit(1);
});
