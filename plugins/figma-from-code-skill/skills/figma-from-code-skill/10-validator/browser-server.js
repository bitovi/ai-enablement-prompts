const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ENDPOINT_FILE = path.resolve('.temp/figma-from-code/pw-endpoint.txt');
const PID_FILE = path.resolve('.temp/figma-from-code/pw-server.pid');

(async () => {
  fs.mkdirSync(path.dirname(ENDPOINT_FILE), { recursive: true });
  const server = await chromium.launchServer();
  const wsEndpoint = server.wsEndpoint();
  fs.writeFileSync(ENDPOINT_FILE, wsEndpoint);
  fs.writeFileSync(PID_FILE, String(process.pid));
  console.log(`Playwright server started (pid ${process.pid}): ${wsEndpoint}`);

  function cleanup() {
    try { fs.unlinkSync(ENDPOINT_FILE); } catch {}
    try { fs.unlinkSync(PID_FILE); } catch {}
    server.close();
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
})();
