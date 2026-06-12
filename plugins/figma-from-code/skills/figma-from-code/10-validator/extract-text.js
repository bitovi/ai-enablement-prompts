/**
 * Text content extractor for figma-from-code
 *
 * Usage — single extraction:
 *   node extract-text.js <url> --selector "css" [--click "css"] [--nth N]
 *
 * Usage — batch mode (one browser, many extractions):
 *   node extract-text.js --batch manifest.json
 *
 *   manifest.json format:
 *   [
 *     {"url": "http://...", "output": "path/text.json", "selector": "css",
 *      "fallbackSelectors": ["css", ...], "click": "css" | ["css", ...], "nth": 0},
 *     ...
 *   ]
 *
 *   "click" accepts a single selector or an ordered array (multi-step menus).
 *   "fallbackSelectors" are tried in order when the primary selector times out.
 *
 * Output (single mode → stdout JSON, batch mode → individual files):
 *   { "full", "lines", "inputs", "buttons", "headings", "labels" }
 */

const { getBrowser } = require('./browser-connect');
const fs = require('fs');
const path = require('path');

async function extractOne(page, { url, selector, fallbackSelectors, click, nth = 0 }) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  const clicks = Array.isArray(click) ? click : click ? [click] : [];
  for (const clickSelector of clicks) {
    const trigger = page.locator(clickSelector).first();
    await trigger.waitFor({ state: 'visible', timeout: 3000 });
    await trigger.click();
    await page.waitForTimeout(400);
  }

  const candidates = selector ? [selector, ...(fallbackSelectors || [])] : [null];
  let root = null;
  let lastErr = null;

  for (let i = 0; i < candidates.length; i++) {
    const base = candidates[i] ? page.locator(candidates[i]) : page.locator('body');
    const loc = candidates[i] ? (nth > 0 ? base.nth(nth) : base.filter({ visible: true }).first()) : base;
    try {
      await loc.waitFor({ state: 'visible', timeout: i === 0 ? 4000 : 3000 });
      root = loc;
      if (i > 0) process.stderr.write(`  (fallback selector ${i}: ${candidates[i]})\n`);
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!root) throw lastErr || new Error('selector not found or timeout');

  return await root.evaluate((el) => {
    const lines = (el.innerText ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const inputs = [...el.querySelectorAll('input, textarea')]
      .map((i) => i.placeholder || i.value || '')
      .filter(Boolean);

    const buttons = [...el.querySelectorAll('button')]
      .map((b) => b.innerText?.trim())
      .filter((t) => t && t.length > 0 && t.length < 60);

    const headings = [...el.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .map((h) => h.innerText?.trim())
      .filter(Boolean);

    const labels = [...el.querySelectorAll('label')]
      .map((l) => l.innerText?.trim())
      .filter(Boolean);

    const icons = [...el.querySelectorAll('svg')]
      .map((svg) => {
        const classes = svg.getAttribute('class') || '';
        const lucideClass = classes.split(' ').find((c) => c.startsWith('lucide-'));
        if (!lucideClass) return null;
        const kebab = lucideClass.replace('lucide-', '');
        const name = kebab
          .split('-')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('');
        const sizeMatch = classes.match(/\b[hw]-(\d+(?:\.\d+)?)\b/);
        const size = sizeMatch ? parseFloat(sizeMatch[1]) * 4 : 24;
        return { name, size };
      })
      .filter(Boolean);

    return {
      full: el.innerText?.trim().slice(0, 500) ?? '',
      lines,
      inputs,
      buttons,
      headings,
      labels,
      icons,
    };
  });
}

const args = process.argv.slice(2);

const batchIdx = args.indexOf('--batch');
if (batchIdx !== -1) {
  const manifestPath = args[batchIdx + 1];
  if (!manifestPath) {
    process.stderr.write('Usage: node extract-text.js --batch manifest.json\n');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  (async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    let captured = 0,
      failed = 0;

    for (const entry of manifest) {
      try {
        const result = await extractOne(page, entry);
        if (entry.output) {
          fs.mkdirSync(path.dirname(entry.output), { recursive: true });
          fs.writeFileSync(entry.output, JSON.stringify(result, null, 2));
          console.log(`Extracted: ${entry.output}`);
        }
        captured++;
      } catch (err) {
        process.stderr.write(
          `Failed ${entry.output || entry.url}: ${err.message.split('\n')[0]}\n`
        );
        failed++;
      }
    }

    await browser.close();
    console.log(`\nBatch complete: ${captured} extracted, ${failed} failed`);
  })().catch((err) => {
    process.stderr.write('extract-text.js error: ' + err.message + '\n');
    process.exit(1);
  });
} else {
  if (args.length < 1) {
    process.stderr.write(
      'Usage: node extract-text.js <url> --selector "css" [--click "css"] [--nth N]\n'
    );
    process.exit(1);
  }

  const url = args[0];
  let selector = null,
    clickSel = null,
    nthIndex = 0;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--selector') selector = args[++i];
    else if (args[i] === '--click') clickSel = args[++i];
    else if (args[i] === '--nth') nthIndex = Number(args[++i]);
  }

  (async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const result = await extractOne(page, { url, selector, click: clickSel, nth: nthIndex });
    await browser.close();
    process.stdout.write(JSON.stringify(result, null, 2));
  })().catch((err) => {
    process.stderr.write('extract-text.js error: ' + err.message + '\n');
    process.exit(1);
  });
}
