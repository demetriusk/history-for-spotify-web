# Reviewer notes

The extension adds its UI inside https://open.spotify.com/. The browser toolbar icon opens the same history and actions in a popup, which requires an open Spotify tab. There is no extension login. Use your own Spotify account; no developer account or API credentials are required.

1. Install the package, open the Spotify web player, and sign in directly with Spotify. Queue supports Spotify’s English, Brazilian Portuguese, and Spanish menu labels. The extension follows the browser language with English as the fallback.
2. Play a song, then move to another song. Open History in the top bar or through the browser toolbar icon. The track you left appears in the list. The extension records visible track changes, including skips.
3. Search the list by title or artist. Open the row's more-options button to try Copy link or Remove. Clicking a row opens a Spotify search without intentionally starting playback.
4. Open the header cog. Change the limit, export a JSON backup, and import it again. Re-importing the same records doesn't duplicate those plays. A smaller limit asks before trimming existing history.
5. For an entry with an exact track ID, choose Queue while Spotify has an active playback device. The extension uses a native search result and Add to queue menu, then restores the earlier screen. Check Next in queue in Spotify. A success message reports the request, not independent confirmation of Spotify's backend state.

History starts at installation; it doesn't request a user's earlier Spotify account history. Track metadata stays in Spotify's local site storage and can be cleared in the panel. The extension doesn't transmit it to a developer server.

Queue availability is controlled by Spotify and the active device. In an automated browser without protected-content support, playback and the native queue action may be unavailable. Searching, local history, settings, export/import, and navigation can still be inspected.
