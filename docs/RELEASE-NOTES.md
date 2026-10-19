# 0.3.1

History stays in the top bar when Install App is hidden or missing, including smaller PWA windows. Back and Forward hide when there is not enough space beside Spotify’s controls.

The browser toolbar uses a minimal green history icon on a transparent background.

Existing history and settings are preserved. No new permissions.

# 0.3.0

First Chrome extension package, based on the 0.3.0 Tampermonkey script.

The in-page panel and browser toolbar popup share one history. Search, track actions, settings, and backups work in either view; the popup needs an open Spotify tab.

The history panel records track changes in the open Spotify web player. Search titles or artists, keep 50/200/500 entries grouped by day, and export or import JSON backups. Each track's menu offers Copy link, Remove, and Queue when its exact ID is available. Queue uses Spotify's native control and returns to the previous screen. Back and Forward buttons sit beside the logo. Drag the history panel by its header to place it elsewhere in the window.

The package uses Manifest V3, runs only on open.spotify.com, and has no runtime dependencies, background worker, analytics, or API-key requirement. Existing userscript history in this browser's Spotify site storage is preserved.

Known limits: no recovery of plays before installation; skipped tracks can appear; Queue currently depends on Spotify's English menu label and the active playback device. Spotify UI changes can break integration. Dragging between Next in queue and Next up remains Spotify's behaviour.
