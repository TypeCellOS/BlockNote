import { Mark } from "@tiptap/core";
import { Mark as PMMark, MarkSpec } from "prosemirror-model";
import {
  createExtension,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BLOCK_LEVEL_SUGGESTION_GROUP } from "../../pm-nodes/suggestionMarks.js";
import {
  fallbackColorForUserId,
  userColorPalette,
  userColorVarNames,
} from "./userColors.js";

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
 * tooltip state off of module scope.
 *
 * Author colors are *not* baked into the (deterministic) mark attrs. Instead the
 * wrapper sets the generic `--user-color-*` custom properties the Block.css rules
 * read, sourcing them from the author's *per-user* CSS variable via
 * `var(--user-color-<id>-*, <fallback>)`. Those per-user variables are populated
 * on the editor root by `AttributionExtension` once the user resolves, so a mark
 * shows the deterministic palette fallback immediately and recolors to the
 * author's own color purely through the CSS cascade — no decoration, no doc
 * transaction. See `userColors.ts`.
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
    // using the `--user-color-*` custom properties, which cascade down from here.
    // They're sourced from the author's per-user variable (populated on the
    // editor root by `AttributionExtension`) with the deterministic palette as a
    // fallback, so a mark is colored before the user resolves and recolors via
    // the cascade afterward. When an override class owns the styling, no per-user
    // color is applied at all.
    const userIds = (mark.attrs["userIds"] as string[] | null) ?? [];
    const firstId = userIds[0];
    const fallback = firstId
      ? fallbackColorForUserId(firstId)
      : userColorPalette[0];
    if (contentClassName) {
      dom.style.cssText = "display: contents";
    } else {
      const light = firstId
        ? `var(${userColorVarNames(firstId).light}, ${fallback.light})`
        : fallback.light;
      const dark = firstId
        ? `var(${userColorVarNames(firstId).dark}, ${fallback.dark})`
        : fallback.dark;
      dom.style.cssText =
        "display: contents" +
        `; --user-color-light: ${light}; --user-color-dark: ${dark}`;
    }

    const contentDOM = document.createElement("span");
    if (inline) {
      // Inline content: the span is a real inline box that carries the highlight
      // (default path) or the app-provided override class.
      contentDOM.className =
        contentClassName ??
        (type === "delete"
          ? "bn-suggestion-mark bn-suggestion-mark--delete"
          : "bn-suggestion-mark");
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
