# TODO: Improvement Roadmap

## 🔥 High Priority (Quick Wins)

### Usability Improvements
- [x] **Add keyboard shortcuts**
  - `Ctrl/Cmd + S` to save
  - `Ctrl/Cmd + K` to search files
  - `Escape` to close modals
- [x] **Add loading spinner** - Show visual feedback during GitHub operations
- [x] **Add "New File" button** - Currently can only open existing files
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
- [ ] **Base64 encoding** (`encodeUtf8ToBase64` in `src/github.js`)
  - Consider `js-base64` library
  - Or improve native `TextEncoder` + `btoa` implementation
- [ ] **Date formatting** (`generateDailyNotePath` in `src/dailyNotes.js`)
  - Use `date-fns` (lightweight, tree-shakeable)
  - Or `Luxon` (more powerful)
  - Replace manual string replacement with `format(now, 'yyyy-MM-dd')`

### New Libraries to Add
- [ ] **Debouncing** - Replace manual timer management
  - Use `lodash.debounce` (just the debounce function)
  - Apply to `scheduleLocalAutosave` in `src/main.js`
- [ ] **GitHub API Client** - Replace raw `fetch` calls
  - Use `@octokit/rest` (official client)
  - Handles rate limiting, retries, pagination automatically
  - Better TypeScript support
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
- [ ] **Folder/Directory Tree View**
  - Currently shows flat list of files
  - Add hierarchical tree view
  - Collapsible folders
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
   - Keyboard shortcuts
   - Loading spinner
   - Better error messages
   - New file button

2. **Week 2: Core Features**
   - Markdown preview
   - Conflict detection
   - Keyboard shortcuts implementation

3. **Week 3: Code Quality**
   - Error handling improvements
   - State management refactor
   - Add basic tests

4. **Week 4: Library Integration**
   - Add `@octokit/rest`
   - Add `date-fns`
   - Add `lodash.debounce`

5. **Month 2: Missing Features**
   - Offline support
   - File history
   - Full-text search
   - Tree view

6. **Month 3: Architecture & Polish**
   - Component extraction
   - Event bus pattern
   - Dark mode
   - Performance optimization

---

**Note:** This is an ambitious list. Pick items based on your priorities and user feedback. The "Quick Wins" section provides maximum value with minimal effort.
