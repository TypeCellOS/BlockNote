import { Mark } from "@tiptap/core";
import { Mark as PMMark, MarkSpec } from "prosemirror-model";
import {
  createExtension,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BLOCK_LEVEL_SUGGESTION_GROUP } from "../../pm-nodes/suggestionMarks.js";

/**
 * Describes a suggestion mark to {@link GetAttributionMarkClassName}: whether it
 * wraps inline content or a whole block, and which kind of change it represents.
 * `modificationType: "format"` corresponds to the `y-attributed-format`
 * (modification) mark.
 */
export type AttributionMarkStyleInfo = {
  contentType: "inline-content" | "block";
  modificationType: "insert" | "delete" | "format";
};

/**
 * The class name(s) an app returns to style a suggestion mark. Either:
 * - a single string applied to *both* the mark content and its hover tooltip, or
 * - `{ content, tooltip }` to style the mark content and the tooltip
 *   independently.
 */
export type AttributionMarkClassNames =
  | string
  | { content: string; tooltip: string };

/**
 * Optional callback to override suggestion-mark styling. Given a mark's
 * {@link AttributionMarkStyleInfo}, it returns the class name(s) to apply (see
 * {@link AttributionMarkClassNames}). When a class is returned, the default
 * per-user color (the `--user-color-*` custom properties and the built-in
 * `.bn-suggestion-mark` / `.bn-suggestion-node` styling) is *not* applied to the
 * mark content, so the class fully controls its appearance — letting an app
 * color suggestions by change type (e.g. green insertions, red deletions)
 * instead of by author.
 */
export type GetAttributionMarkClassName = (
  info: AttributionMarkStyleInfo,
) => AttributionMarkClassNames;

/**
 * Resolve the {@link AttributionMarkClassNames} returned by a
 * {@link GetAttributionMarkClassName} callback to the class name for a single
 * target (the mark `content` or its `tooltip`).
 */
export const resolveAttributionMarkClassName = (
  result: AttributionMarkClassNames | undefined,
  target: "content" | "tooltip",
): string | undefined =>
  result === undefined
    ? undefined
    : typeof result === "string"
      ? result
      : result[target];

/**
 * Shared mark view for the attribution marks (insert / delete / modification).
 * It renders the marked content and tags the wrapper with the author(s) via
 * `data-*` attributes. The attribution tooltip shown on hover is handled
 * separately by the `AttributionExtension`, which reads those attributes
 * straight from the DOM — keeping this mark view purely presentational and the
 * tooltip state off of module scope. Author colors are applied separately as a
 * decoration layer (also in `AttributionExtension`), so they can resolve
 * asynchronously without being baked into the deterministic mark attrs.
 */
