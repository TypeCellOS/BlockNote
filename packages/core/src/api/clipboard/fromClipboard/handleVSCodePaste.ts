import { EditorView } from "prosemirror-view";

export async function handleVSCodePaste(
  event: ClipboardEvent,
  view: EditorView,
) {
  const { schema } = view.state;

  if (!event.clipboardData) {
    return false;
  }

  const text = event.clipboardData!.getData("text/plain");

  if (!text) {
    return false;
  }

  if (!schema.nodes.codeBlock) {
    view.pasteText(text);
    return true;
  }

  const vscode = event.clipboardData!.getData("vscode-editor-data");
  const vscodeData = vscode ? JSON.parse(vscode) : undefined;
  const language = vscodeData?.mode;

  if (!language) {
    return false;
  }

  // strip carriage return chars from text pasted as code
  // see: https://github.com/ProseMirror/prosemirror-view/commit/a50a6bcceb4ce52ac8fcc6162488d8875613aacd
  view.pasteHTML(
    `<pre><code class="language-${language}">${text.replace(
      /\r\n?/g,
      "\n",
    )}</code></pre>`,
  );

  return true;
}
