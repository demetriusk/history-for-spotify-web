# Submit to the Chrome Web Store

The upload package is `dist/history-for-spotify-web-0.3.3.zip`. It has `manifest.json` at the archive root. The unpacked folder is `extension/`.

## Before submission

1. Publish the public repository and confirm the homepage, support, and privacy-policy links in `LISTING.md` open while signed out of GitHub.
2. Load the unpacked extension in your everyday browser. Disable the Tampermonkey version, reload Spotify, and check real track recording and Queue on your account.
3. Review the listing copy, all five screenshots, and the privacy disclosures. The screenshots use clearly labelled demonstration history from Alternative 80s.
4. Confirm your publisher account's current contact details and trader declaration. Free/open-source status alone doesn't decide trader status.

## Dashboard fields

Open the existing History for Spotify Web item (`mankfcbajkkgnahooffhiookcbbicohn`) and upload the ZIP as a new package. Paste the name and descriptions from `LISTING.md`. Upload the icon, five screenshots, and small tile listed in `ASSETS.md`. The marquee is optional.

Paste the privacy-policy URL after the public repository is reachable. Use `PRIVACY-DISCLOSURES.md` to complete the single-purpose and data-use fields, reviewing their current wording rather than accepting them blindly. `REVIEWER-NOTES.md` provides a test path without sharing an account password.

Check the country and visibility choices, then submit the concrete listing for review when you are ready. Version 0.3.2 is already public. Version 0.3.3 must be uploaded and submitted for review; preparing the ZIP does not submit it. Keep the existing item, visibility, countries, and privacy declarations.

## Official references

- [Content script scope and MAIN execution](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
- [Store image requirements](https://developer.chrome.com/docs/webstore/images)
- [Privacy disclosures, including local-only data](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Trader status](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure)
- [Spotify naming and branding guidance](https://developer.spotify.com/documentation/design)
