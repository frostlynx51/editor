import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import "./style.css";

const statusEl = document.getElementById("status");
const githubSavedEl = document.getElementById("github-saved-indicator");
const editorEl = document.getElementById("editor");
const saveBtn = document.getElementById("save-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsForm = document.getElementById("settings-form");
const cancelBtn = document.getElementById("cancel-btn");
const repoInput = document.getElementById("repo-input");
const tokenInput = document.getElementById("token-input");
const dailyFolderInput = document.getElementById("daily-folder-input");
const dailyFormatInput = document.getElementById("daily-format-input");
const fileSelectorBtn = document.getElementById("file-selector-btn");
const dailyNoteBtn = document.getElementById("daily-note-btn");
const currentFileEl = document.getElementById("current-file");
const filePickerModal = document.getElementById("file-picker-modal");
const fileCancelBtn = document.getElementById("file-cancel-btn");
const fileSearchInput = document.getElementById("file-search");
const fileListEl = document.getElementById("file-list");

let editor = null;
let settings = null;
let currentFile = "README.md";
let allFiles = [];
let autosaveTimer = null;
let githubAutosaveTimer = null;
let githubStatusTimer = null;
let isSavingToGitHub = false;
let hasUnsavedChanges = false;
let lastGithubSavedAt = null;
let lastSavedContent = "";
let isLoadingContent = false;

const AUTOSAVE_DEBOUNCE_MS = 1000;
const GITHUB_AUTOSAVE_INTERVAL_MS = 15 * 60 * 1000;
const GITHUB_STATUS_REFRESH_MS = 60 * 1000;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function getDraftKey(filePath) {
  const repoKey = settings?.repo || "unknown";
  return `github-draft:${repoKey}:${filePath}`;
}

function getLastSavedKey(filePath) {
  const repoKey = settings?.repo || "unknown";
  return `github-last-saved:${repoKey}:${filePath}`;
}

function loadDraft(filePath) {
  const stored = localStorage.getItem(getDraftKey(filePath));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveDraft(filePath, content) {
  const payload = {
    content,
    updatedAt: Date.now(),
  };
  localStorage.setItem(getDraftKey(filePath), JSON.stringify(payload));
}

function clearDraft(filePath) {
  localStorage.removeItem(getDraftKey(filePath));
}

function formatTimeAgo(ms) {
  if (ms < 60 * 1000) return "just now";
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function updateGithubSavedIndicator() {
  if (!githubSavedEl) return;
  if (!lastGithubSavedAt) {
    githubSavedEl.textContent = "Last saved to GitHub: never";
    return;
  }
  const elapsed = Date.now() - lastGithubSavedAt;
  githubSavedEl.textContent = `Last saved to GitHub: ${formatTimeAgo(elapsed)} ago`;
}

function startGithubStatusTimer() {
  if (githubStatusTimer) {
    clearInterval(githubStatusTimer);
  }
  githubStatusTimer = setInterval(updateGithubSavedIndicator, GITHUB_STATUS_REFRESH_MS);
}

function getEditorContent() {
  return editor.state.doc.toString();
}

function updateDirtyState(currentContent) {
  hasUnsavedChanges = currentContent !== lastSavedContent;
  if (!hasUnsavedChanges) {
    clearDraft(currentFile);
  }
}

function scheduleLocalAutosave() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }
  autosaveTimer = setTimeout(() => {
    if (!editor || !settings || !currentFile) return;
    const content = getEditorContent();
    saveDraft(currentFile, content);
  }, AUTOSAVE_DEBOUNCE_MS);
}

function startGithubAutosaveTimer() {
  if (githubAutosaveTimer) {
    clearInterval(githubAutosaveTimer);
  }
  githubAutosaveTimer = setInterval(() => {
    if (!hasUnsavedChanges || isSavingToGitHub) return;
    saveFile({ isAuto: true });
  }, GITHUB_AUTOSAVE_INTERVAL_MS);
}

function loadSettings() {
  const stored = localStorage.getItem("github-settings");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Add defaults for backwards compatibility
      return {
        ...parsed,
        dailyFolder: parsed.dailyFolder || "Daily Notes",
        dailyFormat: parsed.dailyFormat || "YYYY-MM-DD"
      };
    } catch {
      return null;
    }
  }
  return null;
}

function saveSettings(repo, token, dailyFolder, dailyFormat) {
  settings = { 
    repo, 
    token, 
    dailyFolder: dailyFolder || "Daily Notes",
    dailyFormat: dailyFormat || "YYYY-MM-DD"
  };
  localStorage.setItem("github-settings", JSON.stringify(settings));
}

function loadCurrentFile() {
  const stored = localStorage.getItem("github-current-file");
  return stored || "README.md";
}

