# Contributing

Edit `spotify-queue-history.user.js`, then run `python3 scripts/build.py`. Commit the regenerated `extension/history.js` with the source change so Load unpacked works from a checkout.

Run `python3 scripts/check.py`, `node --check extension/history.js`, and `npm test` before opening a pull request. Browser tests need the Playwright development dependency and Chromium installed; the extension itself needs neither at runtime.

Keep site access restricted to `https://open.spotify.com/*`. Don't add analytics, remote executable code, secrets, or unrelated permissions. Keep the privacy policy and store disclosures aligned with any change to stored fields or network requests.

Bug reports should include the browser version, Spotify language, and exact steps. Use sample track data in tests and remove account information from screenshots.
