// Capture the installed extension on Spotify, then compose store-sized artwork.
module.exports = async function captureAssets(context, { root, iconData, backdropData, playlist, productName }) {
  const assetPath = `${root}/store/assets`;
  const art = await context.newPage();
  await art.goto(`file://${root}/store/source/blank.html`);
  const now = Date.now();
  const tracks = playlist.tracks.map((track, index) => ({
    ...track, url: `https://open.spotify.com/track/${track.id}`,
    startedAt: now - (index < 5 ? index * 240000 + 480000 : 86400000 + index * 240000),
    endedAt: now - (index < 5 ? index * 240000 + 240000 : 86400000 + index * 240000 - 240000)
  }));
  await context.addInitScript(({ tracks }) => {
    if (location.origin !== 'https://open.spotify.com') return;
    localStorage.setItem('spotify-web-local-queue-history-v1', JSON.stringify(tracks));
    localStorage.setItem('spotify-web-local-queue-history-v1-limit', '500');
  }, { tracks });
  const player = await context.newPage();
  const snapshots = [];
  try {
    await player.setViewportSize({ width: 1440, height: 1000 });
    await player.goto('https://open.spotify.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await player.locator('a[href="/download"]').waitFor({ state: 'attached', timeout: 25000 });
    await player.evaluate(() => document.fonts.ready);
    const rejectCookies = player.locator('#onetrust-reject-all-handler');
    if (await rejectCookies.isVisible()) await rejectCookies.click();
    await player.getByRole('button', { name: 'History 8', exact: true }).waitFor({ timeout: 20000 });
    await player.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === 'History 8' && button.getBoundingClientRect().top < 80));
    await player.waitForTimeout(1800);
    if (await rejectCookies.isVisible()) await rejectCookies.click();
    await player.getByRole('button', { name: 'History 8', exact: true }).click();
    const history = player.locator('#swh-root');
    const panel = history.locator('.panel');
    await panel.waitFor({ state: 'visible' });
    await player.screenshot({ path: `${assetPath}/web-player-demo.png` });
    const take = async name => {
      await player.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await panel.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const clip = await panel.boundingBox();
      const buffer = await player.screenshot({ path: `${assetPath}/${name}`, clip, scale: 'css' });
      snapshots.push(buffer.toString('base64'));
    };
    await take('raw-history.png');
    await history.getByRole('searchbox', { name: 'Search history' }).fill('Kate');
    await take('raw-search.png');
    await history.getByRole('searchbox', { name: 'Search history' }).fill('');
    await history.getByRole('button', { name: `More options for ${playlist.tracks[0].name}`, exact: true }).first().click();
    await history.getByRole('menu', { name: `Actions for ${playlist.tracks[0].name}`, exact: true }).waitFor({ state: 'visible' });
    await take('raw-actions.png');
    await history.getByRole('searchbox', { name: 'Search history' }).click();
    await history.getByRole('button', { name: 'History options', exact: true }).click();
    await take('raw-options.png');
  } finally {
    await player.close();
  }
  const icon = iconData;
  const shots = [
    ['01-history.png', 'Find the song<br>you just played.', 'Find it in your local listening history.', 'Tracks grouped by day, right inside the web player.'],
    ['02-search.png', 'Find it by title<br>or artist.', 'Search the tracks you recorded here.', 'Your history is searchable without leaving the panel.'],
    ['03-queue.png', 'Put it back<br>in the queue.', 'Use Spotify’s own Add to queue control.', 'Copy an exact track link or remove an entry from the same menu.'],
    ['04-options.png', 'Your history,<br>in your browser.', 'Keep 50, 200, or 500 entries.', 'Export a JSON backup. Bring it to another browser.']
  ];
  try {
    await art.setViewportSize({ width: 1280, height: 800 });
    for (const [index, [filename, headline, lead, detail]] of shots.entries()) {
      const screenshot = `data:image/png;base64,${snapshots[index]}`;
      await art.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;background:#070b08;color:#fff;font-family:Arial,Helvetica,sans-serif}
        main{width:1280px;height:800px;position:relative;overflow:hidden;background:url("${backdropData}") center/cover}
        .brand{position:absolute;top:48px;left:48px;display:flex;align-items:center;gap:12px;font-size:18px;font-weight:700;letter-spacing:-.3px}
        .brand img{width:72px;height:72px;filter:drop-shadow(0 8px 14px #0009)}.copy{position:absolute;left:72px;top:215px;width:660px}
        h1{font-size:76px;line-height:1.03;letter-spacing:-4px;margin:0 0 34px;font-weight:700}
        .lead{font-size:24px;line-height:1.4;max-width:510px;margin:0 0 16px}.detail{font-size:17px;line-height:1.6;max-width:450px;color:#b5c7bb;margin:0}
        .stage{position:absolute;inset:36px 44px 36px 775px;display:flex;align-items:center;justify-content:center}
        .shot{width:400px;height:auto;max-height:700px;object-fit:contain;border-radius:14px;filter:drop-shadow(0 22px 28px #0009);box-shadow:0 0 0 1px #ffffff26}
        .foot{position:absolute;left:72px;bottom:48px;font-size:12px;color:#d2e0d7;letter-spacing:.2px;background:#030805b8;padding:9px 12px;border:1px solid #8affb025;border-radius:12px;backdrop-filter:blur(16px)}
        .marker{height:6px;width:52px;background:#1ed760;box-shadow:0 0 18px #1ed76088;border-radius:3px;margin-bottom:26px}
      </style></head><body><main><div class="brand"><img src="${icon}" alt="">${productName}</div>
      <div class="copy"><div class="marker"></div><h1>${headline}</h1><p class="lead">${lead}</p><p class="detail">${detail}</p></div>
      <div class="stage"><img class="shot" src="${screenshot}" alt="Captured extension panel"></div>
      <div class="foot">Unofficial extension · Demo history from Alternative 80s</div></main></body></html>`);
      await art.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await art.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await art.screenshot({ path: `${assetPath}/${filename}` });
    }
    const small = await context.newPage();
    const marquee = await context.newPage();
    try {
      await small.goto(`file://${root}/store/source/blank.html`);
      await marquee.goto(`file://${root}/store/source/blank.html`);
      await small.setViewportSize({ width: 440, height: 280 });
      await small.setContent(`<html><head><style>body{margin:0;background:#070b08}main{position:relative;width:440px;height:280px;overflow:hidden;background:url("${backdropData}") center/cover}img{position:absolute;width:260px;height:260px;top:10px;left:90px;filter:drop-shadow(0 18px 22px #0009)}</style></head><body><main><img src="${icon}" alt=""></main></body></html>`);
      await small.locator('img').evaluate(image => image.decode());
      await small.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await small.screenshot({ path: `${assetPath}/promo-small.png`, scale: 'css' });
      await marquee.setViewportSize({ width: 1400, height: 560 });
      await marquee.setContent(`<html><head><style>*{box-sizing:border-box}body{margin:0;background:#070b08;color:#fff;font-family:Arial,Helvetica,sans-serif}main{position:relative;width:1400px;height:560px;overflow:hidden;background:url("${backdropData}") center/cover}.icon{position:absolute;left:54px;top:30px;width:105px;height:105px}h1{position:absolute;left:82px;top:160px;font-size:76px;line-height:1.05;letter-spacing:-3px;margin:0;width:750px}.shot{position:absolute;width:365px;top:36px;right:90px;border:1px solid #ffffff26;border-radius:13px;box-shadow:0 24px 50px #000b}p{position:absolute;left:85px;bottom:45px;color:#b5c7bb;font-size:21px}</style></head><body><main><img class="icon" src="${icon}" alt=""><h1>History for<br>Spotify Web</h1><p>Find the track you meant to keep.</p><img class="shot" src="data:image/png;base64,${snapshots[0]}" alt="Demonstration history"></main></body></html>`);
      await marquee.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await marquee.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await marquee.screenshot({ path: `${assetPath}/promo-marquee.png`, scale: 'css' });
    } finally {
      await small.close();
      await marquee.close();
    }
    return { screenshots: shots.map(shot => shot[0]), promo: ['promo-small.png', 'promo-marquee.png'], sampleRecords: tracks.length };
  } finally {
    await art.close();
  }
};
