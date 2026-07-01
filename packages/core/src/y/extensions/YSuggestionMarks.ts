import { Mark } from "@tiptap/core";
import { Mark as PMMark, MarkSpec } from "prosemirror-model";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BLOCK_LEVEL_SUGGESTION_GROUP } from "../../pm-nodes/suggestionMarks.js";

/**
 * Shared mark view for the attribution marks (insert / delete / modification).
 * It renders the marked content and tags the wrapper with the author(s) and
 * color via `data-*` attributes. The attribution tooltip shown on hover is
 * handled separately by the `SuggestionMarksExtension`, which reads those
 * attributes straight from the DOM — keeping this mark view purely
 * presentational and the tooltip state off of module scope.
 */
const createAttributionMarkView =
  (
    type: "insert" | "delete" | "modification",
    editor?: BlockNoteEditor<any, any, any>,
  ) =>
  ({ mark, inline }: { mark: PMMark; inline: boolean }) => {
    // `<ins>`/`<del>` are semantic elements. The modification mark has no
    // dedicated element, so it renders as a `<span>` inline or a `<div>` over a
    // block, matching its `parseDOM` rules.
    const tag =
      type === "insert"
        ? "ins"
        : type === "delete"
          ? "del"
          : inline
            ? "span"
            : "div";
    const dom = document.createElement(tag);

    Object.assign(dom.dataset, {
      userIds: JSON.stringify(mark.attrs["userIds"]),
      userColorLight: String(mark.attrs["user-color-light"]),
      userColorDark: String(mark.attrs["user-color-dark"]),
      inline: String(inline),
    });
    if (type === "modification") {
      dom.dataset["type"] = "modification";
      dom.dataset["format"] = JSON.stringify(mark.attrs["format"]);
    }
    // The wrapper is always `display: contents` so it never generates a box of
    // its own — an inline `<ins>`/`<del>` around block/table content (e.g. a
    // suggestion spanning table cells) would otherwise break the normal layout.
    // Because a `display: contents` element paints nothing, the highlight is
    // applied to the inner content span (see `.bn-suggestion-mark` in Block.css);
    // the `--user-color-*` custom properties set here cascade down to it.
    dom.style.cssText =
      "display: contents" +
      `; --user-color-light: ${mark.attrs["user-color-light"]}; --user-color-dark: ${mark.attrs["user-color-dark"]}`;

    const contentDOM = document.createElement("span");
    if (inline) {
      // Inline content: the span is a real inline box that carries the highlight.
      contentDOM.className =
        type === "delete"
          ? "bn-suggestion-mark bn-suggestion-mark--delete"
          : "bn-suggestion-mark";
    } else {
      // Block-level marks wrap block/table structure (e.g. <tr>/<td>/<p>). The
      // span must be `display: contents` so it doesn't inject an inline box into
      // the table layout (which triggers the browser's anonymous-table fixup and
      // breaks the table). Such a span has no box to paint a background on, so
      // the `.bn-suggestion-node` rule highlights its children (the wrapped
      // nodes) instead.
      contentDOM.style.display = "contents";
      contentDOM.className =
        type === "delete"
          ? "bn-suggestion-node bn-suggestion-node--delete"
          : "bn-suggestion-node";
      if (type === "delete") {
        // A deleted block shows a localized "Deleted" badge via a `::before`
        // (see Block.css). The badge text is passed down as a CSS string token
        // in `--deleted-label` so the stylesheet stays locale-agnostic; the
        // wrapper is `display: contents` and can't paint a pseudo-element of its
        // own, so the rule renders the badge on the wrapped node instead, which
        // inherits this custom property.
        const label = editor?.dictionary.suggestion_changes.deleted;
        if (label) {
          contentDOM.style.setProperty(
            "--deleted-label",
            JSON.stringify(label),
          );
        }
      }
    }
    dom.appendChild(contentDOM);

    return {
      dom,
      contentDOM,
    };
  };

export const YAttributedInsertion = Mark.create({
  name: "y-attributed-insert",
  inclusive: false,
  excludes: "",
  // Allow this mark on block nodes (see `suggestionMarks`), so a whole block can
  // be marked as inserted in suggestion mode.
  group: BLOCK_LEVEL_SUGGESTION_GROUP,
  addAttributes() {
    return {
      userIds: { default: null },
      "user-color-light": { default: null, validate: "string" },
      "user-color-dark": { default: null, validate: "string" },
    };
  },
  addMarkView() {
    return createAttributionMarkView("insert");
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-insert") {
      return {};
    }
    return {
      blocknoteIgnore: true,
    } satisfies MarkSpec;
  },
});

export const YAttributedDeletion = Mark.create<{
  editor?: BlockNoteEditor<any, any, any>;
}>({
  name: "y-attributed-delete",
  inclusive: false,
  excludes: "",
  group: BLOCK_LEVEL_SUGGESTION_GROUP,
  addAttributes() {
    return {
      userIds: { default: null },
      "user-color-light": { default: null, validate: "string" },
      "user-color-dark": { default: null, validate: "string" },
    };
  },
  addMarkView() {
    return createAttributionMarkView("delete");
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-delete") {
      return {};
    }
    return {
      blocknoteIgnore: true,
    } satisfies MarkSpec;
  },
});

export const YAttributedFormat = Mark.create({
  name: "y-attributed-format",
  inclusive: false,
  excludes: "",
  group: BLOCK_LEVEL_SUGGESTION_GROUP,
  addAttributes() {
    return {
      userIds: { default: null },
      format: { default: null },
      "user-color-light": { default: null, validate: "string" },
      "user-color-dark": { default: null, validate: "string" },
    };
  },
  addMarkView() {
    return createAttributionMarkView("modification");
  },
  extendMarkSchema(extension) {
    if (extension.name !== "y-attributed-format") {
      return {};
    }
    return {
      blocknoteIgnore: true,
    } satisfies MarkSpec;
  },
});

/**
 * Bundles the three `y-attributed-*` suggestion marks into a single BlockNote
 * extension, so they can be registered wherever they're actually needed (the
 * Yjs collaboration extension, or a test that exercises suggestions) instead of
 * living in the default schema. The marks opt into being allowed on block nodes
 * via their `blockLevelSuggestion` option — see `suggestionMarks`.
 */
export const YSuggestionMarksExtension = createExtension(() => ({
  key: "ySuggestionMarks",
  tiptapExtensions: [
    YAttributedInsertion,
    YAttributedDeletion,
    YAttributedFormat,
  ],
}));
