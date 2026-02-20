import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";

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

function handleCheckboxToggle(event, view, shouldIgnoreChange) {
  if (shouldIgnoreChange && shouldIgnoreChange()) return false;

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

export function createMarkdownEditor({ parent, initialValue, onContentChange, shouldIgnoreChange }) {
  return new EditorView({
    doc: initialValue,
    extensions: [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      EditorView.domEventHandlers({
        mousedown: (event, view) => handleCheckboxToggle(event, view, shouldIgnoreChange),
        touchstart: (event, view) => handleCheckboxToggle(event, view, shouldIgnoreChange),
      }),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        if (shouldIgnoreChange && shouldIgnoreChange()) return;
        onContentChange?.(update.state.doc.toString());
      }),
    ],
    parent,
  });
}

export function getEditorContent(editor) {
  return editor.state.doc.toString();
}

export function setEditorContent(editor, content) {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: content },
  });
}
