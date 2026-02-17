import * as monaco from "monaco-editor";
import "./style.css";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

const statusEl = document.getElementById("status");
const editorEl = document.getElementById("editor");
const saveBtn = document.getElementById("save-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsForm = document.getElementById("settings-form");
const cancelBtn = document.getElementById("cancel-btn");
const repoInput = document.getElementById("repo-input");
const tokenInput = document.getElementById("token-input");
const fileSelectorBtn = document.getElementById("file-selector-btn");
const currentFileEl = document.getElementById("current-file");
const filePickerModal = document.getElementById("file-picker-modal");
const fileCancelBtn = document.getElementById("file-cancel-btn");
const fileSearchInput = document.getElementById("file-search");
const fileListEl = document.getElementById("file-list");

let editor = null;
let settings = null;
let currentFile = "README.md";
let allFiles = [];

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function loadSettings() {
  const stored = localStorage.getItem("github-settings");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

function saveSettings(repo, token) {
  settings = { repo, token };
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

    const response = await fetch("/api/tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: settings.repo, token: settings.token }),
    });

    if (!response.ok) {
      throw new Error("Failed to load repository files");
    }

    const data = await response.json();
    allFiles = data.tree
      .filter(item => item.type === "blob")
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

async function fetchFile(filePath) {
  if (!settings) throw new Error("Settings not configured");

  const response = await fetch("/api/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo: settings.repo, token: settings.token, path: filePath }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  return await response.text();
}

function createEditor(value) {
  const language = detectLanguage(currentFile);
  editor = monaco.editor.create(editorEl, {
    value,
    language,
    theme: "vs",
    automaticLayout: true,
    minimap: { enabled: false },
    wordWrap: "on",
  });
  return editor;
}

async function saveFile() {
  if (!editor || !settings || !currentFile) return;

  try {
    saveBtn.disabled = true;
    setStatus("Saving...");

    const content = editor.getValue();
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: settings.repo, token: settings.token, path: currentFile, content }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Save failed: ${response.status}`);
    }

    setStatus("Saved successfully");
    setTimeout(() => setStatus(`Loaded ${currentFile}`), 2000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  } finally {
    saveBtn.disabled = false;
  }
}

async function loadEditorFile() {
  try {
    setStatus(`Fetching ${currentFile}...`);
    const content = await fetchFile(currentFile);

    setStatus(`Loaded ${currentFile}`);
    
    if (editor) {
      editor.setValue(content);
    } else {
      createEditor(content);
    }
    
    saveBtn.disabled = false;
    fileSelectorBtn.disabled = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  }
}

function detectLanguage(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const languageMap = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    rb: "ruby",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sh: "shell",
    bash: "shell",
    sql: "sql",
  };
  return languageMap[ext] || "plaintext";
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

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const repo = repoInput.value.trim();
    const token = tokenInput.value.trim();

    if (!repo || !token) {
      alert("Both fields are required");
      return;
    }

    saveSettings(repo, token);
    hideSettingsModal();
    
    // Reload editor if it was already loaded
    if (editor) {
      editor.dispose();
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
}

init();
