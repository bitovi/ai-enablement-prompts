/**
 * Pixel-level visual comparison of two screenshot images.
 *
 * Loads both images into a headless browser canvas, walks every pixel to
 * compute an overall match percentage and a separate border-ring match
 * percentage, then writes a red-highlighted diff image and a JSON report
 * to the output directory. Exit code signals the verdict:
 *   0 = match, 1 = minor_diff, 2 = mismatch, 3 = error.
 */

const { getBrowser } = require('./browser-connect');
const path = require('path');
const fs   = require('fs');

/**
 * Parse CLI arguments into positional args and `--flag value` pairs.
 * Numeric flag values are coerced to floats.
 * @param {string[]} argv - Raw argument list (typically `process.argv.slice(2)`).
 * @returns {{ positional: string[], flags: Record<string, number> }}
 */
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) {
      flags[argv[i].slice(2)] = parseFloat(argv[i + 1]);
      i++;
    } else {
      positional.push(argv[i]);
    }
  }
  return { positional, flags };
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const [imageA, imageB, outputDir] = positional;

if (!imageA || !imageB || !outputDir) {
  console.error('Usage: node compare.js <imageA> <imageB> <outputDir> [--match-threshold N] [--defect-threshold N] [--border-ring N] [--border-threshold N] [--tolerance N]');
  process.exit(1);
}

const MATCH_THRESHOLD  = flags['match-threshold']  ?? 90;
const DEFECT_THRESHOLD = flags['defect-threshold'] ?? 75;
const BORDER_RING      = flags['border-ring']      ?? 4;
const BORDER_THRESHOLD = flags['border-threshold'] ?? 85;
const TOLERANCE        = flags['tolerance']        ?? 28;

const absA = path.resolve(imageA);
const absB = path.resolve(imageB);
fs.mkdirSync(outputDir, { recursive: true });

/**
 * Read an image file from disk and return it as a base64-encoded data URL.
 * @param {string} filePath - Absolute or relative path to a PNG image.
 * @returns {string} A `data:image/png;base64,...` data URL.
 */
function toDataUrl(filePath) {
  const bytes = fs.readFileSync(filePath);
  return 'data:image/png;base64,' + bytes.toString('base64');
}

(async () => {
  const browser = await getBrowser();
  const page    = await browser.newPage();
  await page.goto('about:blank');

  const result = await page.evaluate(async ({
    urlA, urlB,
    matchThreshold, defectThreshold, borderRing, borderThreshold, tolerance,
  }) => {
    /**
     * Load an image from a data URL into an HTMLImageElement.
     * @param {string} src - Image source (data URL or remote URL).
     * @returns {Promise<HTMLImageElement>} Resolves when the image is decoded.
     */
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
      });
    }

    const [imgA, imgB] = await Promise.all([loadImage(urlA), loadImage(urlB)]);

    const w = imgB.naturalWidth;
    const h = imgB.naturalHeight;

    const cvA = document.createElement('canvas'); cvA.width = w; cvA.height = h;
    const cvB = document.createElement('canvas'); cvB.width = w; cvB.height = h;
    const cvD = document.createElement('canvas'); cvD.width = w; cvD.height = h;

    cvA.getContext('2d').drawImage(imgA, 0, 0, w, h);
    cvB.getContext('2d').drawImage(imgB, 0, 0, w, h);

    const dataA   = cvA.getContext('2d').getImageData(0, 0, w, h);
    const dataB   = cvB.getContext('2d').getImageData(0, 0, w, h);
    const diffImg = cvD.getContext('2d').createImageData(w, h);

    let diffPixels   = 0;
    let borderDiff   = 0;
    let borderTotal  = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const rD = Math.abs(dataA.data[i]     - dataB.data[i]);
        const gD = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
        const bD = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
        const maxDiff = Math.max(rD, gD, bD);
        const isDiff  = maxDiff > tolerance;

        const inBorder = x < borderRing || x >= w - borderRing
                      || y < borderRing || y >= h - borderRing;

        if (isDiff) diffPixels++;
        if (inBorder) {
          borderTotal++;
          if (isDiff) borderDiff++;
        }

        if (isDiff) {
          diffImg.data[i] = 255; diffImg.data[i+1] = 0; diffImg.data[i+2] = 0; diffImg.data[i+3] = 220;
        } else {
          diffImg.data[i]   = dataA.data[i]   >> 1;
          diffImg.data[i+1] = dataA.data[i+1] >> 1;
          diffImg.data[i+2] = dataA.data[i+2] >> 1;
          diffImg.data[i+3] = 255;
        }
      }
    }

    cvD.getContext('2d').putImageData(diffImg, 0, 0);

    const total          = w * h;
    const matchPct       = Math.round(((total - diffPixels) / total) * 10000) / 100;
    const borderMatchPct = borderTotal > 0
      ? Math.round(((borderTotal - borderDiff) / borderTotal) * 10000) / 100
      : 100;

    const verdict       = matchPct >= matchThreshold ? 'match'
                        : matchPct >= defectThreshold ? 'minor_diff'
                        : 'mismatch';
    const borderVerdict = borderMatchPct >= borderThreshold ? 'border_ok' : 'border_diff';

    return {
      matchPct, borderMatchPct,
      diffPixels, totalPixels: total,
      borderDiff, borderTotal,
      verdict, borderVerdict,
      w, h,
      diffDataUrl: cvD.toDataURL('image/png'),
    };
  }, { urlA: toDataUrl(absA), urlB: toDataUrl(absB),
       matchThreshold: MATCH_THRESHOLD, defectThreshold: DEFECT_THRESHOLD,
       borderRing: BORDER_RING, borderThreshold: BORDER_THRESHOLD, tolerance: TOLERANCE });

  const b64 = result.diffDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(outputDir, 'diff.png'), Buffer.from(b64, 'base64'));

  const json = {
    matchPct:       result.matchPct,
    borderMatchPct: result.borderMatchPct,
    diffPixels:     result.diffPixels,
    totalPixels:    result.totalPixels,
    borderDiff:     result.borderDiff,
    borderTotal:    result.borderTotal,
    normalizedW:    result.w,
    normalizedH:    result.h,
    verdict:        result.verdict,
    borderVerdict:  result.borderVerdict,
    thresholds: {
      match: MATCH_THRESHOLD, defect: DEFECT_THRESHOLD,
      borderRing: BORDER_RING, border: BORDER_THRESHOLD,
      tolerance: TOLERANCE,
    },
  };
  fs.writeFileSync(path.join(outputDir, 'comparison.json'), JSON.stringify(json, null, 2));

  await browser.close();

  const effectiveVerdict = result.borderVerdict === 'border_diff' && result.verdict === 'match'
    ? 'minor_diff' : result.verdict;

  const icon = effectiveVerdict === 'match' ? '✅' : effectiveVerdict === 'minor_diff' ? '⚠️' : '❌';
  console.log(`${icon} ${effectiveVerdict.toUpperCase()} — overall ${result.matchPct}% | border ${result.borderMatchPct}% (${result.borderDiff}/${result.borderTotal} border px differ)`);
  console.log(`   diff → ${path.join(outputDir, 'diff.png')}`);

  process.exit(effectiveVerdict === 'mismatch' ? 2 : effectiveVerdict === 'minor_diff' ? 1 : 0);
})().catch(err => {
  console.error('compare.js error:', err.message);
  process.exit(3);
});
