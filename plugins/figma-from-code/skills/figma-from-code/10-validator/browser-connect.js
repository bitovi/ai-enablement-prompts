const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ENDPOINT_FILE = path.resolve('.temp/figma-from-code/pw-endpoint.txt');

async function getBrowser() {
  try {
    const wsEndpoint = fs.readFileSync(ENDPOINT_FILE, 'utf-8').trim();
    return await chromium.connect(wsEndpoint);
  } catch (err) {
    const reason = fs.existsSync(ENDPOINT_FILE)
      ? `endpoint unreachable (${err.message.split('\n')[0]})`
      : 'no endpoint file';
    console.error(`[browser-connect] Shared server not available: ${reason}. Launching standalone browser.`);
    return await chromium.launch();
  }
}

module.exports = { getBrowser };
