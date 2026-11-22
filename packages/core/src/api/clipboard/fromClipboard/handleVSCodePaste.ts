import { EditorView } from "prosemirror-view";

import { escapeHtml } from "../../../util/escapeHtml.js";

export function handleVSCodePaste(event: ClipboardEvent, view: EditorView) {
  const { schema } = view.state;

  if (!event.clipboardData) {
    return false;
  }

  const text = event.clipboardData!.getData("text/plain");

  if (!text) {
    return false;
  }

  if (!schema.nodes.codeBlock) {
    return false;
  }

  const vscode = event.clipboardData!.getData("vscode-editor-data");
  const vscodeData = vscode ? JSON.parse(vscode) : undefined;
  const language = vscodeData?.mode;

  if (!language) {
    return false;
  }

  // The clipboard data has no type, thus the language is possibly not a string.
  view.pasteHTML(textToCodeBlockHTML(text, String(language)));

  return true;
}

/**
 * Makes the HTML of a code block from plain text. The text and the language
 * are escaped, thus the HTML parser reads them as text and not as markup.
 */
export function textToCodeBlockHTML(text: string, language: string) {
  // strip carriage return chars from text pasted as code
  // see: https://github.com/ProseMirror/prosemirror-view/commit/a50a6bcceb4ce52ac8fcc6162488d8875613aacd
  const code = text.replace(/\r\n?/g, "\n");

  return `<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre>`;
}
