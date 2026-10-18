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
  let extensionId;
  const errors = [];
  const check = (value, message) => {
    if (!value) throw new Error(message);
    results.push(message);
  };
  try {
    if (executablePath) {
      const session = await context.browser().newBrowserCDPSession();
      extensionId = (await session.send('Extensions.loadUnpacked', { path: extensionPath })).id;
      await session.detach();
    } else {
      extensionId = require('node:crypto').createHash('sha256').update(extensionPath).digest('hex')
        .slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)));
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
    const popup = await context.newPage();
    popup.on('pageerror', error => errors.push(error.message));
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.locator('#entries .song').waitFor({ timeout: 10000 });
    check(await popup.locator('#entries .song').textContent() === 'First track', 'Toolbar popup reads the same Spotify history');
    check(await popup.evaluate(() => chrome.runtime.getManifest().action.default_popup) === 'popup.html', 'Toolbar action opens the history popup');
    await popup.getByRole('searchbox').fill('missing song');
    check(await popup.getByText('No matching tracks.', { exact: true }).isVisible(), 'Toolbar popup searches local history');
    await popup.getByRole('searchbox').fill('');
    await popup.getByRole('button', { name: 'History options', exact: true }).click();
    await popup.getByRole('combobox').selectOption('200');
    await page.waitForFunction(() => localStorage.getItem('spotify-web-local-queue-history-v1-limit') === '200');
    check(true, 'Toolbar retention changes persist in Spotify site storage');
    const downloadPromise = popup.waitForEvent('download');
    await popup.getByRole('button', { name: 'Export', exact: true }).click();
    check((await downloadPromise).suggestedFilename().endsWith('.json'), 'Toolbar export downloads a JSON backup');
    await popup.locator('#file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    await popup.getByRole('status').filter({ hasText: /JSON/ }).waitFor();
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('spotify-web-local-queue-history-v1')).length) === 1,
      'Invalid toolbar import leaves history intact');
    const saved = await page.evaluate(() => localStorage.getItem('spotify-web-local-queue-history-v1'));
    await popup.locator('#file').setInputFiles({ name: 'history.json', mimeType: 'application/json', buffer: Buffer.from(saved) });
    await popup.getByRole('status').filter({ hasText: /imported/ }).waitFor();
    check(await popup.locator('#entries .song').count() === 1, 'Toolbar import skips duplicate plays');
    await page.evaluate(() => {
      window.__queuedIds = [];
      window.__documentMarker = 'same document';
      window.addEventListener('popstate', () => {
        if (!location.pathname.endsWith('/tracks')) return;
        const list = document.createElement('div');
        list.dataset.testid = 'infinite-scroll-list';
        const row = document.createElement('div');
        row.setAttribute('role', 'row');
        const link = document.createElement('a');
        link.href = '/track/35JhxrwW2bBAiMcnrmuLEN';
        link.textContent = 'First track';
        const more = document.createElement('button');
        more.dataset.testid = 'more-button';
        more.textContent = 'More';
        more.addEventListener('click', () => {
          const menu = document.createElement('div');
          menu.setAttribute('role', 'menu');
          const album = document.createElement('a');
          album.href = '/album/Album?highlight=spotify:track:35JhxrwW2bBAiMcnrmuLEN';
          const queue = document.createElement('button');
          queue.setAttribute('role', 'menuitem');
          queue.textContent = 'Add to queue';
          queue.addEventListener('click', () => { window.__queuedIds.push('35JhxrwW2bBAiMcnrmuLEN'); menu.remove(); });
          menu.append(album, queue);
          document.body.append(menu);
        });
        row.append(link, more);
        list.append(row);
        document.querySelector('main').replaceChildren(list);
      });
    });
    await popup.locator('.entry').hover();
    await popup.getByRole('button', { name: 'More options for First track', exact: true }).click();
    check(await popup.getByRole('menuitem', { name: 'Add First track to queue' }).isVisible(), 'Toolbar row menu exposes native Queue');
    await popup.getByRole('menuitem', { name: 'Add First track to queue' }).click();
    await popup.getByRole('status').filter({ hasText: /Queue request sent/ }).waitFor();
    check(await page.evaluate(() => window.__queuedIds.join()) === '35JhxrwW2bBAiMcnrmuLEN', 'Toolbar Queue invokes the exact native track action');
    check(new URL(page.url()).pathname === '/' && await page.evaluate(() => window.__documentMarker) === 'same document',
      'Toolbar Queue restores the previous page without reloading');
    await popup.locator('.entry').hover();
    await popup.getByRole('button', { name: 'More options for First track', exact: true }).click();
    await popup.getByRole('menuitem', { name: 'Copy link to First track' }).click();
    await popup.getByRole('status').filter({ hasText: /Link copied/ }).waitFor();
    check(true, 'Toolbar Copy link writes through a real browser click');
    await popup.locator('.entry').hover();
    await popup.getByRole('button', { name: 'More options for First track', exact: true }).click();
    await popup.getByRole('menuitem', { name: 'Remove First track from history' }).click();
    await page.getByRole('button', { name: 'History', exact: true }).waitFor();
    check(await page.evaluate(() => localStorage.getItem('spotify-web-local-queue-history-v1')) === '[]', 'Toolbar Remove updates the in-page history and storage');
    await popup.locator('#file').setInputFiles({ name: 'history.json', mimeType: 'application/json', buffer: Buffer.from(saved) });
    await popup.locator('#entries .song').waitFor();
    popup.once('dialog', dialog => dialog.dismiss());
    await popup.getByRole('button', { name: 'Clear', exact: true }).click();
    check(await popup.locator('#entries .song').count() === 1, 'Canceling toolbar Clear preserves history');
    popup.once('dialog', dialog => dialog.accept());
    await popup.getByRole('button', { name: 'Clear', exact: true }).click();
    await popup.getByText('No previous tracks yet.', { exact: false }).waitFor();
    check(await page.evaluate(() => localStorage.getItem('spotify-web-local-queue-history-v1')) === '[]', 'Toolbar Clear deletes the shared history');
    await popup.locator('#file').setInputFiles({ name: 'history.json', mimeType: 'application/json', buffer: Buffer.from(saved) });
    await popup.locator('#entries .song').waitFor();
    await popup.locator('.track-link').click();
    await page.waitForURL('**/search/First%20track%20Artist');
    check(await page.evaluate(() => window.__documentMarker) === 'same document', 'Toolbar Find navigates Spotify without reloading or starting playback');
    const navigation = await context.newPage();
    await navigation.goto(`chrome-extension://${extensionId}/popup.html`);
    await navigation.locator('#entries .song').waitFor();
    await navigation.getByRole('button', { name: 'Back', exact: true }).click();
    await page.waitForURL('https://open.spotify.com/');
    await navigation.getByRole('button', { name: 'Forward', exact: true }).click();
    await page.waitForURL('**/search/First%20track%20Artist');
    check(true, 'Toolbar Back and Forward navigate the Spotify tab');
    await page.goto('https://example.org/');
    check(await page.locator('#swh-root').count() === 0, 'The extension does not inject outside open.spotify.com');
    await navigation.getByRole('button', { name: 'Open Spotify', exact: true }).waitFor({ timeout: 6000 });
    check(await navigation.getByRole('searchbox').isDisabled(), 'Toolbar without a Spotify tab explains how to connect');
    check(errors.length === 0, `No page errors from bundled startup: ${errors.join(', ')}`);
    return results;
  } finally {
    await context.close();
  }
};
