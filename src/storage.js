const SETTINGS_KEY = "github-settings";
const CURRENT_FILE_KEY = "github-current-file";

function getRepoKey(settings) {
  return settings?.repo || "unknown";
}

function getDraftKey(settings, filePath) {
  return `github-draft:${getRepoKey(settings)}:${filePath}`;
}

function getLastSavedKey(settings, filePath) {
  return `github-last-saved:${getRepoKey(settings)}:${filePath}`;
}

export function loadSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      dailyFolder: parsed.dailyFolder || "Daily Notes",
      dailyFormat: parsed.dailyFormat || "YYYY-MM-DD",
    };
  } catch {
    return null;
  }
}

export function saveSettings(repo, token, dailyFolder, dailyFormat) {
  const settings = {
    repo,
    token,
    dailyFolder: dailyFolder || "Daily Notes",
    dailyFormat: dailyFormat || "YYYY-MM-DD",
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

export function loadCurrentFile() {
  const stored = localStorage.getItem(CURRENT_FILE_KEY);
  return stored || "README.md";
}

export function saveCurrentFile(filePath) {
  localStorage.setItem(CURRENT_FILE_KEY, filePath);
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
