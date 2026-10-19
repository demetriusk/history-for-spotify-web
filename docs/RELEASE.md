# Release status

Package: History for Spotify Web 0.3.2

Source: Tampermonkey userscript 0.3.2. `extension/history.js` is generated from that source. The first extension package preserves the existing localStorage keys, so history recorded by the userscript remains available in the same browser profile.

## Verified

The 108-check browser regression suite covers local recording, persistence, exact track IDs, search, draggable track payloads, native Queue automation against fixtures, loading and return navigation, JSON export/import, retention, row menus, count styling, spacing, and panel dragging. It also checks narrow layouts and that only the count is green when History is open.

A separate 35-check smoke suite loads the unpacked Manifest V3 package through Chrome's extension loader in a disposable profile. It verifies automatic injection, real bundled-code recording, menu opening under a Trusted Types page policy, persistence after reload, no duplicate UI, and no injection on another origin. It also checks the toolbar popup against the same Spotify state: search, Queue, Copy link, Remove, retention, JSON import/export, Clear confirmation, Find, Back/Forward, and the disconnected state.

Localization checks cover Brazilian Portuguese, Spanish, English fallback, native Queue labels in Spanish and Portuguese, and translated popup actions. The translated panels and popups were rendered and visually checked in narrow windows.

The package validator checks manifest scope, Spotify-only host access and the scripting permission, icon dimensions, source parity, and every ZIP entry. Syntax checks cover the JavaScript and publishing shell script.

The store screenshots were captured with the installed extension on the public Spotify web player in a separate profile. They use real tracks from the supplied Alternative 80s playlist and demonstration timestamps. All five final screenshots and both promotional tiles were visually inspected and checked for their required dimensions. The green glass icon has transparent padding; the backgrounds use a soft mesh gradient.

## External checks still needed

The user confirmed that native Add to queue works from the earlier userscript in their Vivaldi PWA. The final extension's live Queue behaviour on that signed-in account still needs a check. Automated fixtures don't establish that Spotify accepted a queue request. Vivaldi's headless startup failed in this environment; Chrome's actual extension smoke test passed.

The public repository exists at `demetriusk/history-for-spotify-web`. The current changes remain local: staging failed because this environment cannot create `.git/index.lock`. The terminal also cannot reach GitHub. These files have not been committed or pushed. `scripts/publish-github.sh` builds and validates the package, publishes the curated source tree to `demetriusk/history-for-spotify-web`, and attaches the ZIP to release v0.3.2 when run in a normal terminal authenticated as `demetriusk`.

The user confirmed Chrome Web Store approval for version 0.3.0. Version 0.3.2 is prepared locally and has not been uploaded to the store.
