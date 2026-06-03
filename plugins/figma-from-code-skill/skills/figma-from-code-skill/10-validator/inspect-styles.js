/**
 * Live component inspector for figma-from-code-build-component
 *
 * Connects to the running dev server via Playwright, locates a component,
 * extracts computed styles, and captures screenshots for interactive states
 * (hover, focus, disabled) when they have distinct visual treatments.
 *
 * Usage — single component:
 *   node inspect-styles.js <url> --selector "css" [--nth N] --output dir/
 *
 * Usage — batch mode:
 *   node inspect-styles.js --batch manifest.json
 *
 *   manifest.json format:
 *   [
 *     {"url": "http://...", "selector": "css", "nth": 0, "output": "dir/", "states": ["hover","focus","disabled"]},
 *     ...
 *   ]
 *
 * Output per component (written to output dir):
 *   computed-styles.json  — key CSS properties from getComputedStyle, plus
 *                           layoutContext { element, parent, viewport, derived }
 *                           used by build-component step 1a to detect intended
 *                           consumer width (parent ≫ element ⇒ fill:<parentWidth>)
 *   state-hover.png       — screenshot with :hover emulated (only if visually different)
 *   state-focus.png       — screenshot with :focus-visible emulated (only if visually different)
 *   state-disabled.png    — screenshot with [disabled] set (only if visually different)
 *   states.json           — which states were captured and which were skipped
 */

const { getBrowser } = require('./browser-connect');
const fs = require('fs');
const path = require('path');

const SCRIPT_TIMEOUT = 90000;
const _scriptTimer = setTimeout(() => {
  console.error('inspect-styles.js: script timeout after 90s — exiting');
  process.exit(124);
}, SCRIPT_TIMEOUT);
_scriptTimer.unref();

const STYLE_PROPERTIES = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderWidth',
  'borderStyle',
  'borderRadius',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'gap',
  'rowGap',
  'columnGap',
  'display',
  'flexDirection',
  'alignItems',
  'justifyContent',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'boxShadow',
  'opacity',
  'textDecoration',
  'textTransform',
  'overflow',
  'position',
  'cursor',
  'outline',
  'outlineOffset',
  'transition',
];

const DEFAULT_STATES = ['hover', 'focus', 'disabled'];

async function getComputedStyles(element) {
  return await element.evaluate((el, props) => {
    const cs = window.getComputedStyle(el);
    const styles = {};
    for (const prop of props) {
      styles[prop] = cs.getPropertyValue(
        prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
      );
    }

    const cssVars = {};
    const rootStyles = window.getComputedStyle(document.documentElement);
    const inlineStyle = el.getAttribute('style') || '';
    const classAttr = el.getAttribute('class') || '';
    cssVars._classes = classAttr;
    cssVars._inlineStyle = inlineStyle;

    return { styles, cssVars };
  }, STYLE_PROPERTIES);
}

async function getLayoutContext(element) {
  return await element.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const elementInfo = {
      offsetWidth: el.offsetWidth,
      offsetHeight: el.offsetHeight,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
      boundingRect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      },
    };

    const parent = el.parentElement;
    let parentInfo = null;
    if (parent) {
      const pcs = window.getComputedStyle(parent);
      const prect = parent.getBoundingClientRect();
      parentInfo = {
        tag: parent.tagName.toLowerCase(),
        id: parent.id || null,
        classes: parent.getAttribute('class') || '',
        offsetWidth: parent.offsetWidth,
        offsetHeight: parent.offsetHeight,
        clientWidth: parent.clientWidth,
        boundingRect: {
          width: Math.round(prect.width),
          height: Math.round(prect.height),
        },
        display: pcs.display,
        flexDirection: pcs.flexDirection,
        paddingLeft: pcs.paddingLeft,
        paddingRight: pcs.paddingRight,
        paddingTop: pcs.paddingTop,
        paddingBottom: pcs.paddingBottom,
        gap: pcs.gap,
      };
    }

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const elementFillsParent =
      parent && parent.clientWidth > 0
        ? Math.abs(el.offsetWidth - (parent.clientWidth -
            (parseFloat(window.getComputedStyle(parent).paddingLeft) || 0) -
            (parseFloat(window.getComputedStyle(parent).paddingRight) || 0))) <= 2
        : false;

    const hugRatio =
      parent && parent.clientWidth > 0 ? el.offsetWidth / parent.clientWidth : null;

    return {
      element: elementInfo,
      parent: parentInfo,
      viewport,
      derived: {
        elementFillsParent,
        elementToParentRatio: hugRatio,
      },
    };
  });
}

async function captureBaseScreenshot(element, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await element.screenshot({ path: outputPath });
  return outputPath;
}

async function getStyleFingerprint(element) {
  return await element.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return [
      cs.backgroundColor,
      cs.color,
      cs.borderColor,
      cs.boxShadow,
      cs.outline,
      cs.opacity,
      cs.textDecoration,
      cs.transform,
    ].join('|');
  });
}

