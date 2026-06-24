import { Mark } from "@tiptap/core";
import { Mark as PMMark, MarkSpec } from "prosemirror-model";

// This copies the marks from @handlewithcare/prosemirror-suggest-changes,
// but uses the Tiptap Mark API instead so we can use them in BlockNote

// The ideal solution would be to not depend on tiptap nodes / marks, but be able to use prosemirror nodes / marks directly
// this way we could directly use the exported marks from @handlewithcare/prosemirror-suggest-changes

const formatAttributionTitle = (
  userIds: readonly string[] | null,
): string | undefined => {
  if (userIds && userIds.length > 0) {
    return userIds.join(", ");
  }
  return undefined;
};

/**
 * Shared mark view for the attribution marks (insert / delete / modification).
 * It renders the marked content and, when the mark carries attribution, a
 * tooltip showing the author(s) on hover.
 *
 * The tooltip is positioned manually (see `positionTooltip`) rather than with
 * pure CSS. Crucially it is portaled to `document.body` and `position: fixed` so
 * it floats above the document and is no longer clipped by an ancestor's
 * `overflow` (e.g. a table cell), which the previous CSS `::after` approach
 * suffered from.
 *
 * The tooltip is also created lazily on hover (and torn down on leave) so we
 * don't keep scroll/resize listeners running for every suggestion mark in the
 * document.
 */
const createAttributionMarkView =
  (type: "insert" | "delete" | "modification") =>
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
      // nodes) instead. No tooltip is shown for block-level marks.
      contentDOM.style.display = "contents";
      contentDOM.className = "bn-suggestion-node";
    }
    dom.appendChild(contentDOM);

    const text = formatAttributionTitle(mark.attrs["userIds"]);

    let tooltip: HTMLElement | undefined;

    // Positioning reference. For block-level marks the content span is
    // `display: contents` and has no box of its own, so fall back to its first
    // rendered child.
    const getReferenceRect = () => {
      const rect = contentDOM.getBoundingClientRect();
      if (rect.width || rect.height) {
        return rect;
      }
      return contentDOM.firstElementChild?.getBoundingClientRect() ?? rect;
    };

    // Places the tooltip below the mark (`bottom-start`) with a 4px gap. The
    // tooltip is `position: fixed` and portaled to `<body>`, so it's positioned
    // in viewport coordinates and floats above any clipping ancestor. We flip it
    // above the mark when there's no room below, and clamp it horizontally to
    // keep it on screen — the small subset of Floating UI's offset/flip/shift we
    // actually relied on.
    const positionTooltip = () => {
      if (!tooltip) {
        return;
      }
      const gap = 4;
      const padding = 4;
      const anchor = getReferenceRect();
      const { width, height } = tooltip.getBoundingClientRect();

      let top = anchor.bottom + gap;
      // Flip above if it would overflow the bottom and there's room above.
      if (
        top + height > window.innerHeight - padding &&
        anchor.top - gap - height >= padding
      ) {
        top = anchor.top - gap - height;
      }

      const maxLeft = window.innerWidth - width - padding;
      const left = Math.max(padding, Math.min(anchor.left, maxLeft));

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    const hideTooltip = () => {
      window.removeEventListener("scroll", positionTooltip, true);
      window.removeEventListener("resize", positionTooltip);
      tooltip?.remove();
      tooltip = undefined;
    };

    const showTooltip = () => {
      if (!text || tooltip) {
        return;
      }

      tooltip = document.createElement("span");
      tooltip.className = "bn-suggestion-tooltip";
      tooltip.textContent = text;
      // Set inline as the tooltip is portaled to `document.body`, so the mark's
      // `--user-color-*` custom properties don't cascade to it.
      tooltip.style.backgroundColor = String(mark.attrs["user-color-dark"]);
      document.body.appendChild(tooltip);

      positionTooltip();
      // Reposition while hovered so scrolling/resizing keeps the tooltip pinned
      // to the mark. Capture-phase scroll catches scrolling on any ancestor.
      window.addEventListener("scroll", positionTooltip, true);
      window.addEventListener("resize", positionTooltip);
    };

    let destroy: (() => void) | undefined;
    // Only inline marks (over text) get a tooltip; block-level marks (over a
    // node) are distinguished by the node background highlight alone.
    if (inline && text) {
      // Listen on the content span rather than the `display: contents` wrapper,
      // which has no box to hover over.
      contentDOM.addEventListener("mouseenter", showTooltip);
      contentDOM.addEventListener("mouseleave", hideTooltip);
      destroy = () => {
        contentDOM.removeEventListener("mouseenter", showTooltip);
        contentDOM.removeEventListener("mouseleave", hideTooltip);
        hideTooltip();
      };
    }

    return {
      dom,
      contentDOM,
      destroy,
    };
  };

export const SuggestionAddMark = Mark.create({
  name: "y-attributed-insert",
  inclusive: false,
  // excludes: "", TODO: what's desired?
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
      inclusive: false,
      parseDOM: [
        {
          tag: "ins",
          getAttrs(node) {
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              "user-color-light": node.dataset["userColorLight"],
              "user-color-dark": node.dataset["userColorDark"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});

export const SuggestionDeleteMark = Mark.create({
  name: "y-attributed-delete",
  inclusive: false,
  // excludes: "", TODO: what's desired?
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
      inclusive: false,
      parseDOM: [
        {
          tag: "del",
          getAttrs(node) {
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              "user-color-light": node.dataset["userColorLight"],
              "user-color-dark": node.dataset["userColorDark"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});

export const SuggestionModificationMark = Mark.create({
  name: "y-attributed-format",
  inclusive: false,
  // excludes: "", TODO: what's desired?
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
      inclusive: false,
      parseDOM: [
        {
          tag: "span[data-type='modification']",
          getAttrs(node) {
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              format: node.dataset["format"]
                ? JSON.parse(node.dataset["format"])
                : null,
              "user-color-light": node.dataset["userColorLight"],
              "user-color-dark": node.dataset["userColorDark"],
            };
          },
        },
        {
          tag: "div[data-type='modification']",
          getAttrs(node) {
            if (!node.dataset["userIds"]) {
              return false;
            }
            return {
              userIds: JSON.parse(node.dataset["userIds"]),
              format: node.dataset["format"]
                ? JSON.parse(node.dataset["format"])
                : null,
              "user-color-light": node.dataset["userColorLight"],
              "user-color-dark": node.dataset["userColorDark"],
            };
          },
        },
      ],
    } satisfies MarkSpec;
  },
});
