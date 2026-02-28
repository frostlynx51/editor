# GitHub Markdown Editor

A web-based markdown editor with GitHub integration, daily notes, and AI chat assistance.

## Features

### Core Editing
- **CodeMirror 6 Editor** - Modern markdown editor with syntax highlighting
- **Hashtag Support** - Automatic highlighting of #tags throughout your notes
- **Auto-save** - Local drafts saved automatically as you type
- **Multi-file Support** - Browse and edit any markdown file in your repository

### GitHub Integration
- **Load & Save** - Connect to any GitHub repository (owner/repo format)
- **Auto-sync** - Automatic GitHub saves every 15 minutes
- **File Browser** - Search and switch between markdown files in your repo
- **Personal Access Token** - Secure authentication with GitHub API

### Daily Notes
- **Quick Creation** - One-click daily note generation
- **Customizable Format** - Configure date format (YYYY-MM-DD) and folder location
- **Template Support** - Pre-filled templates with tasks and notes sections

### Gemini AI Chat
- **Context-Aware** - Ask questions about your current note
- **Gemini 2.5 Flash** - Fast AI responses powered by Google Gemini
- **Side Panel** - Non-intrusive chat interface alongside your editor
- **Uploaded File Context** - Use a bundle of all your notes as context for queries
  - Create a `gemini_file_id.txt` file at the repository root with format:
    ```
    files/cjy1cigdm3xb
    # URI: https://generativelanguage.googleapis.com/v1beta/files/cjy1cigdm3xb
    # Uploaded: 2026-02-28 08:30:18
    ```
  - First line contains the file ID (e.g., `files/xyz123`)
  - When present, Gemini uses this uploaded file instead of the current note
  - Visual indicator shows which context mode is active for each response

## Setup

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. On first visit, enter:
   - GitHub repository (format: `owner/repo`)
   - GitHub personal access token
   - (Optional) Gemini API key for chat features
   - (Optional) Daily notes folder and date format

## Usage

- **Edit Files**: Content is auto-saved locally; click Save for GitHub sync
- **Settings**: Click ⚙️ to change repository, tokens, or daily notes config
- **Switch Files**: Click the file selector to browse repository markdown files
- **Daily Notes**: Click the calendar icon to create/open today's note
- **AI Chat**: Click the chat icon to ask Gemini about your current note (or all notes if `gemini_file_id.txt` exists)

## Security Notes

- All settings (tokens, repo) are stored in browser localStorage
- GitHub token is used client-side only for API calls
- Use fine-grained tokens with read/write access limited to specific repositories
- Gemini API key is sent directly to Google's API (not stored on any server)

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
