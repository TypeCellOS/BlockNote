// Attribution wrappers carry `data-user-ids` but may be `display: contents`.
// Resolve their layout boxes locally without importing the `@y/*` stack.

import { scrollAndHighlight } from "../../util/scrollAndHighlight.js";

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

/**
 * Scroll to the first change after preview layout settles. No-ops when
 * disabled or when `isCurrent` reports the preview as superseded.
 * Returns a cancellation callback when a timer is scheduled.
 */
export function scheduleScrollToFirstChange(
  getRoot: () => Element | undefined,
  options?: { enabled?: boolean; isCurrent?: () => boolean },
): (() => void) | undefined {
  if (options?.enabled === false) {
    return;
  }
  // Let preview layout settle; timers also run in background tabs.
  const timeout = setTimeout(() => {
    if (options?.isCurrent && !options.isCurrent()) {
      return;
    }
    scrollToFirstChange(getRoot());
  }, SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  return () => clearTimeout(timeout);
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

  scrollAndHighlight(target);

  return true;
}
