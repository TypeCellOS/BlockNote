// Attribution wrappers carry `data-user-ids` but may be `display: contents`.
// Resolve their layout boxes locally to avoid a dependency on the `@y/*` stack.

/** Duration of the transient block highlight. */
const HIGHLIGHT_MS = 1500;

/** Allow the preview layout to settle; animation frames pause in background tabs. */
export const SCROLL_TO_FIRST_CHANGE_DELAY_MS = 200;

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

/** Cancel the previous highlight when another change is revealed. */
let activeHighlight: Animation | undefined;

function highlight(block: Element, reducedMotion: boolean) {
  activeHighlight?.cancel();
  activeHighlight = undefined;

  // Scrolling still works in environments without the Web Animations API.
  if (!block.animate) {
    return;
  }

  const peak: Keyframe = {
    backgroundColor: "color-mix(in srgb, #3e5de7 14%, transparent)",
    boxShadow: "0 0 0 1px color-mix(in srgb, #3e5de7 45%, transparent)",
    borderRadius: "4px",
    easing: "ease-out",
  };
  const rest: Keyframe = {
    ...peak,
    backgroundColor: "transparent",
    boxShadow: "0 0 0 1px transparent",
  };

  // Fade without DOM mutations that ProseMirror would observe.
  // Reduced motion holds the highlight steady until it is removed.
  const animation = block.animate([peak, reducedMotion ? peak : rest], {
    duration: HIGHLIGHT_MS,
    fill: "none",
  });
  activeHighlight = animation;
  animation.onfinish = () => {
    if (activeHighlight === animation) {
      activeHighlight = undefined;
    }
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
  highlight(block, reducedMotion);

  return true;
}
