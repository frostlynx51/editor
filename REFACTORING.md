# Refactoring Plan

**Goal:** Reduce code size, increase modularity, improve maintainability and readability

**Current State:**
- Total codebase: ~2,770 lines
- `src/main.js`: 678 lines (24% of codebase) - **TOO LARGE**
- `src/style.css`: 974 lines (35% of codebase) - **NEEDS SPLITTING**
- Other modules: Well-sized (26-332 lines each)

---

## Phase 1: Extract Configuration & Constants (Est. -50 lines from main.js)

**Priority:** HIGH | **Effort:** LOW | **Impact:** HIGH

### 1.1 Create `src/config.js`
Extract all magic numbers and configuration constants into a centralized file:

```javascript
// src/config.js
export const CONFIG = {
  // Timing
  AUTOSAVE_DEBOUNCE_MS: 1000,
  GITHUB_AUTOSAVE_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
  
  // Gemini API
  GEMINI_MODEL: "gemini-2.0-flash-exp",
  GEMINI_API_BASE: "https://generativelanguage.googleapis.com/v1beta",
  
  // Default Settings
  DEFAULT_DAILY_FOLDER: "daily",
  DEFAULT_DAILY_FORMAT: "YYYY-MM-DD",
  
  // UI
  MAX_RECENT_FILES: 10,
  FILE_SEARCH_DEBOUNCE_MS: 300,
  
  // Storage Keys
  STORAGE_KEYS: {
    SETTINGS: 'github-editor-settings',
    RECENT_FILES: 'github-editor-recent-files',
    DIRTY_FILES: 'github-editor-dirty-files',
    LAST_GITHUB_SAVE: 'github-editor-last-github-saved',
    GEMINI_FILE_ID: 'gemini_file_id.txt'
  }
};
```

**Files to modify:**
- Create `src/config.js`
- Update `src/main.js`, `src/storage.js`, `src/fileManager.js`, `src/dailyNotes.js`

**Expected reduction:** ~30 lines from main.js, better maintainability

---

## Phase 2: Extract UI Components from main.js (Est. -400 lines)

**Priority:** HIGH | **Effort:** MEDIUM | **Impact:** VERY HIGH

The largest win for modularity. Break main.js into focused UI component files.

### 2.1 Create `src/ui/StatusBar.js` (~40 lines)
Extract status message and GitHub save indicator logic.

**Responsibilities:**
- Update status messages
- Show/hide GitHub save indicator
- Format timestamps
- Loading spinners

**Interface:**
```javascript
export class StatusBar {
  constructor(statusEl, githubSavedEl) { ... }
  setStatus(message) { ... }
  clearStatus() { ... }
  showGithubSaved(timestamp) { ... }
  hideGithubSaved() { ... }
  showLoading(message) { ... }
  hideLoading() { ... }
}
```

### 2.2 Create `src/ui/SettingsModal.js` (~80 lines)
Extract settings modal management.

**Responsibilities:**
- Show/hide settings modal
- Validate form inputs
- Save settings
- Handle keyboard shortcuts (ESC to close)

**Interface:**
```javascript
export class SettingsModal {
  constructor(elements, onSave) { ... }
  show() { ... }
  hide() { ... }
  getFormData() { ... }
  setFormData(settings) { ... }
  validate() { ... }
}
```

### 2.3 Create `src/ui/FilePickerModal.js` (~100 lines)
Extract file picker modal and search logic.

**Responsibilities:**
- Show/hide file picker
- Filter files by search
- Render file list
- Handle file selection
- Show recent files section

**Interface:**
```javascript
export class FilePickerModal {
  constructor(elements, onFileSelect) { ... }
  show(files, recentFiles) { ... }
  hide() { ... }
  filterFiles(query) { ... }
  renderFileList() { ... }
}
```

### 2.4 Create `src/ui/ChatPanel.js` (~120 lines)
Extract chat panel and Gemini API integration.

**Responsibilities:**
- Show/hide chat panel
- Send messages to Gemini API
- Render chat messages
- Handle streaming responses
- Fetch Gemini file context

**Interface:**
```javascript
export class ChatPanel {
  constructor(elements, settings) { ... }
  show() { ... }
  hide() { ... }
  toggle() { ... }
  sendMessage(text) { ... }
  addMessage(role, content) { ... }
  clearMessages() { ... }
  async fetchGeminiFileUri() { ... }
}
```

