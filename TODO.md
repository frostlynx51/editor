# TODO: Improvement Roadmap

## � Recent Updates (March 2, 2026)

### Completed Since Last Review ✅
- **Keyboard shortcuts** - Full set implemented (Save, Daily Note, Toggle Sidebar, Chat, Settings, Help)
- **Directory tree view** - Hierarchical file tree with collapsible folders
- **New file creation** - "+" button in file tree to create files in any directory
- **GitHub API client** - Migrated to `@octokit/rest` for better API handling
- **Multi-file editing** - FileManager handles multiple open files with per-file state
- **Batch committing** - All dirty files saved in single commit to GitHub
- **Recent files** - Quick access to recently opened files

### In Progress / Partially Done ⚠️
- **Loading feedback** - Text status exists but no visual spinner animation yet
- **Error messages** - Basic error handling but could be more specific

---

## �🔥 High Priority (Quick Wins)

### Usability Improvements
- [x] **Add keyboard shortcuts** ✅ DONE
  - `Ctrl/Cmd + S` to save
  - `Ctrl/Cmd + D` for daily notes
  - `Ctrl/Cmd + B` to toggle sidebar
  - `Ctrl/Cmd + K` to toggle chat
  - `Ctrl/Cmd + ,` for settings
  - `Ctrl/Cmd + /` for help
- [ ] **Add visual loading spinner** - Currently shows text feedback ("Saving...") but needs CSS spinner animation
- [x] **Add "New File" button** ✅ DONE - "+" button in file tree
- [ ] **Better error messages** - Make them specific (e.g., "Failed to save: File was modified by another commit")

### Core Features
- [ ] **Conflict Detection**
  - Detect if file changed on GitHub while editing locally
  - Show diff or merge options
  - Compare current SHA with remote SHA before saving

## 📚 Code Quality Improvements

### Error Handling
- [ ] **Improve error handling in `src/github.js`**
  - Add more specific error messages for different API failures
  - Add retry logic for network failures (exponential backoff)
  - Log errors for debugging (consider debug mode)
- [ ] **Better error context in `fetchGeminiFileUri`**
  - Currently silently ignores errors
  - Add optional logging for debugging

### State Management
- [ ] **Refactor global state in `src/main.js`**
  - Extract state variables (lines 24-32) into state object
  - Consider simple state management pattern
  - Make state testable

### Configuration
- [ ] **Make timing constants configurable**
  - `AUTOSAVE_DEBOUNCE_MS` (currently 1000ms)
  - `GITHUB_AUTOSAVE_INTERVAL_MS` (currently 15 minutes)
  - Add UI settings for these values
- [ ] **Create `src/config.js`**
  - Consolidate all configuration constants
  - Make them easy to find and modify

### Documentation
- [ ] **Add JSDoc comments** - Better IDE support and type hints
- [ ] **Add inline documentation** - Complex functions need explanations
- [ ] **Consider TypeScript migration** - For larger refactors and better type safety

### Testing
- [ ] **Add unit tests**
  - Test pure functions in `src/github.js`
  - Test utility functions in `src/storage.js`
  - Test date formatting in `src/dailyNotes.js`
- [ ] **Add integration tests**
  - Test GitHub API interactions (mocked)
  - Test editor initialization
- [ ] **Set up testing framework** - Jest or Vitest (already using Vite)

## 📦 Library Replacements/Additions

### Replace Custom Implementations
- [x] **Base64 encoding** ✅ DONE - Using native `Buffer.from().toString('base64')` via @octokit
- [ ] **Date formatting** (`generateDailyNotePath` in `src/dailyNotes.js`)
  - Use `date-fns` (lightweight, tree-shakeable)
  - Or `Luxon` (more powerful)
  - Replace manual string replacement with `format(now, 'yyyy-MM-dd')`

### New Libraries to Add
- [ ] **Debouncing** - Replace manual timer management
  - Use `lodash.debounce` (just the debounce function)
  - Apply to autosave in `FileManager`
- [x] **GitHub API Client** ✅ DONE - Using `@octokit/rest`
  - Handles authentication, API calls, and error handling
  - Already in package.json and used throughout `src/github.js`
