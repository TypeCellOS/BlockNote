// Attribution wrappers carry `data-user-ids` but may be `display: contents`.
// Their layout boxes are resolved locally to avoid depending on the `@y/*` stack.

/** Duration of the transient block highlight. */
const HIGHLIGHT_MS = 1500;

/** Allow the preview layout to settle; animation frames pause in background tabs. */
export const SCROLL_TO_FIRST_CHANGE_DELAY_MS = 200;

function hasBox(element: Element): boolean {
  const { width, height } = element.getBoundingClientRect();
  return width !== 0 || height !== 0;
}

/** Descend through `display: contents` wrappers to the first laid-out node. */
function findVisibleTarget(mark: Element): Element | undefined {
  for (
    let element: Element | null = mark;
    element;
    element = element.firstElementChild
  ) {
    if (hasBox(element)) {
      return element;
    }
  }
  return undefined;
}

/**
 * Nearest ancestor of `mark` (below `root`) with a layout box: for a change
 * hidden inside a collapsed toggle, that's the toggle block itself.
 */
function findVisibleAncestor(
  mark: Element,
  root: Element,
): Element | undefined {
  for (
    let element = mark.parentElement;
    element && element !== root && root.contains(element);
    element = element.parentElement
  ) {
    if (hasBox(element)) {
      return element;
    }
  }
  return undefined;
}

/** Cancel the previous highlight when another change is revealed. */
let activeHighlight: Animation | undefined;

function highlight(block: Element) {
  activeHighlight?.cancel();
  // Fire-and-forget pulse: no DOM mutations for ProseMirror to observe. A
  // finished animation stays referenced until the next scroll cancels it,
  // which is a harmless no-op. Scrolling still works without WAAPI.
  activeHighlight = block.animate?.(
    [
      {
        backgroundColor: "color-mix(in srgb, #3e5de7 14%, transparent)",
        boxShadow: "0 0 0 1px color-mix(in srgb, #3e5de7 45%, transparent)",
        borderRadius: "4px",
        easing: "ease-out",
      },
      {
        backgroundColor: "transparent",
        boxShadow: "0 0 0 1px transparent",
        borderRadius: "4px",
      },
    ],
    { duration: HIGHLIGHT_MS, fill: "none" },
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
  );
}

/**
 * Centre the first change in document order and highlight its block,
 * respecting reduced motion. Changes hidden inside collapsed content fall
 * back to their toggle block.
 * @returns Whether a change was found and scrolled to.
 */
export function scrollToFirstChange(root: Element | undefined): boolean {
  if (!root) {
    return false;
  }

  let firstMark: Element | undefined;
  let target: Element | undefined;
  for (const mark of root.querySelectorAll("[data-user-ids]")) {
    firstMark ??= mark;
    target = findVisibleTarget(mark);
    if (target) {
      break;
    }
  }
  target ??= firstMark ? findVisibleAncestor(firstMark, root) : undefined;
  if (!target) {
    return false;
  }
  // A block-level mark wraps the block; point at its content instead so the
  // highlight doesn't span nested children.
  target = target.querySelector(".bn-block-content") ?? target;

  target.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
  highlight(target.closest(".bn-block-content") ?? target);

  return true;
}