### 2.5 Create `src/ui/Sidebar.js` (~60 lines)
Extract sidebar toggle logic.

**Responsibilities:**
- Show/hide sidebar
- Toggle state management
- Keyboard shortcut handler

**Interface:**
```javascript
export class Sidebar {
  constructor(sidebarEl, toggleBtn) { ... }
  show() { ... }
  hide() { ... }
  toggle() { ... }
  isVisible() { ... }
}
```

**Total reduction from main.js:** ~400 lines (59% reduction!)

---

## Phase 3: Create State Management Pattern (Est. -50 lines)

**Priority:** MEDIUM | **Effort:** MEDIUM | **Impact:** HIGH

### 3.1 Create `src/state/AppState.js`
Centralize application state instead of scattered variables.

```javascript
// src/state/AppState.js
export class AppState {
  constructor() {
    this.editor = null;
    this.settings = null;
    this.fileManager = null;
    this.fileTree = null;
    this.currentFile = null;
    this.allFiles = [];
    this.autosaveInterval = null;
    
    // UI component instances
    this.ui = {
      statusBar: null,
      settingsModal: null,
      filePickerModal: null,
      chatPanel: null,
      sidebar: null
    };
  }
  
  isConfigured() {
    return this.settings?.token && this.settings?.repo;
  }
  
  reset() {
    this.currentFile = null;
    this.allFiles = [];
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
    }
  }
}
```

**Files to modify:**
- Create `src/state/AppState.js`
- Update `src/main.js` to use single state object

**Benefits:**
- Single source of truth
- Easier to debug
- Testable
- Clearer data flow

---

## Phase 4: Implement Event Bus Pattern (Est. +100 lines, -150 lines callback code)

**Priority:** MEDIUM | **Effort:** MEDIUM | **Impact:** HIGH

Decouple components by replacing direct callbacks with events.

### 4.1 Create `src/events/EventBus.js`

```javascript
// src/events/EventBus.js
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) callbacks.splice(index, 1);
  }
  
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }
}
```

### 4.2 Define Event Types

```javascript
// src/events/events.js
export const EVENTS = {
  // File events
  FILE_OPENED: 'file:opened',
  FILE_CHANGED: 'file:changed',
  FILE_SAVED: 'file:saved',
  FILE_CREATED: 'file:created',
  FILES_LOADED: 'files:loaded',
  
  // Settings events
  SETTINGS_CHANGED: 'settings:changed',
  SETTINGS_SAVED: 'settings:saved',
  
  // UI events
  STATUS_UPDATE: 'status:update',
  GITHUB_SAVE_COMPLETE: 'github:save:complete',
  
  // Error events
  ERROR: 'error'
};
```

**Example usage:**
```javascript
// Before (tightly coupled)
fileManager.onFileChanged((path, content) => {
  currentFileEl.textContent = path;
  statusBar.setStatus("Unsaved changes");
});

// After (decoupled)
eventBus.on(EVENTS.FILE_CHANGED, ({ path, content }) => {
  // UI updates automatically
});
```

**Benefits:**
- Components don't need references to each other
- Easier to add new features
- Better testability
- Clearer separation of concerns

---

## Phase 5: Split CSS into Modules (Est. -974 lines from style.css)

**Priority:** MEDIUM | **Effort:** LOW | **Impact:** MEDIUM

### 5.1 Create Component CSS Files

**New structure:**
```
src/
  styles/
    base.css           (~100 lines) - Reset, typography, variables
    layout.css         (~80 lines)  - Main layout, grid, containers
    editor.css         (~120 lines) - CodeMirror, editor wrapper
    sidebar.css        (~100 lines) - Sidebar, file tree
    modals.css         (~150 lines) - Settings, file picker
    chat.css           (~120 lines) - Chat panel
    statusbar.css      (~60 lines)  - Status bar, indicators
    buttons.css        (~80 lines)  - Button styles
    fileTree.css       (~150 lines) - File tree specific styles
    utilities.css      (~50 lines)  - Helper classes
```

### 5.2 Update Imports in main.js
```javascript
// Instead of single style.css
import './styles/base.css';
import './styles/layout.css';
import './styles/components/editor.css';
// etc.
```

**Benefits:**
- Easier to find styles
- Better code organization
- Smaller file sizes
- Vite will tree-shake unused CSS in production

---

## Phase 6: Add Missing Libraries (Est. -30 lines custom code)

**Priority:** MEDIUM | **Effort:** LOW | **Impact:** MEDIUM

