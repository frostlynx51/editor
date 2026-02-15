# GitHub README Editor

A minimal editor that loads a hardcoded README.md from GitHub and displays it in Monaco.

## Setup

1. Set the `GITHUB_TOKEN` environment variable with a GitHub token that has repo read access.
2. Install dependencies.
3. Start the dev server.

## Scripts

```bash
export GITHUB_TOKEN="your_token_here"
npm install
npm run dev
```

## Notes

- The app loads `README.md` from `frostlynx51/Notes` (hardcoded in `vite.config.js`).
- The GitHub token is used server-side only and never exposed to the browser.
- Saving is not implemented yet.
