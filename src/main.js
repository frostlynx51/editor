import * as monaco from "monaco-editor";
import "./style.css";

const statusEl = document.getElementById("status");
const editorEl = document.getElementById("editor");

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
  return monaco.editor.create(editorEl, {
    value,
    language: "markdown",
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    wordWrap: "on",
  });
}

async function init() {
  try {
    setStatus("Fetching README.md...");
    const content = await fetchReadme();

    setStatus("Loaded frostlynx51/Notes/README.md");
    createEditor(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  }
}

init();