function saveCurrentFile(filePath) {
  currentFile = filePath;
  localStorage.setItem("github-current-file", filePath);
  currentFileEl.textContent = filePath;
}

function showSettingsModal() {
  if (settings) {
    repoInput.value = settings.repo;
    tokenInput.value = settings.token;
    dailyFolderInput.value = settings.dailyFolder || "Daily Notes";
    dailyFormatInput.value = settings.dailyFormat || "YYYY-MM-DD";
  }
  settingsModal.style.display = "flex";
}

function hideSettingsModal() {
  settingsModal.style.display = "none";
}

function showFilePickerModal() {
  filePickerModal.style.display = "flex";
  fileSearchInput.value = "";
  fileSearchInput.focus();
  if (allFiles.length === 0) {
    loadRepositoryFiles();
  } else {
    renderFileList(allFiles);
  }
}

function hideFilePickerModal() {
  filePickerModal.style.display = "none";
}

async function loadRepositoryFiles() {
  if (!settings) return;

  try {
    fileListEl.innerHTML = '<div class="loading-files">Loading files...</div>';

    const [owner, repoName] = settings.repo.split("/");
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${settings.token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "github-editor",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load repository files");
    }

    const data = await response.json();
    allFiles = data.tree
      .filter(item => item.type === "blob" && item.path.toLowerCase().endsWith(".md"))
      .map(item => item.path)
      .sort();

    renderFileList(allFiles);
  } catch (error) {
    fileListEl.innerHTML = `<div class="loading-files">Error: ${error.message}</div>`;
  }
}

function renderFileList(files) {
  if (files.length === 0) {
    fileListEl.innerHTML = '<div class="loading-files">No files found</div>';
    return;
  }

  fileListEl.innerHTML = files
    .map(file => {
      const fileName = file.split("/").pop();
      const isSelected = file === currentFile;
      return `
        <div class="file-item ${isSelected ? "selected" : ""}" data-path="${file}">
          <div>${fileName}</div>
          ${file.includes("/") ? `<div class="file-path">${file}</div>` : ""}
        </div>
      `;
    })
    .join("");

  // Add click handlers
  fileListEl.querySelectorAll(".file-item").forEach(item => {
    item.addEventListener("click", () => {
      const path = item.getAttribute("data-path");
      selectFile(path);
    });
  });
}

function filterFiles(query) {
  const filtered = allFiles.filter(file =>
    file.toLowerCase().includes(query.toLowerCase())
  );
  renderFileList(filtered);
}

function selectFile(filePath) {
  saveCurrentFile(filePath);
  hideFilePickerModal();
  loadEditorFile();
}

function generateDailyNotePath() {
  if (!settings) return null;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const fileName = settings.dailyFormat
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
  
  return `${settings.dailyFolder}/${fileName}.md`;
}

function openDailyNote() {
  const dailyPath = generateDailyNotePath();
  if (!dailyPath) return;
  
  saveCurrentFile(dailyPath);
  loadEditorFile();
}

async function fetchFile(filePath) {
  if (!settings) throw new Error("Settings not configured");

  const [owner, repoName] = settings.repo.split("/");
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github.raw",
      "User-Agent": "github-editor",
    },
  });

  if (!response.ok) {
    // If file doesn't exist (404), return empty template for daily notes
    if (response.status === 404 && filePath.startsWith(settings.dailyFolder)) {
      const today = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return `# Daily Note - ${today}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n`;
    }
    throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

function createEditor(value) {
  editor = new EditorView({
    doc: value,
    extensions: [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      EditorView.domEventHandlers({
        mousedown: handleCheckboxToggle,
        touchstart: handleCheckboxToggle,
      }),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || isLoadingContent) return;
        const content = getEditorContent();
        updateDirtyState(content);
        scheduleLocalAutosave();
      }),
    ],
    parent: editorEl,
  });
  return editor;
}

function getEventCoords(event) {
  if (event.touches && event.touches.length > 0) {
    const touch = event.touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  if (typeof event.clientX === "number" && typeof event.clientY === "number") {
    return { x: event.clientX, y: event.clientY };
  }
  return null;
}

function handleCheckboxToggle(event, view) {
  if (isLoadingContent) return false;
  const coords = getEventCoords(event);
  if (!coords) return false;

  const pos = view.posAtCoords(coords);
  if (pos == null) return false;

  const line = view.state.doc.lineAt(pos);
  const match = line.text.match(/^(\s*[-*]\s+)\[([ xX])\]/);
  if (!match) return false;

  const checkboxStart = line.from + match[1].length;
  const checkboxEnd = checkboxStart + 2;
  if (pos < checkboxStart || pos > checkboxEnd) return false;

  const nextValue = match[2].toLowerCase() === "x" ? " " : "x";
  view.dispatch({
    changes: { from: checkboxStart + 1, to: checkboxStart + 2, insert: nextValue },
  });
  event.preventDefault();
  event.stopPropagation();
  return true;
}

function setEditorContent(content) {
  if (!editor) return;
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: content },
  });
}

