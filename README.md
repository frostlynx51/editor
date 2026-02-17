# GitHub README Editor

A web-based editor that loads and saves README.md from any GitHub repository using Monaco Editor.

## Setup

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. On first visit, enter your GitHub repository (format: `owner/repo`) and personal access token.

## Usage

- Settings are stored in browser localStorage
- Click the ⚙️ icon to change repository or token
- Edit the README.md and click Save to push changes to GitHub

## Notes

- The GitHub token is stored in localStorage and sent to the server proxy for API calls.
- For security, consider using a fine-grained token with read/write access only to specific repositories.
- The server never stores the token; it only proxies requests to GitHub.
