const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const capture = require('../store/source/capture.cjs');

(async () => {
  const root = path.resolve(__dirname, '..');
  const executablePath = process.env.EXTENSION_BROWSER_EXECUTABLE;
  const options = executablePath ? {
    executablePath, headless: true, timeout: 15000,
    ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging']
  } : {
    channel: 'chromium', headless: true, timeout: 15000,
    args: [`--disable-extensions-except=${root}/extension`, `--load-extension=${root}/extension`]
  };
  const context = await chromium.launchPersistentContext('', options);
  try {
    let extensionId;
    if (executablePath) {
      const session = await context.browser().newBrowserCDPSession();
      extensionId = (await session.send('Extensions.loadUnpacked', { path: `${root}/extension` })).id;
      await session.detach();
    } else {
      extensionId = require('node:crypto').createHash('sha256').update(`${root}/extension`).digest('hex')
        .slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)));
    }
    const result = await capture(context, {
      root, extensionId, iconData: `data:image/png;base64,${fs.readFileSync(`${root}/assets/icon-glass-master.png`).toString('base64')}`,
      backdropData: `data:image/png;base64,${fs.readFileSync(`${root}/assets/mesh-backdrop.png`).toString('base64')}`,
      playlist: JSON.parse(fs.readFileSync(`${root}/store/source/playlist.json`, 'utf8')),
      productName: JSON.parse(fs.readFileSync(`${root}/extension/manifest.json`, 'utf8')).name
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