async function saveFile(options = {}) {
  if (!editor || !settings || !currentFile) return;
  if (isSavingToGitHub) return;

  try {
    isSavingToGitHub = true;
    saveBtn.disabled = true;
    setStatus(options.isAuto ? "Auto-saving to GitHub..." : "Saving...");

    const [owner, repoName] = settings.repo.split("/");
    const encodedPath = encodeURIComponent(currentFile).replace(/%2F/g, "/");
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodedPath}`;
    
    const content = getEditorContent();

    // Check if file exists to get SHA
    const getResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${settings.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "github-editor",
      },
      cache: "no-store",
    });

    let sha = null;
    if (getResponse.ok) {
      const contentType = getResponse.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Got non-JSON response when fetching file metadata: ${contentType || "unknown"}`);
      }
      const fileData = await getResponse.json();
      sha = fileData.sha;
    }
    // If 404, it's a new file, sha can be null

    // Encode content to base64 (handling UTF-8 properly)
    const base64Content = btoa(
      Array.from(new TextEncoder().encode(content), byte => String.fromCharCode(byte)).join('')
    );
    
    const updatePayload = {
      message: `Update ${currentFile} from editor`,
      content: base64Content,
    };
    
    if (sha) {
      updatePayload.sha = sha;
    }
    
    const updateResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${settings.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "github-editor",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text().catch(() => "");
      throw new Error(`Failed to save: ${updateResponse.status} - ${errorBody}`);
    }

    lastSavedContent = content;
    hasUnsavedChanges = false;
    lastGithubSavedAt = Date.now();
    localStorage.setItem(getLastSavedKey(currentFile), String(lastGithubSavedAt));
    clearDraft(currentFile);
    updateGithubSavedIndicator();
    setStatus("Saved to GitHub");
    setTimeout(() => setStatus(`Loaded ${currentFile}`), 2000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  } finally {
    saveBtn.disabled = false;
    isSavingToGitHub = false;
  }
}

async function loadEditorFile() {
  try {
    setStatus(`Fetching ${currentFile}...`);
    const content = await fetchFile(currentFile);

    setStatus(`Loaded ${currentFile}`);
    isLoadingContent = true;
    lastSavedContent = content;
    hasUnsavedChanges = false;
    const storedTimestamp = localStorage.getItem(getLastSavedKey(currentFile));
    lastGithubSavedAt = storedTimestamp ? Number(storedTimestamp) : null;
    updateGithubSavedIndicator();
    
    if (editor) {
      setEditorContent(content);
    } else {
      createEditor(content);
    }

    const draft = loadDraft(currentFile);
    if (draft && draft.content && draft.content !== content) {
      setEditorContent(draft.content);
      lastSavedContent = content;
      hasUnsavedChanges = true;
      setStatus(`Restored local autosave for ${currentFile}`);
    }

    isLoadingContent = false;
    
    saveBtn.disabled = false;
    fileSelectorBtn.disabled = false;
    dailyNoteBtn.disabled = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
    isLoadingContent = false;
  }
}

function init() {
  settings = loadSettings();
  currentFile = loadCurrentFile();
  currentFileEl.textContent = currentFile;

  // Event listeners
  settingsBtn.addEventListener("click", showSettingsModal);
  cancelBtn.addEventListener("click", hideSettingsModal);
  fileSelectorBtn.addEventListener("click", showFilePickerModal);
  fileCancelBtn.addEventListener("click", hideFilePickerModal);
  fileSearchInput.addEventListener("input", (e) => filterFiles(e.target.value));
  saveBtn.addEventListener("click", saveFile);
  dailyNoteBtn.addEventListener("click", openDailyNote);

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const repo = repoInput.value.trim();
    const token = tokenInput.value.trim();
    const dailyFolder = dailyFolderInput.value.trim() || "Daily Notes";
    const dailyFormat = dailyFormatInput.value.trim() || "YYYY-MM-DD";

    if (!repo || !token) {
      alert("Repository and token are required");
      return;
    }

    saveSettings(repo, token, dailyFolder, dailyFormat);
    hideSettingsModal();
    
    // Reload editor if it was already loaded
    if (editor) {
      editor.destroy();
      editor = null;
    }
    allFiles = []; // Reset file cache
    currentFile = "README.md"; // Reset to default
    saveCurrentFile(currentFile);
    loadEditorFile();
  });

  // Show settings if not configured, otherwise load editor
  if (!settings) {
    setStatus("Configure settings to start");
    showSettingsModal();
  } else {
    loadEditorFile();
  }

  startGithubAutosaveTimer();
  startGithubStatusTimer();
}

init();
