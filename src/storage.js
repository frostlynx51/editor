import { CONFIG } from "./config";

function getRepoKey(settings) {
  return settings?.repo || "unknown";
}

function getDraftKey(settings, filePath) {
  return `${CONFIG.STORAGE_KEYS.DRAFT_PREFIX}:${getRepoKey(settings)}:${filePath}`;
}

function getLastSavedKey(settings, filePath) {
  return `${CONFIG.STORAGE_KEYS.LAST_SAVED_PREFIX}:${getRepoKey(settings)}:${filePath}`;
}

function getFileStateKey(settings, filePath) {
  return `${CONFIG.STORAGE_KEYS.FILE_STATE_PREFIX}:${getRepoKey(settings)}:file:${filePath}`;
}

function getRecentFilesKey(settings) {
  return `${CONFIG.STORAGE_KEYS.FILE_STATE_PREFIX}:${getRepoKey(settings)}:${CONFIG.STORAGE_KEYS.RECENT_FILES_SUFFIX}`;
}

function getDirtyFilesKey(settings) {
  return `${CONFIG.STORAGE_KEYS.FILE_STATE_PREFIX}:${getRepoKey(settings)}:${CONFIG.STORAGE_KEYS.DIRTY_FILES_SUFFIX}`;
}

export function loadSettings() {
  const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      geminiKey: parsed.geminiKey || "",
      dailyFolder: parsed.dailyFolder || CONFIG.DEFAULT_DAILY_FOLDER,
      dailyFormat: parsed.dailyFormat || CONFIG.DEFAULT_DAILY_FORMAT,
    };
  } catch {
    return null;
  }
}

export function saveSettings(repo, token, dailyFolder, dailyFormat, geminiKey = "") {
  const settings = {
    repo,
    token,
    geminiKey: geminiKey || "",
    dailyFolder: dailyFolder || CONFIG.DEFAULT_DAILY_FOLDER,
    dailyFormat: dailyFormat || CONFIG.DEFAULT_DAILY_FORMAT,
  };
  localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  return settings;
}

export function loadCurrentFile() {
  const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_FILE);
  return stored || "README.md";
}

export function saveCurrentFile(filePath) {
  localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_FILE, filePath);
}

export function loadDraft(settings, filePath) {
  const stored = localStorage.getItem(getDraftKey(settings, filePath));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveDraft(settings, filePath, content) {
  const payload = {
    content,
    updatedAt: Date.now(),
  };
  localStorage.setItem(getDraftKey(settings, filePath), JSON.stringify(payload));
}

export function clearDraft(settings, filePath) {
  localStorage.removeItem(getDraftKey(settings, filePath));
}

export function loadLastGithubSavedAt(settings, filePath) {
  const stored = localStorage.getItem(getLastSavedKey(settings, filePath));
  return stored ? Number(stored) : null;
}

export function saveLastGithubSavedAt(settings, filePath, timestamp) {
  localStorage.setItem(getLastSavedKey(settings, filePath), String(timestamp));
}

// Multi-file state management

export function loadFileState(settings, filePath) {
  if (!settings) return null;
  const key = getFileStateKey(settings, filePath);
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveFileState(settings, filePath, state) {
  if (!settings) return;
  const key = getFileStateKey(settings, filePath);
  localStorage.setItem(key, JSON.stringify(state));
}

export function clearFileState(settings, filePath) {
  if (!settings) return;
  const key = getFileStateKey(settings, filePath);
  localStorage.removeItem(key);
}

export function loadRecentFiles(settings) {
  if (!settings) return [];
  const key = getRecentFilesKey(settings);
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveRecentFiles(settings, files) {
  if (!settings) return;
  const key = getRecentFilesKey(settings);
  localStorage.setItem(key, JSON.stringify(files));
}

export function loadDirtyFiles(settings) {
  if (!settings) return [];
  const key = getDirtyFilesKey(settings);
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveDirtyFiles(settings, files) {
  if (!settings) return;
  const key = getDirtyFilesKey(settings);
  localStorage.setItem(key, JSON.stringify(files));
}
