import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import type { CustomInlineContentFromConfig } from "../../../../schema/index.js";

// Inline-content equivalent of `createSourceBlock`. Renders an inline content's
// text as editable code source.
//
// Unlike the block version it has no language picker: switching languages
// updates props via the block ID, which inline content doesn't have. The
// `inlineContent` and `editor` params are kept for symmetry (and so a picker
// could be added later) but are currently unused.
export const createSourceInlineContent = (
  _inlineContent: CustomInlineContentFromConfig<any, any>,
  _editor: BlockNoteEditor<any>,
) => {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.appendChild(code);

  return {
    dom: pre,
    contentDOM: code,
    destroy: () => {
      // No-op; kept for symmetry with `createSourceBlock`.
    },
  };
};