### 6.1 Add `date-fns` for Date Formatting
Replace manual date formatting in `src/dailyNotes.js`.

**Before:**
```javascript
function generateDailyNotePath(settings) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  // ... complex string manipulation
}
```

**After:**
```javascript
import { format } from 'date-fns';

function generateDailyNotePath(settings) {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');
  // ... simpler code
}
```

### 6.2 Add `lodash.debounce` for Debouncing
Replace manual timer management.

**Before:**
```javascript
let timer = null;
input.addEventListener('input', () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    // do something
  }, 300);
});
```

**After:**
```javascript
import debounce from 'lodash.debounce';

const handleInput = debounce(() => {
  // do something
}, 300);
input.addEventListener('input', handleInput);
```

### 6.3 Add `focus-trap` for Modal Accessibility
Improve keyboard navigation in modals.

**Installation:**
```bash
npm install date-fns lodash.debounce focus-trap
```

---

## Phase 7: Improve Error Handling (Est. +80 lines)

**Priority:** MEDIUM | **Effort:** MEDIUM | **Impact:** MEDIUM

### 7.1 Create Error Classes

```javascript
// src/errors/GithubError.js
export class GithubError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'GithubError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}
```

### 7.2 Add Retry Logic with Exponential Backoff

```javascript
// src/utils/retry.js
export async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

### 7.3 Better Error Messages in UI

Replace generic "Failed to save" with specific messages:
- "Failed to save: Network connection lost"
- "Failed to save: File was modified remotely"
- "Failed to save: GitHub rate limit exceeded (resets at 3:45 PM)"
- "Failed to save: Authentication failed (check token)"

---

## Phase 8: Add JSDoc Comments (Est. +200 lines documentation)

**Priority:** LOW | **Effort:** LOW | **Impact:** MEDIUM

Add JSDoc comments to all public functions and classes.

**Example:**
```javascript
/**
 * Fetches a file from GitHub repository
 * @param {Object} options - Options object
 * @param {Object} options.settings - GitHub settings (repo, token)
 * @param {string} options.path - File path in repository
 * @returns {Promise<{content: string, sha: string}>} File content and SHA
 * @throws {GithubError} If file not found or API error
 */
export async function fetchFileFromGithub({ settings, path }) {
  // ...
}
```

**Benefits:**
- Better IDE autocomplete
- Inline documentation
- Type hints without TypeScript
- Easier onboarding for contributors

---

## Phase 9: Testing Infrastructure (Est. +300 lines tests)

**Priority:** LOW | **Effort:** HIGH | **Impact:** HIGH (long-term)

### 9.1 Add Vitest
Already using Vite, so Vitest is the natural choice.

```bash
npm install -D vitest @vitest/ui
```

### 9.2 Create Test Files

```
src/
  __tests__/
    config.test.js
    dailyNotes.test.js
    storage.test.js
    utils/retry.test.js
    state/AppState.test.js
```

### 9.3 Test Pure Functions First
Start with utilities and helpers that don't depend on DOM or external APIs.

**Example:**
```javascript
// src/__tests__/dailyNotes.test.js
import { describe, it, expect } from 'vitest';
import { generateDailyNotePath } from '../dailyNotes';

