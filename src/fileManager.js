import {
  loadFileState,
  saveFileState,
  loadRecentFiles,
  saveRecentFiles,
  loadDirtyFiles,
  saveDirtyFiles,
  clearFileState
} from './storage';

/**
 * Manages multiple open files and their states
 */
export class FileManager {
  constructor(settings) {
    this.settings = settings;
    // Map of path -> { content, isDirty, githubSha, localSha, lastModified }
    this.openFiles = new Map();
    // Current active file path
    this.activeFile = null;
    // Recent files list (most recent first)
    this.recentFiles = [];
    // Set of files with unsaved changes
    this.dirtyFiles = new Set();
    // Debounce timers per file
    this.saveTimers = new Map();
    
    this.loadState();
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    if (!this.settings) return;
    
    this.recentFiles = loadRecentFiles(this.settings);
    this.dirtyFiles = new Set(loadDirtyFiles(this.settings));
  }

  /**
   * Get active file path
   */
  getActiveFile() {
    return this.activeFile;
  }

  /**
   * Get recent files list
   */
  getRecentFiles() {
    return [...this.recentFiles];
  }

  /**
   * Get all dirty file paths
   */
  getDirtyFiles() {
    return Array.from(this.dirtyFiles);
  }

  /**
   * Check if a file is dirty
   */
  isFileDirty(filePath) {
    return this.dirtyFiles.has(filePath);
  }

  /**
   * Get file state
   */
  getFileState(filePath) {
    if (this.openFiles.has(filePath)) {
      return this.openFiles.get(filePath);
    }
    
    // Load from localStorage
    const state = loadFileState(this.settings, filePath);
    if (state) {
      this.openFiles.set(filePath, state);
    }
    return state;
  }

  /**
   * Set file content and mark as dirty
   */
  setFileContent(filePath, content, options = {}) {
    let state = this.openFiles.get(filePath);
    
    if (!state) {
      state = {
        content: '',
        isDirty: false,
        githubSha: null,
        lastModified: Date.now()
      };
      this.openFiles.set(filePath, state);
    }

    const contentChanged = state.content !== content;
    state.content = content;
    state.lastModified = Date.now();
    
    // Mark as dirty if content changed (unless explicitly marked clean)
    if (contentChanged && !options.isClean) {
      state.isDirty = true;
      this.dirtyFiles.add(filePath);
      saveDirtyFiles(this.settings, Array.from(this.dirtyFiles));
    }
    
    // Schedule auto-save with debounce
    if (options.autoSave !== false) {
      this.scheduleSave(filePath);
    }
  }

  /**
   * Schedule debounced save to localStorage
   */
  scheduleSave(filePath, delayMs = 1000) {
    // Clear existing timer
    if (this.saveTimers.has(filePath)) {
      clearTimeout(this.saveTimers.get(filePath));
    }
    
    // Schedule new save
    const timer = setTimeout(() => {
      const state = this.openFiles.get(filePath);
      if (state) {
        saveFileState(this.settings, filePath, state);
      }
      this.saveTimers.delete(filePath);
    }, delayMs);
    
    this.saveTimers.set(filePath, timer);
  }

  /**
   * Immediately save file state to localStorage
   */
  saveFileImmediate(filePath) {
    // Cancel scheduled save
    if (this.saveTimers.has(filePath)) {
      clearTimeout(this.saveTimers.get(filePath));
      this.saveTimers.delete(filePath);
    }
    
    const state = this.openFiles.get(filePath);
    if (state) {
      saveFileState(this.settings, filePath, state);
    }
  }

  /**
   * Mark file as clean (synced with GitHub)
   */
  markFileClean(filePath, githubSha = null) {
    const state = this.openFiles.get(filePath);
    if (state) {
      state.isDirty = false;
      if (githubSha) {
        state.githubSha = githubSha;
      }
      this.dirtyFiles.delete(filePath);
      saveDirtyFiles(this.settings, Array.from(this.dirtyFiles));
      saveFileState(this.settings, filePath, state);
    }
  }

  /**
   * Switch to a different file
   */
  switchFile(filePath) {
    // Save current file immediately
    if (this.activeFile) {
      this.saveFileImmediate(this.activeFile);
    }
    
    this.activeFile = filePath;
    
    // Update recent files list
    this.recentFiles = this.recentFiles.filter(f => f !== filePath);
    this.recentFiles.unshift(filePath);
    
    // Keep only last 50 recent files
    if (this.recentFiles.length > 50) {
      this.recentFiles = this.recentFiles.slice(0, 50);
    }
    
    saveRecentFiles(this.settings, this.recentFiles);
    
    // Load file state if not in memory
    if (!this.openFiles.has(filePath)) {
      const state = loadFileState(this.settings, filePath);
      if (state) {
        this.openFiles.set(filePath, state);
      }
    }
  }

  /**
   * Load file from GitHub (initial load or refresh)
   */
  async loadFromGithub(filePath, fetchFunction) {
    const content = await fetchFunction(filePath);
    
    // Check if we have local unsaved changes
    const existingState = this.getFileState(filePath);
    
    const state = {
      content,
      isDirty: false,
      githubSha: null, // Will be set by GitHub sync
      lastModified: Date.now()
    };
    
    this.openFiles.set(filePath, state);
    saveFileState(this.settings, filePath, state);
    
    // Return both the GitHub content and whether we have local changes
    return {
      content,
      hasLocalChanges: existingState?.isDirty && existingState.content !== content,
      localContent: existingState?.content
    };
  }

  /**
   * Close a file (remove from recent, optionally clear state)
   */
  closeFile(filePath, clearStorage = false) {
    // Save before closing
    this.saveFileImmediate(filePath);
    
    // Remove from open files
    this.openFiles.delete(filePath);
    
    // Remove from recent
    this.recentFiles = this.recentFiles.filter(f => f !== filePath);
    saveRecentFiles(this.settings, this.recentFiles);
    
    // Optionally clear from localStorage
    if (clearStorage) {
      clearFileState(this.settings, filePath);
      this.dirtyFiles.delete(filePath);
      saveDirtyFiles(this.settings, Array.from(this.dirtyFiles));
    }
  }

  /**
   * Save all dirty files immediately
   */
  saveAllDirty() {
    this.dirtyFiles.forEach(filePath => {
      this.saveFileImmediate(filePath);
    });
  }

  /**
   * Clear all cached states (e.g., when changing repos)
   */
  clearAll() {
    // Cancel all pending saves
    this.saveTimers.forEach(timer => clearTimeout(timer));
    this.saveTimers.clear();
    
    // Clear memory
    this.openFiles.clear();
    this.activeFile = null;
    this.recentFiles = [];
    this.dirtyFiles.clear();
  }
}
