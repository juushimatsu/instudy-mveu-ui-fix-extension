# Privacy Policy — InStudy Mono UI

**Last updated:** May 17, 2026

## What data is collected

This extension collects and transmits the following data to its API server (`instudy-clicker-api.workers.dev`):

- **InStudy user ID and username** — used to identify the player on the leaderboard.
- **Game progress** — clicker score, click count, upgrades, and card collection.
- **Heartbeat signal** — periodic ping to display online status to other players.

## What data is stored locally

- Theme preferences (dark/light, accent color, weather effects, density).
- Game save data (score, upgrades, cards).

This data is stored via `chrome.storage.local` or `localStorage` and never leaves the device unless the user is authenticated with the online features.

## What data is NOT collected

- Passwords or authentication credentials.
- Browsing history, search terms, or activity on other websites.
- Personal communications or message content.
- Financial, health, or location data.

## How data is used

- Game data is synced to the server solely to provide leaderboard and cross-device progress features.
- No data is sold, shared with third parties, or used for advertising.
- No analytics or tracking services are integrated.

## Data retention

- Server-side game data is retained indefinitely to preserve leaderboard rankings.
- Users can request data deletion by contacting the developer.

## Scope

This extension only operates on `disto.mveu.ru`. It does not inject code, read content, or collect data from any other website.

## Contact

For questions or data deletion requests, open an issue at:  
https://github.com/juushimatsu/instudy-mveu-ui-fix-extension/issues