describe('generateDailyNotePath', () => {
  it('generates correct path with default format', () => {
    const settings = { dailyFolder: 'daily' };
    const result = generateDailyNotePath(settings);
    expect(result).toMatch(/^daily\/\d{4}-\d{2}-\d{2}\.md$/);
  });
});
```

---

## Implementation Order & Timeline

### Week 1-2: Foundation (Phases 1-3)
**Focus:** Extract config, state management, start UI components

1. ✅ Create `src/config.js` (Day 1)
2. ✅ Create `src/state/AppState.js` (Day 1-2)
3. ✅ Extract `src/ui/StatusBar.js` (Day 2-3)
4. ✅ Extract `src/ui/Sidebar.js` (Day 3)
5. ✅ Update main.js to use new modules (Day 4-5)
6. ✅ Test and debug (Day 5-7)

**Expected outcome:** 
- main.js reduced from 678 to ~580 lines
- Better code organization

### Week 3-4: Major Refactor (Phase 2 continued)
**Focus:** Extract remaining UI components

1. ✅ Extract `src/ui/SettingsModal.js` (Day 1-2)
2. ✅ Extract `src/ui/FilePickerModal.js` (Day 3-4)
3. ✅ Extract `src/ui/ChatPanel.js` (Day 5-6)
4. ✅ Update main.js to orchestrate components (Day 7)
5. ✅ Test all interactions (Day 8-10)

**Expected outcome:**
- main.js reduced from ~580 to ~200 lines (70% reduction!)
- Modular, testable UI components

### Week 5: Event Bus & CSS Split (Phases 4-5)
**Focus:** Decouple components, organize styles

1. ✅ Create EventBus (Day 1)
2. ✅ Replace callbacks with events (Day 2-3)
3. ✅ Split CSS into modules (Day 4-5)

**Expected outcome:**
- Better separation of concerns
- Organized stylesheets

### Week 6: Libraries & Error Handling (Phases 6-7)
**Focus:** Add external libraries, improve errors

1. ✅ Add date-fns, lodash.debounce (Day 1)
2. ✅ Refactor date formatting (Day 1)
3. ✅ Add error classes (Day 2)
4. ✅ Implement retry logic (Day 3)
5. ✅ Better error messages in UI (Day 4-5)

### Week 7-8: Documentation & Testing (Phases 8-9)
**Focus:** JSDoc, tests, polish

1. ✅ Add JSDoc to all modules (Day 1-3)
2. ✅ Set up Vitest (Day 4)
3. ✅ Write tests for utilities (Day 5-7)
4. ✅ Write tests for components (Day 8-10)

---

## Expected Outcomes

### Code Size Reduction
| File | Before | After | Change |
|------|--------|-------|--------|
| main.js | 678 lines | ~200 lines | **-70%** |
| style.css | 974 lines | ~100 lines | **-90%** |
| **Total** | **2,770 lines** | **~2,500 lines** | **-10%** |

*Note: Total reduction is smaller because we're adding new files (UI components, config, state, styles), but code is much more organized.*

### Modularity Improvement
- **Before:** 8 files (1 monolithic main.js)
- **After:** 25+ files (focused, single-responsibility modules)

### File Size Distribution
- **Before:** 1 file >600 lines, 1 file >300 lines
- **After:** All files <150 lines (except style files split into modules)

### Maintainability Metrics
- ✅ Single Responsibility Principle: Each module has one clear purpose
- ✅ Open/Closed Principle: Easy to extend without modifying existing code
- ✅ Dependency Inversion: Components depend on events, not concrete implementations
- ✅ Testability: Pure functions and isolated components
- ✅ Readability: Smaller files, clear naming, JSDoc comments

---

## Success Criteria

✅ **Reduced Complexity:**
- No file exceeds 200 lines
- main.js is just orchestration/bootstrap code
- Each module has a single, clear responsibility

✅ **Improved Modularity:**
- UI components are self-contained
- Components communicate via events, not direct coupling
- Easy to add/remove features without touching core code

✅ **Better Maintainability:**
- New developers can onboard quickly
- Bug fixes are localized to specific modules
- Features can be developed independently

✅ **Enhanced Readability:**
- Clear file structure and naming
- JSDoc comments provide context
- Code follows consistent patterns

✅ **Future-Ready:**
- Testing infrastructure in place
- Easy to add TypeScript later if needed
- Ready for further features (offline support, plugins, etc.)

---

## Risk Mitigation

### Risk: Breaking Changes During Refactor
**Mitigation:** 
- Refactor incrementally, one component at a time
- Test after each extraction
- Keep git commits small and focused
- Create feature branch for refactor

### Risk: Regression Bugs
**Mitigation:**
- Manual testing checklist for each phase
- Automated tests before major changes
- Keep original code in git history

### Risk: Scope Creep
**Mitigation:**
- Stick to the plan
- No new features during refactor
- Mark optional items clearly
- Time-box each phase

---

## Post-Refactor Maintenance

### Code Review Checklist
- [ ] No file exceeds 200 lines
- [ ] New components follow established patterns
- [ ] JSDoc comments added
- [ ] Events used for cross-component communication
- [ ] Tests added for new functionality
- [ ] No hardcoded configuration values
- [ ] Error handling follows standard patterns

### Future Refactoring Opportunities
After this major refactor, consider:
- TypeScript migration
- React/Vue/Svelte for UI components
- Service Worker for offline support
- Plugin architecture for extensibility
- CSS-in-JS or CSS modules
- Monorepo structure if adding backend

---

**Document Version:** 1.0  
**Last Updated:** March 2, 2026  
**Status:** Ready for Implementation
