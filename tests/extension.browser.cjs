// Load the actual unpacked extension. Chrome for Testing is the default browser.
module.exports = async function verifyExtension(chromium, extensionPath, executablePath) {
  const options = { headless: true, timeout: 15000 };
  if (executablePath) {
    options.executablePath = executablePath;
    options.ignoreDefaultArgs = ['--disable-extensions'];
    options.args = ['--enable-unsafe-extension-debugging'];
  } else {
    options.channel = 'chromium';
    options.args = [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`];
  }
  const context = await chromium.launchPersistentContext('', options);
  const results = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw new Error(message);
    results.push(message);
  };
  try {
    if (executablePath) {
      const session = await context.browser().newBrowserCDPSession();
      await session.send('Extensions.loadUnpacked', { path: extensionPath });
      await session.detach();
    }
    const fixture = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="require-trusted-types-for 'script'"></head>
      <body><header style="display:flex;justify-content:space-between;height:48px">
      <a href="/" aria-label="Spotify" style="width:32px;height:32px">Spotify</a><a href="/download">Install App</a></header>
      <main>Local test fixture</main><footer data-testid="now-playing-widget">
      <div data-testid="context-item-info-title"><a href="/track/35JhxrwW2bBAiMcnrmuLEN">First track</a></div>
      <a href="/artist/Artist">Artist</a></footer></body></html>`;
    await context.route('https://open.spotify.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await context.route('https://example.org/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://open.spotify.com/');
    await page.getByRole('button', { name: 'History', exact: true }).waitFor({ timeout: 10000 });
    check(await page.locator('#swh-root').count() === 1, 'Manifest injects the unpacked extension automatically on Spotify');
    await page.evaluate(() => {
      const link = document.querySelector('[data-testid="context-item-info-title"] a');
      link.href = '/track/6EUidHGbVvqs5GYf6KBMTu';
      link.textContent = 'Second track';
    });
    await page.getByRole('button', { name: 'History 1', exact: true }).waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: 'History 1', exact: true }).click();
    check(await page.locator('#swh-root .song').textContent() === 'First track', 'Bundled code records a track change');
    await page.getByRole('button', { name: 'More options for First track', exact: true }).click();
    check(await page.getByRole('menu', { name: 'Actions for First track' }).isVisible(), 'Bundled menu opens without a CSP error');
    await page.reload();
    await page.getByRole('button', { name: 'History 1', exact: true }).waitFor({ timeout: 10000 });
    check(await page.locator('#swh-root').count() === 1, 'History survives a reload and UI is injected only once');
    await page.goto('https://example.org/');
    check(await page.locator('#swh-root').count() === 0, 'The extension does not inject outside open.spotify.com');
    check(errors.length === 0, `No page errors from bundled startup: ${errors.join(', ')}`);
    return results;
  } finally {
    await context.close();
  }
};
