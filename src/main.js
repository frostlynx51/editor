import { createMarkdownEditor, getEditorContent, setEditorContent } from "./editor";
import { createDailyNoteTemplate, generateDailyNotePath } from "./dailyNotes";
import { fetchFileFromGithub, loadRepoMarkdownFiles, saveMultipleFilesToGithub } from "./github";
import { FileManager } from "./fileManager";
import { FileTree } from "./fileTree";
import {
  loadLastGithubSavedAt,
  loadSettings,
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
const sidebarEl = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
const fileTreeEl = document.getElementById("file-tree");

let editor = null;
let settings = null;
let fileManager = null;
let fileTree = null;
let currentFile = null;
let allFiles = [];
let githubAutosaveTimer = null;
let githubStatusTimer = null;
let isSavingToGitHub = false;
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

function onEditorContentChange(content) {
  if (!currentFile || !fileManager) return;
  
  // Update file manager with new content (will auto-save with debounce)
  fileManager.setFileContent(currentFile, content, { autoSave: true });
  
  // Update UI
  updateDirtyState();
  if (fileTree) {
    fileTree.render();
  }
}

function updateDirtyState() {
  if (!fileManager) return;
  
  const dirtyFiles = fileManager.getDirtyFiles();
  const hasDirty = dirtyFiles.length > 0;
  
  // Update window title
  if (hasDirty) {
    document.title = `● GitHub Editor${currentFile ? ` - ${currentFile}` : ''}`;
  } else {
    document.title = `GitHub Editor${currentFile ? ` - ${currentFile}` : ''}`;
  }
}

function startGithubAutosaveTimer() {
  if (githubAutosaveTimer) {
    clearInterval(githubAutosaveTimer);
  }
  githubAutosaveTimer = setInterval(() => {
    if (!fileManager || isSavingToGitHub) return;
    const dirtyFiles = fileManager.getDirtyFiles();
    if (dirtyFiles.length > 0) {
      saveAllFiles({ isAuto: true });
    }
  }, GITHUB_AUTOSAVE_INTERVAL_MS);
}

function toggleSidebar() {
  if (sidebarEl) {
    sidebarEl.classList.toggle('collapsed');
  }
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

function buildSystemPrompt(hasFileContext) {
  // Don't include current file if using uploaded file context
  if (hasFileContext) {
    return "You are a helpful AI assistant. The user has provided a file containing their notes as reference material. Use this file to answer the user's questions accurately. Focus on answering the user's specific question, not on summarizing the file.";
  }
  
  const noteContent = editor ? getEditorContent(editor) : "";
  return `Current note: ${currentFile}\n\n${noteContent}`.trim();
}

async function fetchGeminiFileUri() {
  if (!settings) return null;

  try {
    const content = await fetchFileFromGithub({
      settings,
      filePath: "gemini_file_id.txt",
    });

    // Parse first line to get the file ID
    const lines = content.trim().split("\n");
    if (lines.length === 0) return null;

    const fileId = lines[0].trim();
    if (!fileId) return null;

    // Construct the full URI
    return `https://generativelanguage.googleapis.com/v1beta/${fileId}`;
  } catch (error) {
    // File doesn't exist or error fetching - silently ignore
    return null;
  }
}

async function requestGemini(userText) {
  if (!settings?.geminiKey) {
    throw new Error("Missing Gemini API key. Add it in Settings.");
  }
  
  // Check for uploaded file context
  const fileUri = await fetchGeminiFileUri();
  const hasFileContext = !!fileUri;
  
  const systemPrompt = buildSystemPrompt(hasFileContext);
  
  const userParts = [];
  
  // Add file context if available with explicit instructions
  if (fileUri) {
    userParts.push({
      fileData: {
        fileUri: fileUri,
        mimeType: "text/plain",
      },
    });
    // Add explicit instruction about how to use the file
    userParts.push({ 
      text: "The above file contains my notes. Please use it as reference context to answer the following question:" 
    });
  }
  
  // Add user's text message
  userParts.push({ text: userText });

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: userParts,
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

  return { text, hasFileContext };
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
    const result = await requestGemini(userText);
    pending.textContent = result.text;
    pending.classList.remove("system");
    
    // Add context indicator
    const indicator = document.createElement("div");
    indicator.className = "context-indicator";
    indicator.textContent = result.hasFileContext 
      ? "📁 Using uploaded file context" 
      : `📝 Using current note: ${currentFile}`;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    setStatus("Loading repository files...");
    const files = await loadRepoMarkdownFiles({ settings });
    allFiles = files.map(f => f.path);
    
    if (fileTree) {
      fileTree.updateFiles(allFiles);
    }
    
    setStatus("Repository files loaded");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load files";
    setStatus(message, true);
  }
}

function selectFile(filePath) {
  if (!fileManager) return;
  
  // Save current file before switching
  if (currentFile && editor) {
    const content = getEditorContent(editor);
    fileManager.setFileContent(currentFile, content, { autoSave: false });
    fileManager.saveFileImmediate(currentFile);
  }
  
  // Switch to new file
  currentFile = filePath;
  fileManager.switchFile(filePath);
  
  // Update UI
  if (fileTree) {
    fileTree.render();
  }
  
  // Load file content
  loadEditorFile();
}

function openDailyNote() {
  const dailyPath = generateDailyNotePath(settings);
  if (!dailyPath) return;
  
  selectFile(dailyPath);
}
function ensureEditor(content) {
  if (editor) {
    isLoadingContent = true;
    setEditorContent(editor, content);
    isLoadingContent = false;
    return;
  }

  editor = createMarkdownEditor({
    parent: editorEl,
    initialValue: content,
    shouldIgnoreChange: () => isLoadingContent,
    onContentChange: onEditorContentChange,
  });
}

async function saveAllFiles(options = {}) {
  if (!fileManager || !settings) return;
  if (isSavingToGitHub) return;

  const dirtyFiles = fileManager.getDirtyFiles();
  if (dirtyFiles.length === 0) {
    setStatus("No changes to save");
    return;
  }

  try {
    isSavingToGitHub = true;
    saveBtn.disabled = true;
    
    const fileCount = dirtyFiles.length;
    setStatus(options.isAuto 
      ? `Auto-saving ${fileCount} file${fileCount === 1 ? '' : 's'}...` 
      : `Saving ${fileCount} file${fileCount === 1 ? '' : 's'}...`
    );

    // Prepare files for batch save
    const filesToSave = dirtyFiles.map(path => {
      const state = fileManager.getFileState(path);
      return {
        path,
        content: state.content,
        commitMessage: `Update ${path} from editor`
      };
    });

    // Batch save to GitHub
    const results = await saveMultipleFilesToGithub({
      settings,
      files: filesToSave,
      onProgress: (current, total, path) => {
        setStatus(`Saving ${current}/${total}: ${path}`);
      }
    });

    // Update file states
    results.succeeded.forEach(({ path, sha }) => {
      fileManager.markFileClean(path, sha);
    });

    // Update last saved time for all succeeded files
    if (results.succeeded.length > 0) {
      lastGithubSavedAt = Date.now();
      results.succeeded.forEach(({ path }) => {
        saveLastGithubSavedAt(settings, path, lastGithubSavedAt);
      });
      updateGithubSavedIndicator();
    }

    // Update UI
    updateDirtyState();
    if (fileTree) {
      fileTree.render();
    }

    // Show results
    if (results.failed.length === 0) {
      setStatus(`Saved ${results.succeeded.length} file${results.succeeded.length === 1 ? '' : 's'} to GitHub`);
      setTimeout(() => {
        if (currentFile) {
          setStatus(`Loaded ${currentFile}`);
        }
      }, 2000);
    } else {
      setStatus(`Saved ${results.succeeded.length}, failed ${results.failed.length}`, true);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  } finally {
    saveBtn.disabled = false;
    isSavingToGitHub = false;
  }
}

async function loadEditorFile() {
  if (!currentFile || !fileManager) return;

  try {
    setStatus(`Fetching ${currentFile}...`);
    
    // Load from GitHub
    const result = await fileManager.loadFromGithub(currentFile, async (path) => {
      return await fetchFileFromGithub({
        settings,
        filePath: path,
        dailyTemplate: createDailyNoteTemplate,
      });
    });

    setStatus(`Loaded ${currentFile}`);
    isLoadingContent = true;
    lastSavedContent = result.content;
    lastGithubSavedAt = loadLastGithubSavedAt(settings, currentFile);
    updateGithubSavedIndicator();

    // Create or update editor
    ensureEditor(result.content);

    // Check for local changes
    if (result.hasLocalChanges) {
      setEditorContent(editor, result.localContent);
      setStatus(`Restored local changes for ${currentFile}`);
      updateDirtyState();
    }

    saveBtn.disabled = false;
    dailyNoteBtn.disabled = false;
    
    // Reveal file in tree
    if (fileTree) {
      fileTree.revealFile(currentFile);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  } finally {
    isLoadingContent = false;
  }
}

function init() {
  settings = loadSettings();
  
  // Initialize file manager
  if (settings) {
    fileManager = new FileManager(settings);
    
    // Get most recent file or default to README.md
    const recentFiles = fileManager.getRecentFiles();
    currentFile = recentFiles[0] || "README.md";
    
    // Initialize file tree
    fileTree = new FileTree({
      container: fileTreeEl,
      onFileSelect: selectFile,
      fileManager: fileManager
    });
  }

  // Event listeners
  settingsBtn.addEventListener("click", showSettingsModal);
  cancelBtn.addEventListener("click", hideSettingsModal);
  saveBtn.addEventListener("click", () => saveAllFiles({ isAuto: false }));
  dailyNoteBtn.addEventListener("click", openDailyNote);
  chatToggleBtn.addEventListener("click", () => toggleChatPanel());
  chatCloseBtn.addEventListener("click", () => toggleChatPanel(false));
  chatForm.addEventListener("submit", handleChatSubmit);
  sidebarToggleBtn.addEventListener("click", toggleSidebar);

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
    
    // Reinitialize for new repo
    if (editor) {
      editor.destroy();
      editor = null;
    }
    
    // Clear old state
    if (fileManager) {
      fileManager.clearAll();
    }
    
    // Reinitialize
    fileManager = new FileManager(settings);
    fileTree = new FileTree({
      container: fileTreeEl,
      onFileSelect: selectFile,
      fileManager: fileManager
    });
    
    allFiles = [];
    currentFile = "README.md";
    fileManager.switchFile(currentFile);
    
    loadRepositoryFiles();
    loadEditorFile();
  });

  // Show settings if not configured, otherwise load editor
  if (!settings) {
    setStatus("Configure settings to start");
    showSettingsModal();
  } else {
    loadRepositoryFiles();
    loadEditorFile();
  }

  updateChatToggleState();
  startGithubAutosaveTimer();
  startGithubStatusTimer();
}

init();