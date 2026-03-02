/**
 * Centralized Configuration and Constants
 * 
 * All magic numbers, timing values, API endpoints, and configuration defaults
 * are defined here for easy maintenance and modification.
 */

export const CONFIG = {
  // Timing Configuration
  AUTOSAVE_DEBOUNCE_MS: 1000,
  GITHUB_AUTOSAVE_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
  GITHUB_STATUS_REFRESH_MS: 60 * 1000, // 1 minute
  
  // Gemini API Configuration
  GEMINI_MODEL: "gemini-2.5-flash",
  GEMINI_API_BASE: "https://generativelanguage.googleapis.com/v1beta",
  GEMINI_FILE_ID_PATH: "gemini_file_id.txt",
  
  // Default Settings
  DEFAULT_DAILY_FOLDER: "Daily Notes",
  DEFAULT_DAILY_FORMAT: "YYYY-MM-DD",
  DEFAULT_BRANCH: "main",
  
  // UI Configuration
  MAX_RECENT_FILES: 10,
  FILE_SEARCH_DEBOUNCE_MS: 300,
  
  // Storage Keys
  STORAGE_KEYS: {
    SETTINGS: "github-settings",
    CURRENT_FILE: "github-current-file",
    // Dynamic keys use these prefixes
    DRAFT_PREFIX: "github-draft",
    LAST_SAVED_PREFIX: "github-last-saved",
    FILE_STATE_PREFIX: "editor",
    RECENT_FILES_SUFFIX: "recent",
    DIRTY_FILES_SUFFIX: "dirty",
  },
};
