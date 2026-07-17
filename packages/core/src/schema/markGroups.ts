import { Editor, getExtensionField } from "@tiptap/core";

/**
 * ProseMirror mark group for "non-formatting" marks: comments and the
 * suggestion/diff marks (the AI `insertion`/`deletion`/`modification` marks and
 * the Yjs `y-attributed-*` marks). These annotate content without representing
 * inline formatting and are ignored by BlockNote's content model
 * (`blocknoteIgnore`).
 *
 * They are the only marks allowed on `"plain"` blocks (e.g. code blocks), which
 * otherwise disallow all formatting marks. A block references this group rather
 * than the individual marks because each of them comes from an optional
 * extension (comments, AI suggestions, Yjs attribution) and so is only present
 * when that extension is configured.
 */
export const NON_FORMATTING_MARK_GROUP = "annotation";

/**
 * The `marks` field value for `"plain"` blocks (e.g. code blocks), which hold
 * unstyled text and so disallow formatting marks but still allow the
 * non-formatting ones.
 *
 * Every mark in {@link NON_FORMATTING_MARK_GROUP} comes from an optional
 * extension, so a node spec that referenced the group unconditionally would make
 * ProseMirror throw "Unknown mark type: 'annotation'" while building the schema
 * of an editor that has none of them registered — an empty mark group is an
 * unknown reference just like a missing mark is. (This mirrors `suggestionMarks`
 * for the block-level suggestion group.)
 *
 * Returns the group name (which ProseMirror expands to every mark in it) when at
 * least one such mark is registered, or `""` otherwise. Evaluated at
 * schema-build time, where the tiptap editor's fully-flattened extension list is
 * available on `this.editor`.
 */
export function nonFormattingMarks(editor: Editor | undefined): string {
  if (!editor) {
    return "";
  }
  const hasNonFormattingMark = editor.options.extensions.some((extension) => {
    if (extension.type !== "mark") {
      return false;
    }
    const group = getExtensionField(extension, "group") as string | undefined;
    return (
      typeof group === "string" &&
      group.split(" ").includes(NON_FORMATTING_MARK_GROUP)
    );
  });
  return hasNonFormattingMark ? NON_FORMATTING_MARK_GROUP : "";
}
