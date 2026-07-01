import { Editor, getExtensionField } from "@tiptap/core";

/**
 * The mark schema group shared by every "suggestion" mark — both the Yjs
 * collaboration marks (`y-attributed-*`) and the AI marks (`insertion` /
 * `deletion` / `modification`). A mark opts into being allowed on block nodes by
 * declaring this group in its spec (`group: BLOCK_LEVEL_SUGGESTION_GROUP`).
 */
export const BLOCK_LEVEL_SUGGESTION_GROUP = "blockLevelSuggestion";

/**
 * Block node specs (blockContainer, blockGroup, doc, table cells, columns...)
 * allow the suggestion marks so that a whole block can be marked inserted /
 * deleted / modified in suggestion mode.
 *
 * These marks only exist when the extension that provides them is loaded; a node
 * spec that referenced them unconditionally would make ProseMirror throw
 * "Unknown mark type" while building the schema of an editor that doesn't have
 * them (e.g. a plain, non-collaborative, non-AI editor) — this applies to a mark
 * group with no members too.
 *
 * Use this as a node's `marks` field: it returns the {@link
 * BLOCK_LEVEL_SUGGESTION_GROUP} group name (which ProseMirror expands to every
 * mark in the group) when at least one such mark is registered on the editor, or
 * `""` otherwise. It's evaluated at schema-build time, where the tiptap editor's
 * fully-flattened extension list is available on `this.editor`.
 */
export function suggestionMarks(editor: Editor | undefined): string {
  if (!editor) {
    return "";
  }
  const hasSuggestionMark = editor.options.extensions.some((extension) => {
    if (extension.type !== "mark") {
      return false;
    }
    const group = getExtensionField(extension, "group") as string | undefined;
    return (
      typeof group === "string" &&
      group.split(" ").includes(BLOCK_LEVEL_SUGGESTION_GROUP)
    );
  });
  return hasSuggestionMark ? BLOCK_LEVEL_SUGGESTION_GROUP : "";
}
