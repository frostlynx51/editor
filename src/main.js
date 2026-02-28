import { createMarkdownEditor, getEditorContent, setEditorContent } from "./editor";
import { createDailyNoteTemplate, generateDailyNotePath } from "./dailyNotes";
import { fetchFileFromGithub, loadRepoMarkdownFiles, saveFileToGithub } from "./github";
import {
  clearDraft,
  loadCurrentFile,
  loadDraft,
  loadLastGithubSavedAt,
  loadSettings,
  saveCurrentFile,
  saveDraft,
  saveLastGithubSavedAt,
  saveSettings,
} from "./storage";
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
const geminiKeyInput = document.getElementById("gemini-key-input");
const chatToggleBtn = document.getElementById("chat-toggle-btn");
const chatPanel = document.getElementById("chat-panel");
const chatCloseBtn = document.getElementById("chat-close-btn");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");

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
const GEMINI_MODEL = "gemini-2.5-flash";

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
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

function updateDirtyState(currentContent) {
  hasUnsavedChanges = currentContent !== lastSavedContent;
  if (!hasUnsavedChanges) {
    clearDraft(settings, currentFile);
  }
}

function scheduleLocalAutosave() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }
  autosaveTimer = setTimeout(() => {
    if (!editor || !settings || !currentFile) return;
    const content = getEditorContent(editor);
    saveDraft(settings, currentFile, content);
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

function setCurrentFile(filePath) {
  currentFile = filePath;
  saveCurrentFile(filePath);
  currentFileEl.textContent = filePath;
}

function showSettingsModal() {
  if (settings) {
    repoInput.value = settings.repo;
    tokenInput.value = settings.token;
    dailyFolderInput.value = settings.dailyFolder || "Daily Notes";
    dailyFormatInput.value = settings.dailyFormat || "YYYY-MM-DD";
    geminiKeyInput.value = settings.geminiKey || "";
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

function toggleChatPanel(forceOpen = null) {
  const shouldOpen = forceOpen ?? chatPanel.classList.contains("collapsed");
  chatPanel.classList.toggle("collapsed", !shouldOpen);
  if (shouldOpen) {
    chatInput.focus();
  }
}

function updateChatToggleState() {
  if (!chatToggleBtn) return;
  chatToggleBtn.disabled = !settings;
}

function removeChatEmptyState() {
  const empty = chatMessages.querySelector(".chat-empty");
  if (empty) empty.remove();
}

function appendChatMessage(text, role = "bot") {
  removeChatEmptyState();
  const message = document.createElement("div");
  message.className = `chat-message ${role}`.trim();
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

function buildSystemPrompt() {
  const noteContent = editor ? getEditorContent(editor) : "";
  return `Current note: ${currentFile}\n\n${noteContent}`.trim();
}

async function requestGemini(userText) {
  if (!settings?.geminiKey) {
    throw new Error("Missing Gemini API key. Add it in Settings.");
  }

  const systemPrompt = buildSystemPrompt();
  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userText }],
      },
    ],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${settings.geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "Gemini request failed";
    throw new Error(message);
  }

  if (data?.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || "").join("").trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const userText = chatInput.value.trim();
  if (!userText) return;

  appendChatMessage(userText, "user");
  chatInput.value = "";

  const pending = appendChatMessage("Thinking...", "system");
  chatSendBtn.disabled = true;
  chatInput.disabled = true;

  try {
    const reply = await requestGemini(userText);
    pending.textContent = reply;
    pending.classList.remove("system");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    pending.textContent = message;
    pending.classList.remove("system");
    pending.classList.add("error");
  } finally {
    chatSendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

async function loadRepositoryFiles() {
  if (!settings) return;

  try {
    fileListEl.innerHTML = '<div class="loading-files">Loading files...</div>';

    allFiles = await loadRepoMarkdownFiles({ settings });
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
  setCurrentFile(filePath);
  hideFilePickerModal();
  loadEditorFile();
}

function openDailyNote() {
  const dailyPath = generateDailyNotePath(settings);
  if (!dailyPath) return;
  
  setCurrentFile(dailyPath);
  loadEditorFile();
}
function ensureEditor(content) {
  if (editor) {
    setEditorContent(editor, content);
    return;
  }

  editor = createMarkdownEditor({
    parent: editorEl,
    initialValue: content,
    shouldIgnoreChange: () => isLoadingContent,
    onContentChange: (nextContent) => {
      updateDirtyState(nextContent);
      scheduleLocalAutosave();
    },
  });
}

async function saveFile(options = {}) {
  if (!editor || !settings || !currentFile) return;
  if (isSavingToGitHub) return;

  try {
    isSavingToGitHub = true;
    saveBtn.disabled = true;
    setStatus(options.isAuto ? "Auto-saving to GitHub..." : "Saving...");

    const content = getEditorContent(editor);
    await saveFileToGithub({
      settings,
      filePath: currentFile,
      content,
      commitMessage: `Update ${currentFile} from editor`,
    });

    lastSavedContent = content;
    hasUnsavedChanges = false;
    lastGithubSavedAt = Date.now();
    saveLastGithubSavedAt(settings, currentFile, lastGithubSavedAt);
    clearDraft(settings, currentFile);
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
    const content = await fetchFileFromGithub({
      settings,
      filePath: currentFile,
      dailyTemplate: createDailyNoteTemplate,
    });

    setStatus(`Loaded ${currentFile}`);
    isLoadingContent = true;
    lastSavedContent = content;
    hasUnsavedChanges = false;
    lastGithubSavedAt = loadLastGithubSavedAt(settings, currentFile);
    updateGithubSavedIndicator();

    ensureEditor(content);

    const draft = loadDraft(settings, currentFile);
    if (draft && draft.content && draft.content !== content) {
      setEditorContent(editor, draft.content);
      lastSavedContent = content;
      hasUnsavedChanges = true;
      setStatus(`Restored local autosave for ${currentFile}`);
    }

    saveBtn.disabled = false;
    fileSelectorBtn.disabled = false;
    dailyNoteBtn.disabled = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  } finally {
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
  chatToggleBtn.addEventListener("click", () => toggleChatPanel());
  chatCloseBtn.addEventListener("click", () => toggleChatPanel(false));
  chatForm.addEventListener("submit", handleChatSubmit);

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const repo = repoInput.value.trim();
    const token = tokenInput.value.trim();
    const dailyFolder = dailyFolderInput.value.trim() || "Daily Notes";
    const dailyFormat = dailyFormatInput.value.trim() || "YYYY-MM-DD";
    const geminiKey = geminiKeyInput.value.trim();

    if (!repo || !token) {
      alert("Repository and token are required");
      return;
    }

    settings = saveSettings(repo, token, dailyFolder, dailyFormat, geminiKey);
    hideSettingsModal();
    updateChatToggleState();
    
    // Reload editor if it was already loaded
    if (editor) {
      editor.destroy();
      editor = null;
    }
    allFiles = []; // Reset file cache
    currentFile = "README.md"; // Reset to default
    setCurrentFile(currentFile);
    loadEditorFile();
  });

  // Show settings if not configured, otherwise load editor
  if (!settings) {
    setStatus("Configure settings to start");
    showSettingsModal();
  } else {
    loadEditorFile();
  }

  updateChatToggleState();

  startGithubAutosaveTimer();
  startGithubStatusTimer();
}

init();
