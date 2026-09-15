// Attribution wrappers carry `data-user-ids` but may be `display: contents`.
// Resolve their layout boxes locally to avoid a dependency on the `@y/*` stack.

/** Must match the `bn-scrolled-to-change` animation duration in editor.css. */
const HIGHLIGHT_MS = 1500;

/** Allow the preview layout to settle; animation frames pause in background tabs. */
export const SCROLL_TO_FIRST_CHANGE_DELAY_MS = 200;

/** Class the changed block carries while it's pulsing. */
export const SCROLL_HIGHLIGHT_CLASS = "bn-scrolled-to-change";

/** Descend through `display: contents`; collapsed content has no layout box. */
function findLaidOutElement(wrapper: Element): Element | undefined {
  let element: Element | null = wrapper;
  while (element) {
    const rect = element.getBoundingClientRect();
    if (rect.width || rect.height) {
      return element;
    }
    element = element.firstElementChild;
  }
  return undefined;
}

/**
 * The nearest ancestor of `mark` (below `root`) with a layout box: for a change
 * hidden inside a collapsed toggle, that's the toggle block itself.
 */
function findLaidOutAncestor(
  mark: Element,
  root: Element,
): Element | undefined {
  for (
    let element = mark.parentElement;
    element && element !== root && root.contains(element);
    element = element.parentElement
  ) {
    const rect = element.getBoundingClientRect();
    if (rect.width || rect.height) {
      return element;
    }
  }
  return undefined;
}

/** Prefer visible insertions, then formatting, then deletions. If all changes
 * are hidden, scroll to the containing block of the highest-priority change. */
function findScrollTarget(root: Element): Element | undefined {
  let firstHidden: Element | undefined;
  // Within each change kind, querySelectorAll preserves document order.
  for (const selector of [
    "ins[data-user-ids]",
    "[data-user-ids]:not(ins):not(del)",
    "del[data-user-ids]",
  ]) {
    for (const mark of root.querySelectorAll(selector)) {
      const element = findLaidOutElement(mark);
      if (element) {
        return element;
      }
      firstHidden ??= mark;
    }
  }
  return firstHidden && findLaidOutAncestor(firstHidden, root);
}

/** The block currently pulsing, so a new scroll can restart it cleanly. */
let activeHighlight:
  | { block: Element; timer: ReturnType<typeof setTimeout> }
  | undefined;

function highlight(block: Element) {
  if (activeHighlight) {
    clearTimeout(activeHighlight.timer);
    activeHighlight.block.classList.remove(SCROLL_HIGHLIGHT_CLASS);
    // Removing and re-adding the class in the same frame doesn't restart a CSS
    // animation; forcing a style flush in between does.
    void (activeHighlight.block as HTMLElement).offsetWidth;
  }
  block.classList.add(SCROLL_HIGHLIGHT_CLASS);
  activeHighlight = {
    block,
    timer: setTimeout(() => {
      block.classList.remove(SCROLL_HIGHLIGHT_CLASS);
      activeHighlight = undefined;
    }, HIGHLIGHT_MS),
  };
}

/**
 * Centre the first visible change and highlight its block, respecting reduced motion.
 * @returns Whether a change or its visible ancestor was found and scrolled to.
 */
export function scrollToFirstChange(root: Element | undefined): boolean {
  if (!root) {
    return false;
  }

  const target = findScrollTarget(root);
  if (!target) {
    return false;
  }

  // Inline marks sit inside block content; block-level marks wrap it.
  const enclosingBlock = target.closest(".bn-block-content");
  const block =
    enclosingBlock ?? target.querySelector(".bn-block-content") ?? target;
  // Scroll to the change itself where there is one to point at — centring a
  // tall block (a table, a long code block) could leave an inline change in it
  // off screen — and to the block's content for a block-level mark, whose
  // wrapper also spans any nested children.
  const scrollTarget = enclosingBlock ? target : block;

  const reducedMotion =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

  scrollTarget.scrollIntoView({
    block: "center",
    behavior: reducedMotion ? "auto" : "smooth",
  });
  highlight(block);

  return true;
}
