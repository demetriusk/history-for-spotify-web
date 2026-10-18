# Privacy policy

History for Spotify Web

Last updated: 18 October 2026

## What the extension reads

The extension reads the currently displayed track in Spotify's web player: track title, artist names, artwork URL, and a track ID or link when available. It adds local timestamps when it detects the track and when Spotify moves to another track.

This information provides the listening history displayed in the extension. The selected history limit is also stored. The extension operates only on `https://open.spotify.com/`.

It doesn't read authentication cookies, passwords, account tokens, payment details, or pages outside Spotify's web player. It doesn't use Chrome's browser-history API.

## Where the data goes

History stays in localStorage for `open.spotify.com` in your browser profile. This is website storage shared with Spotify's page, not an extension-only or encrypted storage area. Website scripts running on that origin can access it.

The extension has no server and sends no listening-history export to its developer. It contains no analytics, advertising code, telemetry, AI API, or browser-sync feature.

Spotify continues making its own requests under its own privacy policy. Displaying track artwork can request the stored image URL from Spotify's image service. Clicking a history entry searches Spotify for that title and artist. Choosing Queue opens Spotify search and uses Spotify's native menu, which can send the corresponding requests to Spotify. These actions are part of the feature you choose to use.

Choosing Copy link writes the selected Spotify URL to the clipboard. The extension doesn't read the clipboard. Your browser may ask you to allow clipboard access.

## Retention and deletion

The extension keeps the newest 50, 200, or 500 recorded plays, according to your selected limit. Older records are removed as the limit is reached. History isn't synchronized between browsers or browser profiles.

Use Remove to delete an individual record or Clear to delete all saved history. Clearing Spotify's site data also deletes the history and limit setting. Uninstalling the extension alone may leave this site data in the browser.

## Files you choose

Export downloads a JSON file to your device. You decide where to keep it and whether to share it. It includes the listening-history fields described above. Import reads a JSON file you select, validates its records, and merges them with the history in this browser. The extension doesn't upload that file.

## Changes and contact

Updates to data handling will be described here and in the release notes. Privacy questions and reports can be submitted at https://github.com/demetriusk/history-for-spotify-web/issues. GitHub processes issue submissions under its own privacy policy. Please don't include private history records or credentials in a public issue.
