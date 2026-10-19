const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const executablePath = process.env.EXTENSION_BROWSER_EXECUTABLE;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const page = await browser.newPage();
    const icon = `data:image/png;base64,${fs.readFileSync(`${root}/assets/icon-glass-master.png`).toString('base64')}`;
    for (const size of [16, 32, 48, 128]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<style>html,body{margin:0;background:transparent}img{position:absolute;left:2vw;top:2vh;width:96vw;height:96vh}</style><img src="${icon}" alt="">`);
      await page.locator('img').evaluate(image => image.decode());
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: `${root}/extension/icons/icon-${size}.png`, omitBackground: true, scale: 'css' });
    }
    const toolbar = `data:image/svg+xml;base64,${fs.readFileSync(`${root}/assets/icon.svg`).toString('base64')}`;
    for (const size of [16, 24, 32]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:100vw;height:100vh}</style><img src="${toolbar}" alt="">`);
      await page.locator('img').evaluate(image => image.decode());
      await page.screenshot({ path: `${root}/extension/icons/toolbar-${size}.png`, omitBackground: true, scale: 'css' });
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