async function inspectOne(page, { url, selector, nth = 0, output, states }) {
  const statesToCheck = states || DEFAULT_STATES;
  fs.mkdirSync(output, { recursive: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  const element = page.locator(selector).nth(nth);
  await element.waitFor({ state: 'visible', timeout: 8000 });

  const { styles, cssVars } = await getComputedStyles(element);
  const layoutContext = await getLayoutContext(element);
  const stylesPath = path.join(output, 'computed-styles.json');
  fs.writeFileSync(
    stylesPath,
    JSON.stringify({ styles, cssVars, layoutContext }, null, 2)
  );

  const baseFp = await getStyleFingerprint(element);

  const stateResults = {};

  for (const state of statesToCheck) {
    try {
      let captured = false;
      const statePath = path.join(output, `state-${state}.png`);

      if (state === 'hover') {
        await element.hover();
        await page.waitForTimeout(300);
        const fp = await getStyleFingerprint(element);
        if (fp !== baseFp) {
          await element.screenshot({ path: statePath });
          const hoverStyles = await getComputedStyles(element);
          stateResults.hover = { captured: true, path: statePath, styles: hoverStyles.styles };
          captured = true;
        }
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
      } else if (state === 'focus') {
        await element.focus();
        await page.waitForTimeout(300);
        const fp = await getStyleFingerprint(element);
        if (fp !== baseFp) {
          await element.screenshot({ path: statePath });
          const focusStyles = await getComputedStyles(element);
          stateResults.focus = { captured: true, path: statePath, styles: focusStyles.styles };
          captured = true;
        }
        await page.evaluate(() => {
          if (document.activeElement) document.activeElement.blur();
        });
        await page.waitForTimeout(200);
      } else if (state === 'disabled') {
        const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
        const supportsDisabled = ['button', 'input', 'select', 'textarea', 'fieldset'].includes(
          tagName
        );
        if (supportsDisabled) {
          await element.evaluate((el) => el.setAttribute('disabled', ''));
          await page.waitForTimeout(300);
          const fp = await getStyleFingerprint(element);
          if (fp !== baseFp) {
            await element.screenshot({ path: statePath });
            const disabledStyles = await getComputedStyles(element);
            stateResults.disabled = {
              captured: true,
              path: statePath,
              styles: disabledStyles.styles,
            };
            captured = true;
          }
          await element.evaluate((el) => el.removeAttribute('disabled'));
          await page.waitForTimeout(200);
        }
      }

      if (!captured && !stateResults[state]) {
        stateResults[state] = { captured: false, reason: 'no visual difference from default' };
      }
    } catch (err) {
      stateResults[state] = { captured: false, reason: err.message.split('\n')[0] };
    }
  }

  const statesPath = path.join(output, 'states.json');
  fs.writeFileSync(statesPath, JSON.stringify(stateResults, null, 2));

  const capturedCount = Object.values(stateResults).filter((s) => s.captured).length;
  console.log(
    `Inspected: ${output} — ${Object.keys(styles).length} properties, ${capturedCount} state screenshots`
  );

  return { stylesPath, stateResults, capturedCount };
}

const args = process.argv.slice(2);

const batchIdx = args.indexOf('--batch');
if (batchIdx !== -1) {
  const manifestPath = args[batchIdx + 1];
  if (!manifestPath) {
    console.error('Usage: node inspect-styles.js --batch manifest.json');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  (async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const results = { inspected: [], failed: [] };

    for (const entry of manifest) {
      try {
        const result = await inspectOne(page, entry);
        results.inspected.push({ output: entry.output, ...result });
      } catch (err) {
        console.error(`Failed ${entry.output}: ${err.message.split('\n')[0]}`);
        results.failed.push({ output: entry.output, error: err.message.split('\n')[0] });
      }
    }

    await browser.close();
    console.log(
      `\nBatch complete: ${results.inspected.length} inspected, ${results.failed.length} failed`
    );
  })().catch((err) => {
    console.error(err.message.split('\n')[0]);
    process.exit(1);
  });
} else {
  if (args.length < 2) {
    console.error(
      'Usage: node inspect-styles.js <url> --selector "css" [--nth N] --output dir/ [--states hover,focus,disabled]'
    );
    process.exit(1);
  }

  const url = args[0];
  let selector = null,
    nthIndex = 0,
    outputDir = null,
    states = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--selector') selector = args[++i];
    else if (args[i] === '--nth') nthIndex = Number(args[++i]);
    else if (args[i] === '--output') outputDir = args[++i];
    else if (args[i] === '--states') states = args[++i].split(',');
  }

  if (!selector || !outputDir) {
    console.error('--selector and --output are required');
    process.exit(1);
  }

  (async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await inspectOne(page, { url, selector, nth: nthIndex, output: outputDir, states });
    await browser.close();
  })().catch((err) => {
    console.error(err.message.split('\n')[0]);
    process.exit(1);
  });
}
