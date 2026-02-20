import { EditorView, basicSetup } from "codemirror";
import { Decoration, ViewPlugin } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";

const tagDecoration = Decoration.mark({ class: "cm-tag" });
const tagRegex = /(^|[^\w-])#([A-Za-z0-9_-]+)/g;

const tagPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.buildDecorations(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view) {
      const builder = new RangeSetBuilder();
      const { doc } = view.state;

      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = doc.lineAt(pos);
          const text = line.text;
          let match;
          tagRegex.lastIndex = 0;

          while ((match = tagRegex.exec(text))) {
            const start = line.from + match.index + match[1].length;
            const end = start + 1 + match[2].length;
            builder.add(start, end, tagDecoration);
          }

          pos = line.to + 1;
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (value) => value.decorations,
  }
);

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
      tagPlugin,
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
