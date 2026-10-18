'use strict';

const ui = Object.fromEntries(['count', 'options', 'settings', 'limit', 'clear', 'close', 'export', 'import', 'file',
  'search', 'entries', 'connection', 'connection-message', 'open', 'reload', 'status', 'back', 'forward']
  .map(id => [id, document.getElementById(id)]));
let tab = null;
let snapshot = { history: [], limit: 50 };
let busy = false;

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

async function request(action, data = {}) {
  const [response] = await chrome.scripting.executeScript({
    target: { tabId: tab.id }, world: 'MAIN',
    args: [{ action, ...data }],
    func: data => new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        window.removeEventListener('swh-extension-response', receive);
        reject(new Error('Reload the Spotify tab to connect this version of History.'));
      }, data.action === 'queue' ? 15000 : 3000);
      function receive(event) {
        let reply;
        try { reply = JSON.parse(event.detail); } catch { return; }
        if (reply.id !== id) return;
        clearTimeout(timeout);
        window.removeEventListener('swh-extension-response', receive);
        resolve(reply);
      }
      window.addEventListener('swh-extension-response', receive);
      window.dispatchEvent(new CustomEvent('swh-extension-request', { detail: JSON.stringify({ ...data, id }) }));
    })
  });
  if (!response?.result) throw new Error('Could not connect to Spotify.');
  if (response.result.error) throw new Error(response.result.error);
  return response.result;
}

function disconnected(message, canReload = false) {
  ui.connection.hidden = false;
  ui['connection-message'].textContent = message;
  ui.reload.hidden = !canReload;
  ui.open.hidden = canReload;
  ui.entries.replaceChildren();
  ui.status.textContent = message;
  for (const id of ['clear', 'export', 'import', 'limit', 'back', 'forward', 'search']) ui[id].disabled = true;
}

async function refresh() {
  if (busy || document.querySelector('.row-actions:popover-open')) return;
  try {
    const tabs = await chrome.tabs.query({ url: 'https://open.spotify.com/*' });
    const selected = tabs.find(item => item.id === tab?.id) ||
      tabs.sort((a, b) => Number(b.active) - Number(a.active) || (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
    if (!selected) { tab = null; disconnected('Open Spotify to access the history stored in its web player.'); return; }
    const changedTab = tab?.id !== selected.id;
    tab = selected;
    const reply = await request('snapshot');
    const changed = changedTab || JSON.stringify(snapshot) !== JSON.stringify(reply.snapshot);
    snapshot = reply.snapshot;
    const reconnecting = !ui.connection.hidden;
    ui.connection.hidden = true;
    for (const id of ['clear', 'export', 'import', 'limit', 'back', 'forward', 'search']) ui[id].disabled = false;
    if (changed || reconnecting || !ui.entries.childElementCount) render();
    if (reconnecting || ui.status.textContent === 'Connecting to Spotify…') ui.status.textContent = 'Connected to Spotify. History stays in this browser.';
  } catch (error) {
    disconnected(error.message, true);
  }
}

async function act(action, data = {}, message = '') {
  if (busy || !tab) return;
  busy = true;
  document.querySelector('.row-actions:popover-open')?.hidePopover();
  if (action === 'queue') ui.status.textContent = 'Adding to queue…';
  render();
  try {
    const reply = await request(action, data);
    snapshot = reply.snapshot;
    ui.status.textContent = reply.status || message || 'History updated.';
    return true;
  } catch (error) {
    ui.status.textContent = error.message;
    return false;
  } finally {
    busy = false;
    render();
  }
}

function render() {
  ui.count.textContent = snapshot.history.length || '';
  ui.limit.value = String(snapshot.limit);
  for (const id of ['clear', 'export', 'import', 'limit', 'back', 'forward']) ui[id].disabled = busy;
  ui.entries.replaceChildren();
  const query = ui.search.value.trim().toLocaleLowerCase();
  const entries = snapshot.history.filter(entry => `${entry.name} ${entry.artist}`.toLocaleLowerCase().includes(query));
  if (!entries.length) {
    ui.entries.append(make('div', 'empty', snapshot.history.length ? 'No matching tracks.' : 'No previous tracks yet. Play another song in Spotify to start recording history.'));
    return;
  }
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let day;
  for (const entry of entries) {
    const date = new Date(entry.endedAt || entry.startedAt);
    const key = date.toDateString();
    if (key !== day) {
      ui.entries.append(make('h3', 'day', key === today ? 'Today' : key === yesterday.toDateString() ? 'Yesterday' :
        date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })));
      day = key;
    }
    const exact = /^[A-Za-z0-9]+$/.test(entry.id);
    const row = make('div', 'entry');
    const link = make('a', 'track-link');
    link.href = `https://open.spotify.com/search/${encodeURIComponent(`${entry.name} ${entry.artist}`.trim())}`;
    link.title = 'Find in Spotify';
    link.draggable = exact;
    link.addEventListener('click', async event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!await act('find', { entry }, 'Search opened in Spotify.')) return;
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      window.close();
    });
    link.addEventListener('dragstart', event => {
      if (!exact) return;
      for (const [type, value] of Object.entries({
        'text/x-spotify-context': '', 'text/uri-list': entry.url, 'text/plain': entry.url,
        'text/x-spotify-section': '0', 'text/x-spotify-tracks': `spotify:track:${entry.id}`
      })) event.dataTransfer.setData(type, value);
    });
    if (entry.art) {
      const image = make('img', 'art');
      image.src = entry.art;
      image.alt = '';
      image.loading = 'lazy';
      image.draggable = false;
      link.append(image);
    }
    const meta = make('div', 'meta');
    meta.append(make('div', 'song', entry.name), make('div', 'artist', entry.artist || 'Unknown artist'));
    link.append(meta, make('span', 'time', date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
    const more = make('button', 'more-action', '⋯');
    more.type = 'button';
    more.setAttribute('aria-label', `More options for ${entry.name}`);
    more.setAttribute('aria-haspopup', 'menu');
    more.setAttribute('aria-expanded', 'false');
    const menu = make('div', 'row-actions');
    menu.popover = 'auto';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', `Actions for ${entry.name}`);
    more.popoverTargetElement = menu;
    menu.addEventListener('toggle', event => {
      more.setAttribute('aria-expanded', String(event.newState === 'open'));
      if (event.newState !== 'open') return;
      const rect = more.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
      menu.style.top = `${Math.max(8, rect.bottom + menu.offsetHeight + 4 <= innerHeight ? rect.bottom + 4 : rect.top - menu.offsetHeight - 4)}px`;
      menu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    });
    menu.addEventListener('keydown', event => {
      const items = [...menu.querySelectorAll('button:not(:disabled)')];
      const index = items.indexOf(document.activeElement);
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % items.length;
      if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = items.length - 1;
      if (next !== undefined) { event.preventDefault(); items[next]?.focus(); }
      if (event.key === 'Escape') { event.preventDefault(); menu.hidePopover(); more.focus(); }
      if (event.key === 'Tab') menu.hidePopover();
    });
    const addAction = (text, label, run) => {
      const button = make('button', 'queue-action', text);
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.setAttribute('aria-label', label);
      button.disabled = busy;
      button.addEventListener('click', () => { menu.hidePopover(); more.focus(); run(); });
      menu.append(button);
    };
    if (exact) {
      addAction('Queue', `Add ${entry.name} to queue`, () => act('queue', { entry }));
      addAction('Copy link', `Copy link to ${entry.name}`, async () => {
        try { await navigator.clipboard.writeText(entry.url); ui.status.textContent = `Link copied for ${entry.name}.`; }
        catch { ui.status.textContent = 'Could not copy. Allow clipboard access in your browser.'; }
      });
    }
    addAction('Remove', `Remove ${entry.name} from history`, () => act('remove', { entry }));
    row.append(link, more, menu);
    ui.entries.append(row);
  }
}