- [ ] **Modal accessibility**
  - Use `focus-trap` for better keyboard navigation
  - Use `tabbable` to manage tab order in modals
  - Improve WCAG compliance

## ✨ Missing Features

### Medium Priority
- [ ] **Offline Support**
  - Add service worker
  - Queue saves for when back online
  - Cache files locally
- [ ] **File History/Versioning**
  - View previous versions (from GitHub commits)
  - Restore old content
  - Show commit timeline
- [ ] **Search in Content**
  - Currently only searches filenames
  - Add full-text search across all notes
  - Consider client-side search index
- [x] **Folder/Directory Tree View** ✅ DONE
  - Hierarchical tree view implemented in `src/fileTree.js`
  - Collapsible folders working
  - Shows recent files at the top
- [ ] **Cross-Note Links**
  - Support `[[wiki-style]]` links
  - Auto-complete existing note names
  - Click to navigate between notes
- [ ] **Better Mobile Support**
  - Touch-friendly editor controls
  - Responsive layout for small screens
  - Handle pinch-to-zoom

### Nice to Have
- [ ] **Custom Templates**
  - Beyond daily notes
  - Meeting notes, project plans, etc.
  - Template picker UI
- [ ] **Dark Mode**
  - Add Solarized Dark variant
  - Theme switcher in settings
  - Respect system preference
- [ ] **Chat History**
  - Remember last chat messages in localStorage
  - Clear history button
  - Export chat conversation
- [ ] **Gemini Rate Limit Handling**
  - Better error messages for rate limits
  - Retry with backoff
  - Usage quota display

## 🏗️ Architecture Improvements

### Refactoring
- [ ] **Extract UI Components from `src/main.js`**
  - Create `ui/SettingsModal.js`
  - Create `ui/FilePickerModal.js`
  - Create `ui/ChatPanel.js`
  - Create `ui/StatusBar.js`
  - Reduce `main.js` complexity (currently 400+ lines)
- [ ] **Implement Event Bus Pattern**
  - Create `src/events.js`
  - Replace callback passing with event emitter
  - Define events: `FILE_CHANGED`, `SAVE_COMPLETE`, etc.
  - Decouple components

### Performance
- [ ] **Optimize for Large Files**
  - Test with files >10k lines
  - Add virtual scrolling if needed
  - Lazy load syntax highlighting
- [ ] **Optimize Many Files**
  - `loadRepoMarkdownFiles` loads entire tree
  - Add pagination or lazy loading
  - Virtual list for file picker
- [ ] **Add Rate Limit Handling**
  - Both GitHub API and Gemini API
  - Show remaining quota
  - Warn before hitting limits

## 🔒 Security & Privacy

### Token Security
- [ ] **Improve token storage security**
  - localStorage is vulnerable to XSS
  - Add warning to users
  - Consider sessionStorage option
  - Or encrypt with user password
- [ ] **Gemini API Key Security**
  - Same localStorage concerns
  - Consider backend proxy option
  - Add security documentation

### Production Deployment
- [ ] **Fix CORS Proxy Issue**
  - Vite dev server proxy won't work in production
  - **Option A:** Deploy Node.js/Cloudflare Worker backend
    - Proxy GitHub API calls
    - Store tokens server-side with user auth
  - **Option B:** Implement GitHub OAuth App
    - Official OAuth flow
    - Better security, no manual tokens
  - **Option C:** Browser Extension
    - Direct GitHub API access
    - More permissions, works offline
    - Need to package as extension

## 📝 Documentation

- [ ] **Add CONTRIBUTING.md** - Guide for contributors
- [ ] **Add ARCHITECTURE.md** - Explain code organization
- [ ] **Improve README.md**
  - Add screenshots
  - Add demo video/GIF
  - More detailed setup instructions
  - Troubleshooting section
- [ ] **Add inline code comments** - Complex logic needs explanation
- [ ] **Document security best practices** - Token permissions, safe usage

## 🎯 Priority Order Recommendation

1. **Week 1: Quick Wins**
   - [x] ~~Keyboard shortcuts~~ ✅ DONE
   - [x] ~~New file button~~ ✅ DONE
   - [ ] Visual loading spinner (CSS animation)
   - [ ] Escape to close modals
   - [ ] Better error messages

