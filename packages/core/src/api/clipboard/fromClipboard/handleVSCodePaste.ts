import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";

export async function handleVSCodePaste<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(event: ClipboardEvent, editor: BlockNoteEditor<BSchema, I, S>) {
  const view = editor.prosemirrorView;
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
  editor._tiptapEditor.view.pasteHTML(
    `<pre><code class="language-${language}">${text.replace(
      /\r\n?/g,
      "\n"
    )}</code></pre>`
  );

  return true;
}
