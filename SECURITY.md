# Security

Don't put credentials, cookies, access tokens, API keys, or private history exports in issues or pull requests.

The extension runs bundled code in Spotify's page context and stores history in Spotify's localStorage. Scripts on that origin can access the same storage. No Chrome extension APIs are exposed to the page, and no extension server receives the records.

Use the repository's private vulnerability reporting option if it is enabled. If it isn't available, open an issue asking for a private reporting channel without including exploit details or personal data.
