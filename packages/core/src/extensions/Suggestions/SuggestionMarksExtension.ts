import { createExtension } from "../../editor/BlockNoteExtension.js";

/**
 * Selector for the wrapper element of an attribution mark (insert / delete /
 * modification). Every such wrapper carries the author(s) and color in its
 * `data-*` attributes (see `SuggestionMarks.ts`), which is all we need to render
 * the tooltip — so this extension reads attribution straight from the DOM rather
 * than keeping a separate registry of marks.
 */
const ATTRIBUTION_MARK_SELECTOR = "[data-user-ids]";

const formatAttributionTitle = (userIdsJSON: string | undefined): string => {
  if (!userIdsJSON) {
    return "";
  }
  let userIds: unknown;
  try {
    userIds = JSON.parse(userIdsJSON);
  } catch {
    return "";
  }
  return Array.isArray(userIds) && userIds.length > 0 ? userIds.join(", ") : "";
};

/**
 * The on-screen box the tooltip should anchor to. For block-level marks the
 * wrapper's content span is `display: contents` and has no box of its own, so
 * fall back to its first rendered child.
 */
const getReferenceRect = (wrapper: Element): DOMRect => {
  // The wrapper itself is `display: contents`; its first child is the content
  // span that carries the highlight.
  const content = wrapper.firstElementChild ?? wrapper;
  const rect = content.getBoundingClientRect();
  if (rect.width || rect.height) {
    return rect;
  }
  return content.firstElementChild?.getBoundingClientRect() ?? rect;
};

/**
 * Renders the attribution tooltip for suggestion marks (`<ins>` / `<del>` /
 * modification) on hover.
 *
 * Attribution marks nest: a delete can sit inside an insert, and two overlapping
 * suggestions wrap the same text. With per-mark hover listeners both the parent
 * and child would each show their own tooltip. Instead this extension installs a
 * single delegated `mouseover` listener on the editor root and, on each move,
 * finds the *closest* attribution wrapper to the pointer (`Element.closest`).
 * Because `closest` returns the nearest ancestor, the innermost mark always wins
 * and children take priority over their parents.
 *
 * A single tooltip element is reused. It's portaled to the editor's
 * `portalElement` (the floating-UI container) and `position: fixed` so it floats
 * above the document and isn't clipped by an ancestor's `overflow` (e.g. a table
 * cell). It's created on hover and torn down on leave, and the scroll/resize
 * listeners that keep it pinned only run while a tooltip is actually shown.
 *
 * State lives on this per-editor extension instance rather than in module scope,
 * so multiple editors on a page don't share one registry or one tooltip.
 */
export const SuggestionMarksExtension = createExtension(({ editor }) => ({
  key: "suggestionMarks",
  mount({ root, signal }) {
    // The wrapper currently showing a tooltip, and the tooltip element itself.
    let activeWrapper: Element | undefined;
    let tooltipEl: HTMLElement | undefined;

    // Places the tooltip below the active mark (`bottom-start`) with a 4px gap,
    // flipping above when there's no room below and clamping horizontally to keep
    // it on screen. The tooltip is `position: fixed` and portaled to `<body>`, so
    // it's positioned in viewport coordinates.
    const positionTooltip = () => {
      if (!tooltipEl || !activeWrapper) {
        return;
      }
      const gap = 4;
      const padding = 4;
      const anchor = getReferenceRect(activeWrapper);
      const { width, height } = tooltipEl.getBoundingClientRect();

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

      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
    };

    const hideTooltip = () => {
      if (!activeWrapper) {
        return;
      }
      window.removeEventListener("scroll", positionTooltip, true);
      window.removeEventListener("resize", positionTooltip);
      tooltipEl?.remove();
      tooltipEl = undefined;
      activeWrapper = undefined;
    };

    const showTooltip = (wrapper: Element, text: string) => {
      if (activeWrapper === wrapper) {
        return;
      }
      hideTooltip();
      activeWrapper = wrapper;

      tooltipEl = document.createElement("span");
      tooltipEl.className = "bn-suggestion-tooltip";
      tooltipEl.textContent = text;
      // Set inline as the tooltip is portaled out of the mark, so the mark's
      // `--user-color-*` custom properties don't cascade to it.
      tooltipEl.style.backgroundColor = String(
        (wrapper as HTMLElement).dataset["userColorDark"],
      );
      // Portal to the editor's floating-UI container (near the editor, escaping
      // any `overflow` ancestor such as a table cell) rather than `document.body`.
      editor.portalElement.appendChild(tooltipEl);

      positionTooltip();
      // Reposition while hovered so scrolling/resizing keeps the tooltip pinned
      // to the mark. Capture-phase scroll catches scrolling on any ancestor.
      window.addEventListener("scroll", positionTooltip, true);
      window.addEventListener("resize", positionTooltip);
    };

    // The text shown for an attribution wrapper (empty when it carries no
    // attribution, e.g. a null `userIds`).
    const attributionText = (wrapper: HTMLElement) =>
      formatAttributionTitle(wrapper.dataset["userIds"]);

    // The innermost attributed mark at or above `el`. `closest` returns the
    // nearest ancestor (or self) matching the selector; wrappers without
    // attribution are skipped so an attributed parent still wins.
    const innermostAttributed = (
      el: Element | null,
    ): HTMLElement | undefined => {
      while (el) {
        const wrapper = el.closest<HTMLElement>(ATTRIBUTION_MARK_SELECTOR);
        if (!wrapper) {
          return undefined;
        }
        if (attributionText(wrapper)) {
          return wrapper;
        }
        el = wrapper.parentElement;
      }
      return undefined;
    };

    const onPointerOver = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const innermost = innermostAttributed(target);
      if (!innermost) {
        // Not over an attributed mark — drop the current tooltip.
        hideTooltip();
        return;
      }

      const text = attributionText(innermost);
      // De-duplicate nested identical tooltips: if an enclosing mark would show
      // the exact same text, anchor on the *outermost* such ancestor so a single
      // tooltip covers the whole region instead of re-anchoring to the smaller
      // child. We only keep the child's tooltip when an enclosing mark has
      // genuinely *different* content (a different author), which breaks the
      // chain. Empty-attribution ancestors carry no tooltip, so they're
      // transparent and we climb past them.
      let anchor = innermost;
      let el: Element | null = innermost.parentElement;
      while (el) {
        const ancestor = el.closest<HTMLElement>(ATTRIBUTION_MARK_SELECTOR);
        if (!ancestor) {
          break;
        }
        const ancestorText = attributionText(ancestor);
        if (ancestorText === text) {
          anchor = ancestor;
        } else if (ancestorText) {
          break;
        }
        el = ancestor.parentElement;
      }

      showTooltip(anchor, text);
    };

    root.addEventListener("mouseover", onPointerOver, { signal });
    signal.addEventListener("abort", hideTooltip);
  },
}));
