const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const verifyHistory = require('./queue-history.browser.cjs');
const verifyExtension = require('./extension.browser.cjs');

(async () => {
  const root = path.resolve(__dirname, '..');
  const executablePath = process.env.EXTENSION_BROWSER_EXECUTABLE;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  let results;
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 682 } });
    results = await verifyHistory(page, fs.readFileSync(path.join(root, 'extension/history.js'), 'utf8'),
      fs.readFileSync(path.join(root, 'Spotify Web - Queue History-0.1.0.txt'), 'utf8'));
  } finally {
    await browser.close();
  }
  results.push(...await verifyExtension(chromium, path.join(root, 'extension'), executablePath));
  for (const result of results) console.log(`PASS ${result}`);
  console.log(`${results.length} browser checks passed.`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