const createAttributionMarkView =
  (
    type: "insert" | "delete" | "modification",
    options?: {
      editor?: BlockNoteEditor<any, any, any>;
      getAttributionMarkClassName?: GetAttributionMarkClassName;
    },
  ) =>
  ({ mark, inline }: { mark: PMMark; inline: boolean }) => {
    const editor = options?.editor;
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
      inline: String(inline),
    });
    if (type === "modification") {
      dom.dataset["type"] = "modification";
      dom.dataset["format"] = JSON.stringify(mark.attrs["format"]);
    }

    // Optional app-provided override: `y-attributed-format` is exposed as
    // `"format"`. When a class is returned it's applied to the content element
    // *instead of* the built-in `.bn-suggestion-mark` / `.bn-suggestion-node`
    // classes, and the per-user `--user-color-*` properties are omitted, so the
    // class fully controls the appearance (background, text color, etc.) with no
    // per-user color leaking through (see the type doc).
    const contentClassName = resolveAttributionMarkClassName(
      options?.getAttributionMarkClassName?.({
        contentType: inline ? "inline-content" : "block",
        modificationType: type === "modification" ? "format" : type,
      }),
      "content",
    );

    // The wrapper is always `display: contents` so it never generates a box of
    // its own — an inline `<ins>`/`<del>` around block/table content (e.g. a
    // suggestion spanning table cells) would otherwise break the normal layout.
    // Because a `display: contents` element paints nothing, the highlight is
    // applied to the inner content span (see `.bn-suggestion-mark` in Block.css)
    // using the `--user-color-*` custom properties. Those properties are *not*
    // set here — they're supplied by the decoration layer in
    // `AttributionExtension`, which resolves colors from the user store
    // independently of the (deterministic, color-free) mark attrs. When an
    // override class owns the styling, no per-user color is applied at all.
    dom.style.cssText = "display: contents";

    const contentDOM = document.createElement("span");
    if (inline) {
      if (contentClassName) {
        // Override path: the app-provided class fully owns styling (and no color
        // decoration is emitted for it), so this span is the painted box.
        contentDOM.className = contentClassName;
      } else {
        // Default path: the per-user highlight is painted by the color
        // decoration (see `AttributionExtension`), which wraps the text in a
        // span carrying the `.bn-suggestion-mark(--delete)` class *and* the
        // `--user-color-*` properties. Keep this content span structural
        // (`display: contents`) so it doesn't also match the highlight rules and
        // double-paint (e.g. a doubled strike-through / dotted underline).
        contentDOM.style.display = "contents";
      }
    } else {
      // Block-level marks wrap block/table structure (e.g. <tr>/<td>/<p>). The
      // span must be `display: contents` so it doesn't inject an inline box into
      // the table layout (which triggers the browser's anonymous-table fixup and
      // breaks the table). Such a span has no box to paint a background on, so
      // the `.bn-suggestion-node` rule highlights its children (the wrapped
      // nodes) instead. An override class is applied to the same span, so it
      // should likewise target its children (e.g. `.my-class > *`).
      contentDOM.style.display = "contents";
      contentDOM.className =
        contentClassName ??
        (type === "delete"
          ? "bn-suggestion-node bn-suggestion-node--delete"
          : "bn-suggestion-node");
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

export const YAttributedInsertion = Mark.create<{
  getAttributionMarkClassName?: GetAttributionMarkClassName;
}>({
  name: "y-attributed-insert",
  inclusive: false,
  excludes: "",
  // Allow this mark on block nodes (see `suggestionMarks`), so a whole block can
  // be marked as inserted in suggestion mode.
  group: BLOCK_LEVEL_SUGGESTION_GROUP,
  addAttributes() {
    return {
      userIds: { default: null },
    };
  },
  addMarkView() {
    return createAttributionMarkView("insert", {
      getAttributionMarkClassName: this.options.getAttributionMarkClassName,
    });
  },
  extendMarkSchema(extension) {
    if (extension.name !== this.name) {
      return {};
    }
    return {
      blocknoteIgnore: true,
    } satisfies MarkSpec;
  },
});

export const YAttributedDeletion = Mark.create<{
  editor?: BlockNoteEditor<any, any, any>;
  getAttributionMarkClassName?: GetAttributionMarkClassName;
}>({
  name: "y-attributed-delete",
  inclusive: false,
  excludes: "",
  group: BLOCK_LEVEL_SUGGESTION_GROUP,
  addAttributes() {
    return {
      userIds: { default: null },
    };
  },
  addMarkView() {
    return createAttributionMarkView("delete", {
      editor: this.options.editor,
      getAttributionMarkClassName: this.options.getAttributionMarkClassName,
    });
  },
  extendMarkSchema(extension) {
    if (extension.name !== this.name) {
      return {};
    }
    return {
      blocknoteIgnore: true,
    } satisfies MarkSpec;
  },
});

export const YAttributedFormat = Mark.create<{
  getAttributionMarkClassName?: GetAttributionMarkClassName;
}>({
  name: "y-attributed-format",
  inclusive: false,
  excludes: "",
  group: BLOCK_LEVEL_SUGGESTION_GROUP,
  addAttributes() {
    return {
      userIds: { default: null },
      format: { default: null },
    };
  },
  addMarkView() {
    return createAttributionMarkView("modification", {
      getAttributionMarkClassName: this.options.getAttributionMarkClassName,
    });
  },
  extendMarkSchema(extension) {
    if (extension.name !== this.name) {
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
export const YAttributionMarksExtension = createExtension(
  ({
    options,
  }: ExtensionOptions<
    { getAttributionMarkClassName?: GetAttributionMarkClassName } | undefined
  >) => ({
    key: "yAttributionMarks",
    tiptapExtensions: [
      YAttributedInsertion.configure({
        getAttributionMarkClassName: options?.getAttributionMarkClassName,
      }),
      YAttributedDeletion.configure({
        getAttributionMarkClassName: options?.getAttributionMarkClassName,
      }),
      YAttributedFormat.configure({
        getAttributionMarkClassName: options?.getAttributionMarkClassName,
      }),
    ],
  }),
);
