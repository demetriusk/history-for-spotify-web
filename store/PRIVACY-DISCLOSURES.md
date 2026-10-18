# Chrome Web Store privacy fields

These are draft answers for this build. Review the dashboard's current wording before submitting. Local processing still counts as handling user data under [Chrome's guidance](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## Single purpose

Help people find and revisit tracks played in Spotify's web player through a local listening history, search, and native queue controls.

## Site access justification

The content script runs only on https://open.spotify.com/*. It reads the displayed track and renders the history panel and navigation controls. Queue uses that site's search results and native Add to queue menu. Access to other websites is unnecessary and isn't requested.

## Permissions

The scripting permission and host permission for https://open.spotify.com/* let the toolbar popup read and update the history in the open Spotify tab. The popup queries Spotify tabs and runs the bundled action bridge in that tab. There is no background worker, tabs permission, or access to other sites. MAIN-world execution preserves Spotify's native drag handlers and page navigation. No privileged Chrome APIs are exposed to Spotify.

## Data categories to disclose

Website content: track titles, artist names, artwork URLs, and track identifiers or links read from Spotify's page.

Web history: the local history of Spotify track URLs and timestamps observed while the web player is open. This is limited to the advertised feature; it isn't Chrome's browsing-history database.

Don't describe this as “no data handled.” The extension stores listening records locally even though the developer doesn't receive them. Don't select authentication, financial, health, location, or personal-communications categories: the code doesn't read those fields.

## Data use

The records are used only to display, search, export, import, and revisit local listening history. They aren't sold, shared with the developer, used for advertising, or used for credit or lending decisions. Spotify receives the ordinary searches and queue actions users request through its own interface.

Confirm the dashboard's required limited-use certifications only after reading their current text.

## Remote code

No remote code is used. All extension JavaScript is bundled in the ZIP. The extension doesn't fetch executable code, run an AI model, or contain an API key. The ordinary scripts in Spotify's own website are not packaged or controlled by this extension.

## Trader status

The publisher must make this declaration based on whether the account's activity relates to a trade, business, craft, or profession. Being free or open source alone doesn't determine the answer. Use [Chrome's trader guidance](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure).
