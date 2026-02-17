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

let editor = null;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

async function fetchReadme() {
  const response = await fetch("/api/readme");

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
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    wordWrap: "on",
  });
  return editor;
}

async function saveReadme() {
  if (!editor) return;

  try {
    saveBtn.disabled = true;
    setStatus("Saving...");

    const content = editor.getValue();
    const response = await fetch("/api/readme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Save failed: ${response.status}`);
    }

    setStatus("Saved successfully");
    setTimeout(() => setStatus("Loaded frostlynx51/Notes/README.md"), 2000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  } finally {
    saveBtn.disabled = false;
  }
}

async function init() {
  try {
    setStatus("Fetching README.md...");
    const content = await fetchReadme();

    setStatus("Loaded frostlynx51/Notes/README.md");
    createEditor(content);
    saveBtn.disabled = false;
    saveBtn.addEventListener("click", saveReadme);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  }
}

init();
