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
    await popup.getByRole('combobox', { name: 'History limit' }).selectOption('200');
    await page.waitForFunction(() => localStorage.getItem('spotify-web-local-queue-history-v1-limit') === '200');
    check(true, 'Toolbar retention changes persist in Spotify site storage');
    check(await popup.locator('#position').inputValue() === 'player', 'Button position defaults to Player bar');
    await popup.locator('#position').selectOption('floating');
    await page.waitForFunction(() => localStorage.getItem('spotify-web-local-queue-history-v1-position') === 'floating');
    check(await page.locator('#swh-root .trigger').evaluate(button => button.classList.contains('icon-trigger') && !button.classList.contains('player-trigger') &&
      getComputedStyle(button.querySelector('.trigger-label')).display === 'none' && getComputedStyle(button.querySelector('.trigger-count')).display === 'none'),
      'Toolbar position setting immediately switches the page to an icon-only floating button');
    await page.reload();
    await page.locator('#swh-root .trigger.icon-trigger').waitFor();
    check(await page.evaluate(() => localStorage.getItem('spotify-web-local-queue-history-v1-position')) === 'floating', 'Button position survives a real Spotify-tab reload');
    await popup.reload();
    await popup.waitForFunction(() => document.querySelector('#position').value === 'floating' && document.querySelector('#connection').hidden);
    check(true, 'Reopened toolbar popup restores the saved position');
    await popup.locator('#options').click();
    if (process.env.PLACEMENT_CAPTURE_DIR) await popup.locator('.panel').screenshot({
      path: require('node:path').join(process.env.PLACEMENT_CAPTURE_DIR, 'popup-position-settings.png')
    });
    await popup.locator('#position').selectOption('header');
    await page.locator('#swh-root .trigger.header-trigger').waitFor();
    check(await page.locator('a[href="/download"]').isVisible() && await page.locator('header button').count() === 0,
      'Top bar preference preserves Install App and keeps the trigger outside Spotify’s header DOM');
    await page.getByRole('button', { name: 'History 1', exact: true }).click();
    await page.locator('#swh-root .settings-toggle').click();
    await page.getByRole('combobox', { name: 'Button position' }).selectOption('player');
    await popup.waitForFunction(() => document.querySelector('#position').value === 'player');
    check(await page.evaluate(() => localStorage.getItem('spotify-web-local-queue-history-v1-position')) === 'player',
      'In-page position changes persist and synchronize back to the toolbar popup');
    await page.getByRole('button', { name: 'History 1', exact: true }).click();
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
    for (const [language, title, search, queue, remove, copied, limit] of [
      ['pt-BR', 'Histórico', 'Buscar no histórico', 'Adicionar à fila', 'Remover', 'Link de First track copiado.', '200 músicas'],
      ['es-MX', 'Historial', 'Buscar en el historial', 'Añadir a la cola', 'Eliminar', 'Enlace de First track copiado.', '200 canciones']
    ]) {
      const localizedPage = await context.newPage();
      const localizedPopup = await context.newPage();
      for (const target of [localizedPage, localizedPopup]) {
        target.on('pageerror', error => errors.push(error.message));
        await target.addInitScript(({ language }) => {
          Object.defineProperty(navigator, 'language', { value: language, configurable: true });
        }, { language });
      }
      await localizedPage.addInitScript(({ saved }) => {
        localStorage.setItem('spotify-web-local-queue-history-v1', saved);
      }, { saved });
      await localizedPage.goto('https://open.spotify.com/');
      await localizedPage.getByRole('button', { name: `${title} 1`, exact: true }).waitFor();
      await localizedPopup.setViewportSize({ width: 400, height: 580 });
      await localizedPopup.goto(`chrome-extension://${extensionId}/popup.html`);
      await localizedPopup.locator('#entries .song').waitFor();
      check(await localizedPopup.locator('h1').textContent() === `${title} 1` &&
        await localizedPopup.getByRole('searchbox').getAttribute('placeholder') === search,
        `${language}: packaged popup and page use the browser language`);
      await localizedPopup.locator('#options').click();
      check(await localizedPopup.locator('option[value="200"]').textContent() === limit,
        `${language}: popup settings are translated`);
      check(await localizedPopup.locator('#position option').allTextContents().then(labels => labels.join('|') ===
        (language==='pt-BR'?'Barra do player|Botão flutuante|Barra superior':'Barra de reproducción|Botón flotante|Barra superior')),
        `${language}: all three button positions are translated`);
      check(await localizedPopup.locator('.settings').evaluate(element=>element.scrollWidth<=element.clientWidth),
        `${language}: position settings fit without horizontal overflow`);
      await localizedPopup.locator('.more-action').click();
      check(await localizedPopup.locator('.row-actions button').first().textContent() === queue,
        `${language}: popup Queue label is translated`);
      await localizedPopup.locator('.row-actions button').nth(1).click();
      await localizedPopup.getByRole('status').filter({ hasText: copied }).waitFor();
      check(true, `${language}: popup Copy link shows a translated status`);
      check(await localizedPopup.locator('.top').evaluate(header => header.scrollWidth <= header.clientWidth),
        `${language}: popup header fits without horizontal overflow`);
      await localizedPopup.locator('.more-action').click();
      await localizedPopup.getByRole('menuitem', { name: new RegExp(remove) }).click();
      await localizedPage.getByRole('button', { name: title, exact: true }).waitFor();
      check(await localizedPage.evaluate(() => localStorage.getItem('spotify-web-local-queue-history-v1')) === '[]',
        `${language}: translated Remove updates the shared page history`);
      await localizedPopup.close();
      await localizedPage.close();
    }
    check(errors.length === 0, `No page errors from bundled startup: ${errors.join(', ')}`);
    return results;
  } finally {
    await context.close();
  }
};
