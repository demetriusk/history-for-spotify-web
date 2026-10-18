# Store assets

Upload these files from `store/assets/`:

| File | Dimensions | Purpose |
| --- | --- | --- |
| `01-history.png` | 1280 x 800 | Main screenshot: local history |
| `02-search.png` | 1280 x 800 | Screenshot: title and artist search |
| `03-queue.png` | 1280 x 800 | Screenshot: track action menu |
| `04-options.png` | 1280 x 800 | Screenshot: retention and JSON backups |
| `05-toolbar.png` | 1280 x 800 | Screenshot: browser toolbar popup |
| `promo-small.png` | 440 x 280 | Required small promotional tile |
| `promo-marquee.png` | 1400 x 560 | Optional marquee image |

The store icon is `extension/icons/icon-128.png`. It has a roughly 96 x 96 design area and transparent padding. Icons at 16, 32, and 48 pixels are in the same folder.

The five promotional screenshots use captures of the installed extension: four in-page views on Spotify and the browser toolbar popup. They use eight real songs and their unchanged cover artwork from Spotify's [Alternative 80s playlist](https://open.spotify.com/playlist/37i9dQZF1DWTSKFpOdYF1r), with demonstration timestamps in a disposable browser profile. Each screenshot labels the entries as demo history. They don't represent the publisher's listening activity or claim that a queue request was accepted. The public track metadata and source links are in `store/source/playlist.json`.

The app icon uses an original history symbol rendered as green liquid glass. The store backgrounds use a soft green-and-black mesh gradient. AI-generated artwork is limited to those decorative assets; the UI, song titles, artist names, and album art are not AI-generated. See `assets/GENERATED-ART.md` for the final prompts and provenance. Spotify artwork remains the property of its rights holders and isn't relicensed under this project's MIT license.

`raw-*.png` are the panel captures used in the compositions. `web-player-demo.png` shows the installed extension in the surrounding web player. They are source material, not additional store-upload requirements.

After installing the optional development dependencies, rebuild the package and run:

```sh
node scripts/capture-store.cjs
```

The script loads the unpacked extension in a disposable Chromium profile, opens the public Spotify web player, seeds only that profile with sample data, and captures the UI. It doesn't start playback or submit queue actions. The public web player's layout and cookie dialogs can change; recapture and inspect the results before a release.

To use a recent installed Chrome instead of Chrome for Testing:

```sh
EXTENSION_BROWSER_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/capture-store.cjs
```

That test profile uses Chrome's unsafe-extension-debugging flag only to load the local unpacked package through DevTools. The extension and normal user installation do not request or require that flag.

The editable flat symbol is `assets/icon.svg`. The rendered icon master is `assets/icon-glass-master.png`; `node scripts/render-icons.cjs` exports the four PNG sizes. The background is `assets/mesh-backdrop.png`. No Spotify logo, font file, or AI API key is bundled. Spotify's existing page provides its interface fonts at runtime; the extension uses a system fallback when that variable isn't available.
