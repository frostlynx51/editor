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

let editor = null;
let settings = null;

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

async function fetchReadme() {
  if (!settings) throw new Error("Settings not configured");

  const response = await fetch("/api/readme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo: settings.repo, token: settings.token }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  return await response.text();
}

function createEditor(value) {
  editor = monaco.editor.create(editorEl, {
    value,
    language: "markdown",
    theme: "vs",
    automaticLayout: true,
    minimap: { enabled: false },
    wordWrap: "on",
  });
  return editor;
}

async function saveReadme() {
  if (!editor || !settings) return;

  try {
    saveBtn.disabled = true;
    setStatus("Saving...");

    const content = editor.getValue();
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: settings.repo, token: settings.token, content }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Save failed: ${response.status}`);
    }

    setStatus("Saved successfully");
    setTimeout(() => setStatus(`Loaded ${settings.repo}/README.md`), 2000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  } finally {
    saveBtn.disabled = false;
  }
}

async function loadEditor() {
  try {
    setStatus("Fetching README.md...");
    const content = await fetchReadme();

    setStatus(`Loaded ${settings.repo}/README.md`);
    createEditor(content);
    saveBtn.disabled = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  }
}

function init() {
  settings = loadSettings();

  // Event listeners
  settingsBtn.addEventListener("click", showSettingsModal);
  cancelBtn.addEventListener("click", hideSettingsModal);
  saveBtn.addEventListener("click", saveReadme);

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
    loadEditor();
  });

  // Show settings if not configured, otherwise load editor
  if (!settings) {
    setStatus("Configure settings to start");
    showSettingsModal();
  } else {
    loadEditor();
  }
}

init();
