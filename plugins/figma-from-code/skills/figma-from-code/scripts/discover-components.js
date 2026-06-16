/**
 * Framework-agnostic component discovery for any web application.
 *
 * Detects the UI framework (React 18+, React <18, Vue 3, Vue 2, Angular,
 * Svelte dev-mode) and walks the DOM to map component names to elements.
 *
 * Usage:
 *   node discover-components.js <url> [options]
 *
 * Options:
 *   --list                  Print unique component names only
 *   --name <name>           Filter to instances of a specific component
 *   --tree                  Print the component hierarchy as a tree
 *   --output <file.json>    Write full results to a file
 *   --click <selector>      Click an element before discovery (opens dialogs, etc.)
 *   --wait <ms>             Extra wait after page load (default: 0)
 *   --min-size <px>         Skip elements smaller than this (default: 4)
 *   --include-lib           Include library/internal components (filtered by default)
 *   --screenshot <name>     Screenshot a component's first visible instance
 *   --screenshot-dir <dir>  Directory for screenshots (default: ./component-screenshots)
 */

const { getBrowser } = require('./browser-connect');
const { discoverOnPage } = require('./detect-components');
const { isLibraryComponent } = require('./library-filter');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 1 || args[0].startsWith('--')) {
  console.error('Usage: node discover-components.js <url> [--list] [--name Name] [--tree] [--output file.json] [--click sel] [--wait ms] [--screenshot Name]');
  process.exit(1);
}

const url = args[0];
const opts = {
  list: false, name: null, tree: false, output: null,
  click: null, wait: 0, minSize: 4, includeLib: false,
  screenshot: null, screenshotDir: './component-screenshots',
};

for (let i = 1; i < args.length; i++) {
  switch (args[i]) {
    case '--list': opts.list = true; break;
    case '--name': opts.name = args[++i]; break;
    case '--tree': opts.tree = true; break;
    case '--output': opts.output = args[++i]; break;
    case '--click': opts.click = args[++i]; break;
    case '--wait': opts.wait = Number(args[++i]); break;
    case '--min-size': opts.minSize = Number(args[++i]); break;
    case '--include-lib': opts.includeLib = true; break;
    case '--screenshot': opts.screenshot = args[++i]; break;
    case '--screenshot-dir': opts.screenshotDir = args[++i]; break;
  }
}

(async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  if (opts.click) {
    const trigger = page.locator(opts.click).first();
    await trigger.waitFor({ state: 'visible', timeout: 8000 });
    await trigger.click();
    await page.waitForTimeout(400);
  }

  if (opts.wait > 0) await page.waitForTimeout(opts.wait);

  const result = await discoverOnPage(page, { minSize: opts.minSize });

  if (!opts.includeLib) {
    result.components = result.components.filter(c => !isLibraryComponent(c.name));
  }

  if (opts.name) {
    const pattern = opts.name.toLowerCase();
    result.components = result.components.filter(c => c.name.toLowerCase().includes(pattern));
  }

  result.url = url;

  if (opts.screenshot) {
    const comp = result.components.find(c => c.name.toLowerCase() === opts.screenshot.toLowerCase());
    if (comp) {
      const el = comp.elements.find(e => e.visible) || comp.elements[0];
      if (el) {
        fs.mkdirSync(opts.screenshotDir, { recursive: true });
        const outPath = path.join(opts.screenshotDir, `${comp.name}.png`);
        await page.locator(el.selector).first().screenshot({ path: outPath });
        console.log(`Screenshot saved: ${outPath}`);
      }
    } else {
      console.error(`Component "${opts.screenshot}" not found`);
    }
  }

  if (opts.list) {
    console.log(`Framework: ${result.framework.name} ${result.framework.generation || ''}${result.framework.version ? ' v' + result.framework.version : ''}`);
    console.log(`Components found: ${result.components.length}\n`);
    for (const c of result.components) {
      const vis = c.elements.filter(e => e.visible).length;
      console.log(`  ${c.name} (${c.instances} instance${c.instances > 1 ? 's' : ''}${vis < c.instances ? `, ${vis} visible` : ''})`);
    }
  } else if (opts.tree) {
    console.log(`Framework: ${result.framework.name} ${result.framework.generation || ''}${result.framework.version ? ' v' + result.framework.version : ''}\n`);
    function printTree(nodes, indent) {
      for (const node of nodes) {
        if (!opts.includeLib && isLibraryComponent(node.name)) continue;
        if (opts.name && !node.name.toLowerCase().includes(opts.name.toLowerCase())) {
          printTree(node.children, indent);
          continue;
        }
        console.log(`${indent}${node.name}`);
        printTree(node.children, indent + '  ');
      }
    }
    printTree(result.tree, '');
  } else {
    process.stdout.write(JSON.stringify(result, null, 2));
  }

  if (opts.output) {
    fs.mkdirSync(path.dirname(opts.output), { recursive: true });
    fs.writeFileSync(opts.output, JSON.stringify(result, null, 2));
    if (!opts.list && !opts.tree) console.log('');
    console.log(`Written to: ${opts.output}`);
  }

  await browser.close();
})().catch(err => {
  console.error('discover-components.js error:', err.message);
  process.exit(1);
});