2. **Week 2: Core Features**
   - [ ] Markdown preview toggle
   - [ ] Delete file functionality
   - [ ] Rename file functionality
   - [ ] Conflict detection

3. **Week 3: Code Quality**
   - [ ] Error handling improvements (retries, better messages)
   - [ ] State management refactor
   - [ ] Add basic tests
   - [ ] Extract CSS into component files

4. **Week 4: Library Integration**
   - [x] ~~Add `@octokit/rest`~~ ✅ DONE
   - [ ] Add `date-fns` for date formatting
   - [ ] Add `lodash.debounce` or similar
   - [ ] Consider focus-trap for modals

5. **Month 2: Missing Features**
   - [ ] Offline support with service worker
   - [ ] File history from GitHub commits
   - [ ] Full-text search across files
   - [ ] File upload & drag-drop support

6. **Month 3: Architecture & Polish**
   - [ ] Component extraction (UI modules)
   - [ ] Event bus pattern
   - [ ] Dark mode
   - [ ] Performance optimization for large repos

---

**Note:** This is an ambitious list. Pick items based on your priorities and user feedback. The "Quick Wins" section provides maximum value with minimal effort.
## 🆕 New Items Based on Current State

### Quick Wins
- [ ] **Add CSS spinner animation** - Text says "Saving..." but no visual spinner
  - Add rotating icon/spinner next to status text
  - Use CSS `@keyframes` animation
- [ ] **Escape to close modals** - Currently have to click cancel button
  - Add keydown listener for ESC key on all modals
- [ ] **Improve new file UX**
  - Pre-select directory by clicking folder first
  - Better validation for file names
  - Show toast/success message when file is created

### Missing Core Features
- [ ] **Delete File Functionality**
  - Add delete button in file tree (on hover or context menu)
  - Confirmation dialog before deleting
  - Delete via GitHub API
- [ ] **Rename File Functionality**
  - Context menu or button to rename files
  - Update references if using wiki-links in future
- [ ] **Markdown Preview Toggle**
  - Split pane or toggle view
  - Live preview of rendered markdown
  - Keep scroll position synced
- [ ] **File Upload Support**
  - Drag & drop files into editor
  - Upload images and link them
  - Create assets folder automatically

### Code Organization
- [ ] **Extract FileTree into separate CSS file**
  - Currently all styles are in `src/style.css`
  - Create `src/components/FileTree.css` or similar
  - Better maintainability
- [ ] **Create constants file**
  - Extract GEMINI_MODEL, AUTOSAVE_DEBOUNCE_MS, etc.
  - Centralize all magic numbers and strings
- [ ] **Improve Gemini file context handling**
  - Currently reads `gemini_file_id.txt` to get uploaded file context
  - Add UI to show which context mode is active
  - Allow uploading new file bundles from the UI
  - Cache the file URI to avoid repeated fetches

### Bug Fixes & Edge Cases
- [ ] **Handle network failures gracefully**
  - Currently errors just show in status bar
  - Add retry mechanism for failed saves
  - Show queue of pending changes when offline
- [ ] **File tree doesn't update after batch save**
  - Verify dirty indicators clear properly after save
  - May need to fetch updated SHA from GitHub
- [ ] **Validate repository exists before loading**
  - Currently just fails when fetching files
  - Add explicit repo existence check in settings
- [ ] **Handle empty repositories**
  - Show helpful message if repo has no markdown files
  - Offer to create initial README.md
- [ ] **Autosave interval edge cases**
  - Pause autosave when user is actively typing
  - Resume after idle period
  - Visual indicator showing next autosave time

### Performance & Scalability
- [ ] **Large file handling**
  - Test with files >10k lines
  - Consider virtual scrolling or lazy loading
  - Warning message for very large files
- [ ] **Large repository handling**
  - Currently loads entire tree recursively
  - May timeout on repos with 1000+ files
  - Add pagination or lazy loading for file list
- [ ] **Optimize localStorage usage**
  - Currently stores drafts for every file
  - Clear old drafts after successful GitHub save
  - Add storage quota monitoring
  - Add explicit repo existence check in settings