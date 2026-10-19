// Run with an existing Playwright page and the userscript source; no Spotify account needed.
module.exports = async function verifyQueueHistory(page, source, original) {
  const key = 'spotify-web-local-queue-history-v1';
  const results = [];
  const check = (value, message) => {
    if (!value) throw new Error(message);
    results.push(message);
  };
  const fixture = (name, id, kind = 'album') => {
    const href = kind === 'track' ? `/track/${id}` :
      kind === 'album' ? `/album/Album1?highlight=spotify%3Atrack%3A${id}` : '/album/Album1';
    return `<footer data-testid="now-playing-bar"><div data-testid="now-playing-widget">
      <a href="${href}"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="></a>
      <div data-testid="context-item-info-title"><a href="${href}">${name}</a></div>
      <a href="/artist/Artist1">Artist</a><a href="/artist/Artist1">Artist</a>
    </div></footer>`;
  };
  const boot = async (script, markup, stored = '[]', capacity = 50, language = 'en-US') => {
    await page.setContent(markup);
    await page.evaluate(({ script, key, stored, capacity, language }) => {
      Object.defineProperty(navigator, 'language', { configurable: true, value: language });
      const values = new Map([[key, stored], [`${key}-limit`, String(capacity)]]);
      Object.defineProperty(window, 'localStorage', { configurable: true, value: {
        getItem: name => values.get(name) ?? null,
        setItem: (name, value) => values.set(name, value)
      }});
      window.setInterval = callback => { window.__historyTick = callback; return 1; };
      delete window.__spotifyQueueHistoryInstalled;
      // Absolute URLs let these fixtures run on about:blank without navigation.
      (0, eval)(script);
    }, { script, key, stored, capacity, language });
  };
  const absolute = markup => markup.replaceAll('href="/', 'href="https://open.spotify.com/');
  const change = async markup => page.evaluate(markup => {
    document.querySelector('footer')?.remove();
    document.body.insertAdjacentHTML('afterbegin', markup);
    window.__historyTick();
  }, absolute(markup));
  const history = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const shadowText = selector => page.evaluate(selector =>
    document.querySelector('#swh-root').shadowRoot.querySelector(selector).textContent, selector);

  if (original) {
    await boot(original, absolute(fixture('First', 'Track1')));
    await change(fixture('Second', 'Track2'));
    check((await history()).length === 0, 'Original script reproduces empty history for album links');
  }

  await boot(source, absolute(fixture('First', 'Track1')));
  check((await shadowText('.hint')) === 'Tracking: First.', 'Status identifies the detected current track');
  await change(fixture('Second', 'Track2'));
  let entries = await history();
  check(entries.length === 1 && entries[0].name === 'First' &&
    entries[0].url === 'https://open.spotify.com/track/Track1', 'Album highlight URLs record the previous track with its exact link');
  check(entries[0].artist === 'Artist', 'Repeated artist links do not duplicate artist names');
  await change(fixture('Second', 'Track2'));
  check((await history()).length === 1, 'Unchanged tracks are not recorded repeatedly');
  await page.locator('#swh-root').getByRole('button', { name: 'History 1', exact: true }).click();
  check((await shadowText('.song')) === 'First', 'History panel renders the saved song');

  await boot(source, absolute(fixture('First', 'Track1', 'track')));
  await change(fixture('Second', 'Track2', 'track'));
  check((await history())[0]?.name === 'First', 'Direct track links still work when artwork comes before the title');

  await boot(source, absolute(fixture('First', 'Track1', 'plain')));
  await change(fixture('Second', 'Track2', 'plain'));
  entries = await history();
  check(entries.length === 1 && entries[0].url.includes('/search/First%20Artist'),
    'Titles sharing an album URL are distinguished without a track ID');
  await change(fixture('Second', 'Track2'));
  check((await history()).length === 1, 'Recovering a track ID does not create a false song change');

  await boot(source, absolute(fixture('First', 'Track1', 'plain')).replace(
    'href="https://open.spotify.com/album/Album1"', 'href="https://open.spotify.com/track/Track1"'
  ));
  await change(fixture('Second', 'Track2'));
  check((await history())[0]?.id === 'Track1', 'Track IDs can be read from artwork when the title only links to an album');
  await boot(source, absolute(fixture('First', 'Track1', 'plain')).replace(
    'data-testid="now-playing-widget"', 'data-testid="now-playing-widget" data-uri="spotify:track:Track1"'
  ));
  await change(fixture('Second', 'Track2'));
  check((await history())[0]?.id === 'Track1', 'Player URI attributes preserve exact track IDs without a track link');

  const albumOnlyPlayer = `<div data-testid="now-playing-widget" role="region" aria-label="Now playing: Alarm Call by Anne Clark">
    <button data-testid="cover-art-button" aria-label="Now playing view"></button>
    <div data-testid="context-item-info-title"><span draggable="true"><a draggable="false"
      data-testid="context-item-link" href="/album/3zCkzfXAbM5syZsKAzqjRl">Alarm Call</a></span></div>
    <div data-testid="context-item-info-subtitles"><span><a draggable="true" data-testid="context-item-info-artist"
      href="/artist/0RSRLPv7ZmcrlyboVGR0hL">Anne Clark</a></span></div>
    <button aria-checked="true" aria-label="Add to playlist"></button>
  </div>`;
  await boot(source, absolute(albumOnlyPlayer));
  await page.evaluate(() => {
    window.__dragCounts = { start: 0, end: 0 };
    const title = document.querySelector('[data-testid="context-item-info-title"] [draggable="true"]');
    title.addEventListener('dragstart', event => {
      window.__dragCounts.start++;
      event.dataTransfer.setData('text/x-spotify-context', '');
      event.dataTransfer.setData('text/uri-list', 'https://open.spotify.com/track/35JhxrwW2bBAiMcnrmuLEN');
      event.dataTransfer.setData('text/plain', 'https://open.spotify.com/track/35JhxrwW2bBAiMcnrmuLEN');
      event.dataTransfer.setData('text/x-spotify-section', '0');
      event.dataTransfer.setData('text/x-spotify-tracks', 'spotify:track:35JhxrwW2bBAiMcnrmuLEN');
    });
    title.addEventListener('dragend', () => { window.__dragCounts.end++; });
    window.__historyTick();
    window.__historyTick();
    window.__historyTick();
  });
  check(await page.evaluate(() => window.__dragCounts.start === 1 && window.__dragCounts.end === 1),
    'Native drag data is cached and every probe ends its drag session');
  await page.evaluate(() => document.querySelector('[data-testid="now-playing-widget"]').remove());
  await change(fixture('Second', 'Track2'));
  const recovered = (await history())[0];
  check(recovered?.id === '35JhxrwW2bBAiMcnrmuLEN' && recovered.name === 'Alarm Call' && recovered.artist === 'Anne Clark' &&
    recovered.url === 'https://open.spotify.com/track/35JhxrwW2bBAiMcnrmuLEN',
    'The album-only player markup records the exact track ID from the observed Spotify drag payload');

  await boot(source, '<main>No player yet</main>');
  check((await shadowText('.hint')).includes('Waiting for Spotify'), 'Missing player shows a waiting status');
  await change(fixture('First', 'Track1'));
  await change(fixture('Second', 'Track2'));
  check((await history()).length === 1, 'Recording starts when Spotify mounts its player later');

  const saved = await page.evaluate(key => localStorage.getItem(key), key);
  await boot(source, absolute(fixture('Second', 'Track2')), saved);
  check((await shadowText('.trigger')) === 'History 1', 'Saved history is restored on reload');
  check(await page.getByRole('button', { name: 'History 1', exact: true }).evaluate(button => {
    const count = button.querySelector('span');
    return !/[()]/.test(button.textContent) && count?.textContent === '1' && getComputedStyle(count).color === 'rgb(30, 215, 96)';
  }), 'History count is green and has no brackets');
  for (let index = 0; index < 55; index++) await change(fixture(`Song ${index}`, `Track${index}`));
  check((await history()).length === 50, 'Stored history stays capped at 50 tracks');

  await boot(source, absolute(fixture('First', 'Track1')), '{broken');
  await change(fixture('Second', 'Track2'));
  check((await history()).length === 1, 'Malformed storage does not stop new recordings');
  await page.locator('#swh-root').getByRole('button', { name: 'History 1', exact: true }).click();

  const header = `<style>
    body { margin: 0; background: #121212; color: white; font: 14px system-ui; }
    header { display: flex; justify-content: flex-end; align-items: center; gap: 24px; height: 48px; padding: 0 24px; background: black; }
    .spotify-logo { position: absolute; top: 8px; left: 16px; width: 32px; height: 32px; border-radius: 50%; background: white; color: black; text-align: center; line-height: 32px; text-decoration: none; }
    .encore-text-body-small-bold { font: 700 14px system-ui; }
    .e-10860-legacy-button { display: inline-flex; align-items: center; padding: 8px 12px; border: 0; background: transparent; color: #b3b3b3; text-decoration: none; cursor: pointer; }
    footer { position: fixed; bottom: 0; left: 0; }
  </style><header><a class="spotify-logo" href="/" aria-label="Spotify">S</a><a class="e-10860-legacy-button encore-text-body-small-bold e-10860-button--leading" data-encore-id="buttonTertiary" href="/download"><span>Install App</span></a><span>Notifications</span><span>Profile</span></header>`;
  await boot(source, header + absolute(fixture('First', 'Track1')));
  check(await page.getByRole('button', { name: 'History', exact: true }).textContent() === 'History', 'History occupies the Install App position in the header');
  check(await page.locator('a[href="/download"]').isHidden(), 'Original Install App link is hidden');
  check(await page.getByRole('button', { name: 'History', exact: true }).getAttribute('data-encore-id') === 'buttonTertiary', 'Header button reuses Spotify Encore styling');
  check(await page.getByRole('button', { name: 'Back', exact: true }).count() === 1 &&
    await page.getByRole('button', { name: 'Forward', exact: true }).count() === 1, 'Header includes Back and Forward controls');
  check(await page.evaluate(() => {
    const logo = document.querySelector('.spotify-logo').getBoundingClientRect();
    const shadow = document.querySelector('#swh-root').shadowRoot;
    const navigation = shadow.querySelector('.navigation').getBoundingClientRect();
    const history = [...document.querySelectorAll('header button')].find(button => button.textContent.startsWith('History')).getBoundingClientRect();
    return navigation.left === logo.right + 16 && navigation.right < history.left &&
      navigation.top + navigation.height / 2 === logo.top + logo.height / 2;
  }), 'Back and Forward sit beside the top-left logo, separate from History');
  for (const width of [1200, 600]) {
    await page.setViewportSize({ width, height: 682 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    check(await page.locator('#swh-root .navigation').isVisible() &&
      await page.locator('#swh-root .nav-button').evaluateAll(buttons => buttons.length === 2 && buttons.every(button => {
        const icon = button.querySelector('svg');
        const a = button.getBoundingClientRect(), b = icon.getBoundingClientRect();
        return b.width === 16 && b.height === 16 && Math.abs(a.left + a.width / 2 - b.left - b.width / 2) < 0.1 &&
          Math.abs(a.top + a.height / 2 - b.top - b.height / 2) < 0.1;
      })), `Visible navigation uses centered 16px icons with equal padding at ${width}px`);
  }
  await page.setViewportSize({ width: 1200, height: 682 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await change(fixture('Second', 'Track2'));
  await page.getByRole('button', { name: 'History 1', exact: true }).click();
  const belowHeader = await page.evaluate(() => {
    const trigger = [...document.querySelectorAll('header button')].find(button => button.textContent.startsWith('History')).getBoundingClientRect();
    const panel = document.querySelector('#swh-root').shadowRoot.querySelector('.panel').getBoundingClientRect();
    return panel.top >= trigger.bottom && panel.right <= innerWidth && panel.left >= 0;
  });
  check(belowHeader, 'History panel opens beneath the header button inside the viewport');
  check(await page.getByRole('button', { name: 'History 1', exact: true }).evaluate(button =>
    getComputedStyle(button).color !== 'rgb(30, 215, 96)' &&
    getComputedStyle(button.querySelector('span')).color === 'rgb(30, 215, 96)'),
    'Only the counter stays green when History is open');
  await page.setViewportSize({ width: 420, height: 700 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  check(await page.evaluate(() => {
    const panel = document.querySelector('#swh-root').shadowRoot.querySelector('.panel').getBoundingClientRect();
    return panel.left >= 0 && panel.right <= innerWidth;
  }), 'Header panel fits a narrow PWA window');
  check(await page.evaluate(() => {
    const nav = document.querySelector('#swh-root').shadowRoot.querySelector('.navigation').getBoundingClientRect();
    const history = [...document.querySelectorAll('header button')].find(button => button.textContent.startsWith('History')).getBoundingClientRect();
    return nav.right <= history.left;
  }), 'Navigation and History do not overlap in a narrow PWA window');
  await page.setViewportSize({ width: 360, height: 700 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  check(await page.locator('#swh-root .navigation').isHidden(),
    'Navigation hides when the header has insufficient space');
  await page.setViewportSize({ width: 1200, height: 682 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  check(await page.locator('#swh-root .navigation').isVisible(),
    'Navigation returns when the header has space again');

  await page.evaluate(() => {
    document.querySelector('a[href="/download"]').remove();
    document.querySelector('header').lastElementChild.setAttribute('data-testid', 'user-widget-link');
    window.__historyTick();
  });
  for (const width of [1200, 420, 360]) {
    await page.setViewportSize({ width, height: 700 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    check(await page.getByRole('button', { name: 'History 1', exact: true }).evaluate(button => {
      const a = button.getBoundingClientRect();
      const b = document.querySelector('[data-testid="user-widget-link"]').getBoundingClientRect();
      return a.width > 0 && a.top >= 0 && a.bottom <= 48 && a.left >= 0 && a.right <= b.left;
    }), `History stays in the top bar without Install App at ${width}px`);
  }
  await page.evaluate(() => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'none';
    wrapper.innerHTML = '<a href="/download">Install App</a>';
    document.querySelector('header').prepend(wrapper);
    window.__historyTick();
  });
  check(await page.getByRole('button', { name: 'History 1', exact: true }).isVisible(),
    'A hidden Install App container cannot hide History');
  await page.setViewportSize({ width: 1200, height: 682 });

  await page.evaluate(() => {
    document.querySelector('header').innerHTML = '<a class="spotify-logo" href="/" aria-label="Spotify">S</a><a class="e-10860-legacy-button" href="/download">Install App</a>';
    window.__historyTick();
  });
  check(await page.locator('header button').count() === 1 && await page.getByRole('button', { name: 'Back', exact: true }).isVisible(),
    'History and navigation controls recover when Spotify replaces the header');
  await page.evaluate(() => { document.querySelector('header').remove(); window.__historyTick(); });
  check(await page.locator('#swh-root').getByRole('button', { name: 'History 1', exact: true }).count() === 1,
    'Floating button remains available when the header install link is absent');

  // Supply the Spotify origin locally; these requests never reach Spotify.
  const route = request => request.fulfill({ contentType: 'text/html', body: '<main id="route">Home</main>' });
  await page.route('https://open.spotify.com/**', route);
  try {
    await page.goto('https://open.spotify.com/');
    await boot(source, header + absolute(fixture('First', 'Track1')));
    await change(fixture('Second', 'Track2'));
    await page.evaluate(() => {
      window.history.replaceState({ idx: 0, key: 'initial' }, '', '/');
      window.__documentMarker = 'same document';
      window.addEventListener('popstate', event => {
        window.__route = location.pathname;
        window.__routeState = event.state;
      });
    });
    await page.getByRole('button', { name: 'History 1', exact: true }).click();
    check(await page.locator('#swh-root .entry [aria-haspopup="menu"]').count() === 1, 'Exact-track entries have a single more-options trigger');
    const link = page.locator('#swh-root').getByRole('link', { name: /First/ });
    const modified = await link.evaluate(element => {
      let handled;
      element.addEventListener('click', event => {
        handled = event.defaultPrevented;
        event.preventDefault();
      }, { once: true });
      element.dispatchEvent(new MouseEvent('click', { button: 0, ctrlKey: true, bubbles: true, cancelable: true }));
      return handled;
    });
    check(!modified && new URL(page.url()).pathname === '/', 'Modified clicks retain normal link behavior');
    await link.click();
    check(await page.evaluate(() => window.__documentMarker === 'same document' && window.__route === '/search/First%20Artist'),
      'Clicking an exact-track entry searches by song and artist without opening a playback route or reloading');
    check(await page.evaluate(() => window.__routeState.idx === 1), 'Navigation updates the router history index');
    check(await page.locator('#swh-root').getByRole('region', { name: 'Spotify queue history' }).isHidden(),
      'Finding a song closes the history panel');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.waitForURL('https://open.spotify.com/');
    check(new URL(page.url()).pathname === '/' && await page.evaluate(() => window.__documentMarker === 'same document'),
      'Back control returns to the previous route without reloading');
    await page.getByRole('button', { name: 'Forward', exact: true }).click();
    await page.waitForURL('https://open.spotify.com/search/First%20Artist');
    check(await page.evaluate(() => window.__documentMarker === 'same document'), 'Forward control restores the next route without reloading');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.waitForURL('https://open.spotify.com/');

    const first = { id: 'Track1', name: 'First', artist: 'Artist', url: 'https://open.spotify.com/track/Track1', endedAt: Date.now() };
    await boot(source, header + absolute(fixture('Second', 'Track2')), JSON.stringify([{ ...first, id: 'metadata:First', url: 'https://open.spotify.com/search/First' }]));
    await page.getByRole('button', { name: 'History 1', exact: true }).click();
    check(await page.locator('#swh-root .entry button').count() === 2 &&
      await page.locator('#swh-root .entry [role="menuitem"]').textContent() === 'Remove',
      'Search-only rows offer removal without unavailable Queue or Copy controls');
    const searchLink = page.locator('#swh-root').getByRole('link', { name: /First/ });
    check(await searchLink.getAttribute('draggable') === 'false', 'Search-only history entries are not advertised as draggable tracks');
    await searchLink.click();
    check(new URL(page.url()).pathname === '/search/First%20Artist' &&
      await page.locator('#swh-root').getByRole('region', { name: 'Spotify queue history' }).isHidden(),
      'Clicking a search-only history row opens Spotify search and closes history');

    const draggableTrack = { ...first, id: '35JhxrwW2bBAiMcnrmuLEN',
      url: 'https://open.spotify.com/track/35JhxrwW2bBAiMcnrmuLEN',
      art: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' };
    await boot(source, header + absolute(fixture('Second', 'Track2')), JSON.stringify([draggableTrack]));
    await page.evaluate(() => {
      const queue = document.createElement('div');
      queue.id = 'queue-drop-target';
      queue.textContent = 'Queue drop target';
      Object.assign(queue.style, { position: 'fixed', left: '160px', top: '200px', width: '240px', height: '120px' });
      queue.addEventListener('dragover', event => {
        if (event.dataTransfer.types.includes('text/x-spotify-tracks')) event.preventDefault();
      });
      queue.addEventListener('drop', event => {
        event.preventDefault();
        window.__queueDrop = Object.fromEntries([...event.dataTransfer.types].map(type => [type, event.dataTransfer.getData(type)]));
      });
      document.body.append(queue);
    });
    await page.getByRole('button', { name: 'History 1', exact: true }).click();
    const dragLink = page.locator('#swh-root').getByRole('link', { name: /First/ });
    check(await dragLink.getAttribute('draggable') === 'true', 'Exact-track history links are draggable');
    check(await dragLink.locator('img').getAttribute('draggable') === 'false', 'Album artwork does not start a separate image drag');
    const beforeDragUrl = page.url();
    const dragStart = await dragLink.locator('.song').boundingBox();
    const dragEnd = await page.locator('#queue-drop-target').boundingBox();
    await page.mouse.move(dragStart.x + dragStart.width / 2, dragStart.y + dragStart.height / 2);
    await page.mouse.down();
    await page.mouse.move(dragEnd.x + dragEnd.width / 2, dragEnd.y + dragEnd.height / 2, { steps: 10 });
    // A second move delivers dragover before mouseup in Chromium's HTML5 drag flow.
    await page.mouse.move(dragEnd.x + dragEnd.width / 2 + 1, dragEnd.y + dragEnd.height / 2 + 1);
    await page.mouse.up();
    const dropped = await page.evaluate(() => window.__queueDrop);
    check(dropped?.['text/x-spotify-tracks'] === 'spotify:track:35JhxrwW2bBAiMcnrmuLEN' &&
      dropped['text/uri-list'] === draggableTrack.url && dropped['text/plain'] === draggableTrack.url &&
      dropped['text/x-spotify-context'] === '' && dropped['text/x-spotify-section'] === '0',
      'A browser drag delivers all five fields observed in Spotify native track drags');
    check(page.url() === beforeDragUrl && (await history()).length === 1,
      'Dragging a history track neither navigates nor removes it from history');

    const prepareQueue = async options => {
      await page.evaluate(() => window.history.replaceState(null, '', '/'));
      await boot(source, header + '<main style="height:400px"></main>' + absolute(fixture('Second', 'Track2')), JSON.stringify([draggableTrack]));
      await page.evaluate(({ options, id }) => {
        if (window.__queueSearchListener) window.removeEventListener('popstate', window.__queueSearchListener);
        window.__queuedIds = [];
        window.__playCalls = 0;
        window.__queueSearchListener = () => {
          if (!location.pathname.endsWith('/tracks')) return;
          setTimeout(() => {
            const ids = options.missing ? ['WrongTrack'] : ['WrongTrack', id];
            document.querySelector('main').innerHTML = '<div data-testid="infinite-scroll-list">' + ids.map(track =>
              `<div role="row"><div data-testid="tracklist-row" draggable="true"><a href="/track/${track}">First</a><button data-play>Play</button><button data-testid="more-button" data-track="${track}">More options for First</button></div></div>`
            ).join('') + '</div>';
            document.querySelectorAll('[data-play]').forEach(button => button.addEventListener('click', () => window.__playCalls++));
            document.querySelectorAll('[data-testid="more-button"]').forEach(button => button.addEventListener('click', () => {
              const menu = document.createElement('ul');
              menu.setAttribute('role', 'menu');
              menu.innerHTML = `<li role="presentation"><a role="menuitem" href="/album/Album1?highlight=spotify:track:${button.dataset.track}">Go to album</a></li>`;
              if (!options.unavailable) {
                const item = document.createElement('button');
                item.setAttribute('role', 'menuitem');
                item.setAttribute('aria-disabled', 'false');
                item.textContent = options.label || 'Add to queue';
                item.addEventListener('click', () => {
                  window.__queuedIds.push(button.dataset.track);
                  menu.remove();
                });
                menu.append(item);
              }
              document.body.append(menu);
            }));
          }, 150);
        };
        window.addEventListener('popstate', window.__queueSearchListener);
      }, { options, id: draggableTrack.id });
      await page.getByRole('button', { name: 'History 1', exact: true }).click();
    };
    const queueStatus = () => page.locator('#swh-root .hint');
    const loading = () => page.locator('#swh-root .queue-loading');
    await prepareQueue({});
    await page.locator('#swh-root').getByRole('button', { name: 'More options for First', exact: true }).click();
    await page.locator('#swh-root').getByRole('menuitem', { name: 'Add First to queue', exact: true }).click();
    check(await page.locator('#swh-root').getByRole('menuitem', { name: 'Add First to queue', exact: true, includeHidden: true }).isDisabled(),
      'Queue action is disabled while the native search and menu are loading');
    check(await loading().isVisible(), 'Loading state covers the search while Queue is pending');
    await page.waitForFunction(() => window.__queuedIds.length === 1);
    await page.waitForURL('https://open.spotify.com/');
    await loading().waitFor({ state: 'hidden' });
    check((await page.evaluate(() => window.__queuedIds)).join() === draggableTrack.id,
      'Queue uses the exact matching search result instead of another song with the same name');
    check(await page.evaluate(() => window.__playCalls === 0) && new URL(page.url()).pathname === '/',
      'Queue returns to the previous screen without pressing Play or opening the track page');
    check((await queueStatus().textContent()).includes('Queue request sent'),
      'Queue reports that the request was sent rather than claiming unverified playback state');

    for (const label of ['Añadir a la cola', 'Agregar a la cola', 'Adicionar à fila']) {
      await prepareQueue({ label });
      await page.locator('#swh-root .more-action').click();
      await page.locator('#swh-root').getByRole('menuitem', { name: 'Add First to queue', exact: true }).click();
      await page.waitForFunction(() => window.__queuedIds.length === 1);
      await loading().waitFor({ state: 'hidden' });
      check((await page.evaluate(() => window.__queuedIds)).join() === draggableTrack.id,
        `Queue recognises the native ${label} label independently of the extension language`);
    }

    await prepareQueue({ unavailable: true });
    await page.locator('#swh-root').getByRole('button', { name: 'More options for First', exact: true }).click();
    await page.locator('#swh-root').getByRole('menuitem', { name: 'Add First to queue', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#swh-root').shadowRoot.querySelector('.hint').textContent.includes('unavailable'));
    check((await page.evaluate(() => window.__queuedIds)).length === 0 &&
      await page.locator('#swh-root').getByRole('menuitem', { name: 'Add First to queue', exact: true, includeHidden: true }).isEnabled(),
      'Unavailable native queue actions show a failure and allow retry');
    check(await loading().isHidden(), 'Queue failure removes the loading cover');

    await prepareQueue({ missing: true });
    await page.locator('#swh-root').getByRole('button', { name: 'More options for First', exact: true }).click();
    await page.locator('#swh-root').getByRole('menuitem', { name: 'Add First to queue', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#swh-root').shadowRoot.querySelector('.hint').textContent.includes('exact track was not found'));
    check((await page.evaluate(() => window.__queuedIds)).length === 0, 'Missing exact tracks are never substituted with a search result of the same name');

    await prepareQueue({});
    await page.locator('#swh-root').getByRole('button', { name: 'More options for First', exact: true }).click();
    await page.locator('#swh-root').getByRole('menuitem', { name: 'Add First to queue', exact: true }).click();
    await page.locator('#swh-root').getByRole('button', { name: '✕', exact: true }).click();
    await page.waitForTimeout(250);
    check((await page.evaluate(() => window.__queuedIds)).length === 0, 'Closing history cancels a pending Queue action');
    check(await loading().isHidden(), 'Cancellation removes the loading cover');
    await page.evaluate(() => window.removeEventListener('popstate', window.__queueSearchListener));
    await page.getByRole('button', { name: 'History 1', exact: true }).click();
  } finally {
    await page.unroute('https://open.spotify.com/**', route);
  }
  const sample = [
    { id: '35JhxrwW2bBAiMcnrmuLEN', name: 'Homecoming', artist: 'Anne Clark', startedAt: Date.now() - 120000, endedAt: Date.now() - 60000 },
    { id: '6EUidHGbVvqs5GYf6KBMTu', name: 'Alarm Call', artist: 'Anne Clark', startedAt: Date.now() - 86400000, endedAt: Date.now() - 86300000 },
    { id: 'Track3', name: 'Nowhere Girl', artist: 'B-Movie', startedAt: Date.now() - 172800000, endedAt: Date.now() - 172700000 }
  ];
  await boot(source, header + '<main></main>', JSON.stringify(sample), 200);
  await page.getByRole('button', { name: 'History 3', exact: true }).click();
  const historyRoot = page.locator('#swh-root');
  check(await historyRoot.locator('.top').getByRole('button', { name: 'History options', exact: true }).count() === 1 &&
    await historyRoot.locator('.settings').isHidden() && await historyRoot.locator('summary').count() === 0,
    'History options is a header cog with settings initially hidden');
  check(await historyRoot.locator('.day').count() === 3 && await historyRoot.locator('.day').first().textContent() === 'Today',
    'History is grouped by local calendar day');
  const search = historyRoot.getByRole('searchbox', { name: 'Search history' });
  await search.fill('ANNE');
  check(await historyRoot.locator('.entry').count() === 2, 'Search matches artist names regardless of case');
  await search.fill('nowhere');
  check(await historyRoot.locator('.song').textContent() === 'Nowhere Girl', 'Search matches track titles locally');
  await search.fill('not found');
  check(await historyRoot.locator('.empty').textContent() === 'No matching tracks.', 'Search has a clear empty state');
  await search.fill('');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async value => { window.__copiedLink = value; }
  }}));
  const beforeCopy = page.url();
  await historyRoot.getByRole('button', { name: 'More options for Homecoming', exact: true }).click();
  await historyRoot.getByRole('menuitem', { name: 'Copy link to Homecoming', exact: true }).click();
  check(await page.evaluate(() => window.__copiedLink) === 'https://open.spotify.com/track/35JhxrwW2bBAiMcnrmuLEN' && page.url() === beforeCopy,
    'Copy link uses the exact canonical track URL without navigating');
  await historyRoot.getByRole('button', { name: 'More options for Alarm Call', exact: true }).click();
  await historyRoot.getByRole('menuitem', { name: 'Remove Alarm Call from history', exact: true }).click();
  check((await history()).length === 2 && !(await history()).some(entry => entry.name === 'Alarm Call') &&
    await page.getByRole('button', { name: 'History 2', exact: true }).isVisible(),
    'Remove deletes only the selected play and updates persistent history and count');
  await historyRoot.getByRole('button', { name: 'History options', exact: true }).click();
  check(await historyRoot.getByRole('combobox', { name: 'History limit' }).inputValue() === '200', 'History capacity loads from saved settings');
  check(await historyRoot.getByRole('combobox', { name: 'History limit' }).evaluate(select => {
    const label = select.parentElement;
    const range = new Range();
    range.selectNodeContents(label.firstChild);
    const text = range.getBoundingClientRect();
    const control = select.getBoundingClientRect();
    return Math.abs(control.left - text.right - 8) < 0.5 &&
      Math.abs(text.top + text.height / 2 - control.top - control.height / 2) <= 1;
  }), 'Keep label and history limit have an 8px gap and are vertically centered');
  await historyRoot.getByRole('combobox', { name: 'History limit' }).selectOption('500');
  check(await page.evaluate(key => localStorage.getItem(`${key}-limit`), key) === '500', 'History capacity changes are persisted');
  await search.fill('Anne');
  const downloadPromise = page.waitForEvent('download');
  await historyRoot.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  check(exported.version === 1 && exported.tracks.length === 2 && download.suggestedFilename().endsWith('.json'),
    'Export downloads a versioned JSON backup of all history, independent of the filter');
  await search.fill('');
  const upload = async data => {
    await historyRoot.locator('input[type="file"]').setInputFiles({ name: 'history.json', mimeType: 'application/json', buffer: Buffer.from(data) });
    await page.waitForFunction(() => document.querySelector('#swh-root').shadowRoot.querySelector('input[type="file"]').value === '');
  };
  await upload(JSON.stringify({ version: 1, tracks: sample }));
  check((await history()).length === 3 && (await history())[0].name === 'Homecoming', 'Import merges and sorts history while preserving repeated listens');
  await upload(JSON.stringify({ version: 1, tracks: sample }));
  check((await history()).length === 3, 'Importing the same backup twice does not duplicate plays');
  await upload('{broken');
  check((await history()).length === 3 && (await historyRoot.locator('.hint').textContent()).includes('invalid JSON'),
    'Invalid JSON leaves existing history intact');
  await upload(JSON.stringify({ tracks: [{ ...sample[0], name: '<img onerror=alert(1)>', id: 'javascript:bad' }] }));
  check((await history()).length === 3 && (await historyRoot.locator('.hint').textContent()).includes('invalid track'),
    'Invalid track records are rejected without changing history');
  const repeated = Array.from({ length: 210 }, (_, index) => ({ ...sample[0], startedAt: Date.now() - index * 60000, endedAt: Date.now() - index * 60000 + 1000 }));
  await boot(source, header, JSON.stringify(repeated), 200);
  await page.getByRole('button', { name: 'History 200', exact: true }).click();
  check(await historyRoot.locator('.entry').count() === 200, 'A configured 200-track capacity survives reload');
  await change(fixture('First', 'Track1'));
  await change(fixture('Second', 'Track2'));
  check((await history()).length === 200, 'New recordings respect the configured capacity');
  await historyRoot.getByRole('button', { name: 'History options', exact: true }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await historyRoot.getByRole('combobox', { name: 'History limit' }).selectOption('50');
  check((await history()).length === 200 && await historyRoot.getByRole('combobox', { name: 'History limit' }).inputValue() === '200',
    'Canceling a capacity reduction keeps older tracks');
  page.once('dialog', dialog => dialog.accept());
  await historyRoot.getByRole('combobox', { name: 'History limit' }).selectOption('50');
  check((await history()).length === 50, 'Confirmed capacity reduction keeps only the latest tracks');
  await boot(source, header, JSON.stringify(sample), 500);
  await page.getByRole('button', { name: 'History 3', exact: true }).click();
  await page.setViewportSize({ width: 420, height: 760 });
  await page.waitForFunction(() => { const rect = document.querySelector('#swh-root').shadowRoot.querySelector('.panel').getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth; });
  const bounds = await historyRoot.locator('.panel').boundingBox();
  check(bounds.x >= 0 && bounds.x + bounds.width <= 420 &&
    await historyRoot.locator('.panel').evaluate(el => el.scrollWidth === el.clientWidth),
    'New controls fit the narrow dropdown without horizontal scrolling');
  await page.mouse.move(410, 740);
  const firstRow = historyRoot.locator('.entry').first();
  const more = firstRow.getByRole('button', { name: 'More options for Homecoming' });
  await search.focus();
  check(await more.evaluate(el => getComputedStyle(el).opacity === '0') && await historyRoot.getByRole('menu').count() === 0,
    'More-options trigger is concealed until row hover or keyboard focus; actions start closed');
  await firstRow.hover();
  check(await more.evaluate(el => getComputedStyle(el).opacity === '1'), 'Row hover reveals the more-options trigger');
  const beforeMenu = page.url();
  await more.click();
  const menu = historyRoot.getByRole('menu', { name: 'Actions for Homecoming' });
  await menu.waitFor({ state: 'visible' });
  check(await menu.getByRole('menuitem').count() === 3 && page.url() === beforeMenu,
    'More-options menu contains Queue, Copy link, and Remove without navigating');
  await page.waitForFunction(() => { const shadow = document.querySelector('#swh-root').shadowRoot; return shadow.activeElement === shadow.querySelector('.row-actions:popover-open button:not(:disabled)'); });
  await page.keyboard.press('ArrowDown');
  check(await menu.getByRole('menuitem', { name: 'Copy link to Homecoming' }).evaluate(el => el === el.getRootNode().activeElement),
    'Menu supports keyboard arrow navigation');
  await page.keyboard.press('Escape');
  check(await menu.isHidden() && await historyRoot.locator('.panel').isVisible() &&
    await more.evaluate(el => el === el.getRootNode().activeElement),
    'Escape closes only the row menu and returns focus to its trigger');
  await more.click();
  await search.click();
  check(await menu.isHidden(), 'Clicking outside dismisses the row menu');
  await more.click();
  const menuBounds = await menu.boundingBox();
  check(menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= 420 && menuBounds.y + menuBounds.height <= 760,
    'Action menu remains inside the narrow viewport');
  await search.click();

  const beforeMove = await historyRoot.locator('.panel').boundingBox();
  const handle = await historyRoot.locator('.title').boundingBox();
  const grab = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
  const dragUrl = page.url();
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 24, grab.y + 90, { steps: 8 });
  await page.mouse.up();
  const afterMove = await historyRoot.locator('.panel').boundingBox();
  check(Math.abs(afterMove.x - beforeMove.x - 24) < 1 && Math.abs(afterMove.y - beforeMove.y - 90) < 1 && page.url() === dragUrl,
    'Dragging the header moves the history panel without navigating');
  await page.evaluate(() => window.__historyTick());
  const afterTick = await historyRoot.locator('.panel').boundingBox();
  check(Math.abs(afterTick.x - afterMove.x) < 1 && Math.abs(afterTick.y - afterMove.y) < 1,
    'Track polling preserves the chosen panel position');
  await page.setViewportSize({ width: 320, height: 500 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  const afterResize = await historyRoot.locator('.panel').boundingBox();
  check(afterResize.x >= 8 && afterResize.y >= 8 && afterResize.x + afterResize.width <= 312 && afterResize.y + afterResize.height <= 492,
    'A dragged panel stays inside the viewport after resizing');
  await historyRoot.getByRole('button', { name: 'History options', exact: true }).click();
  check(await historyRoot.locator('.settings').isVisible(), 'Header controls stay clickable after dragging');
  for (const [language, title, placeholder, keep, queue, today] of [
    ['pt-BR', 'Histórico', 'Buscar no histórico', '50 músicas', 'Adicionar à fila', 'Hoje'],
    ['es-MX', 'Historial', 'Buscar en el historial', '50 canciones', 'Añadir a la cola', 'Hoy'],
    ['fr-FR', 'History', 'Search history', '50 tracks', 'Queue', 'Today']
  ]) {
    await page.setViewportSize({ width: 420, height: 700 });
    await boot(source, header + absolute(fixture('Second', 'Track2')), JSON.stringify([sample[0]]), 50, language);
    await page.getByRole('button', { name: `${title} 1`, exact: true }).click();
    check(await historyRoot.getByRole('searchbox').getAttribute('placeholder') === placeholder &&
      await historyRoot.locator('.day').textContent() === today, `${language}: search and day headings are localized with English fallback`);
    await historyRoot.locator('.settings-toggle').click();
    check(await historyRoot.locator('option[value="50"]').textContent() === keep,
      `${language}: retention uses translated track counts`);
    await historyRoot.locator('.more-action').click();
    check(await historyRoot.locator('.row-actions button').first().textContent() === queue,
      `${language}: row actions are localized`);
    await historyRoot.locator('.more-action').click();
    check(await historyRoot.locator('.panel').evaluate(panel => panel.scrollWidth <= panel.clientWidth),
      `${language}: translated controls fit the narrow panel`);
  }
  return results;
};