ui.search.addEventListener('input', render);
ui.entries.addEventListener('scroll', () => document.querySelector('.row-actions:popover-open')?.hidePopover());
ui.options.addEventListener('click', () => {
  ui.settings.hidden = !ui.settings.hidden;
  ui.options.setAttribute('aria-expanded', String(!ui.settings.hidden));
});
ui.close.addEventListener('click', () => window.close());
ui.clear.addEventListener('click', () => {
  if (confirm('Clear Spotify Web queue history saved in this browser?')) act('clear');
});
ui.limit.addEventListener('change', () => {
  const limit = Number(ui.limit.value);
  if (snapshot.history.length > limit && !confirm(`Keep only the latest ${limit} tracks? Older entries will be deleted. Export first to keep a backup.`)) {
    ui.limit.value = String(snapshot.limit);
    return;
  }
  act('limit', { limit, confirmed: true });
});
ui.export.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, tracks: snapshot.history }, null, 2)], { type: 'application/json' }));
  const link = make('a');
  link.href = url;
  link.download = `spotify-history-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
ui.import.addEventListener('click', () => ui.file.click());
ui.file.addEventListener('change', async () => {
  const file = ui.file.files[0];
  if (file) await act('import', { json: await file.text() });
  ui.file.value = '';
});
ui.open.addEventListener('click', async () => { await chrome.tabs.create({ url: 'https://open.spotify.com/' }); window.close(); });
ui.reload.addEventListener('click', async () => { if (tab) await chrome.tabs.reload(tab.id); ui.status.textContent = 'Reloading Spotify…'; });
ui.back.addEventListener('click', () => act('back', {}, 'Moved back in Spotify.'));
ui.forward.addEventListener('click', () => act('forward', {}, 'Moved forward in Spotify.'));
refresh();
setInterval(refresh, 1700);
