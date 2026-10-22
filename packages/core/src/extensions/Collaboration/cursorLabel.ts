let anchors = 0;

/** The default caret and label of a cursor, if it has them. */
function caretAndLabel(cursorElement: HTMLElement) {
  const caret = cursorElement.querySelector<HTMLElement>(
    ".bn-collaboration-cursor__caret",
  );
  const label = cursorElement.querySelector<HTMLElement>(
    ".bn-collaboration-cursor__label",
  );
  return caret && label ? { caret, label } : undefined;
}

/**
 * Anchors the label of a remote cursor to its caret with CSS anchor
 * positioning (see `editor.css`). The label is `fixed`, so a scroll container
 * around the caret, e.g. a table, doesn't clip it. At the edges of the screen,
 * it goes below the caret or to its left.
 *
 * A cursor without the default caret and label (`renderCursor`) is left as it
 * is.
 */
export function floatCursorLabel(cursorElement: HTMLElement) {
  const elements = caretAndLabel(cursorElement);
  if (!elements) {
    return;
  }
  // Unique on the page, also across editors.
  const anchor = `--bn-cursor-${++anchors}`;
  elements.caret.style.setProperty("anchor-name", anchor);
  elements.label.style.setProperty("position-anchor", anchor);
  cursorElement.setAttribute("data-floating-label", "");
  // The closed label is the marker at the caret, so it needs its side too,
  // once the cursor is in the editor and has its size.
  requestAnimationFrame(() => updateSide(cursorElement, elements));
}

/**
 * Shows the label of a remote cursor, on the side it is on now. Showing it
 * again, e.g. after the cursor moved, updates the side.
 */
export function showCursorLabel(cursorElement: HTMLElement) {
  const elements = floatingCaretAndLabel(cursorElement);
  if (elements) {
    updateSide(cursorElement, elements);
  }
  cursorElement.setAttribute("data-active", "");
}

/** Hides the label of a remote cursor. */
export function hideCursorLabel(cursorElement: HTMLElement) {
  cursorElement.removeAttribute("data-active");
}

/**
 * Picks the side of the label (`data-placement`): above the caret, from its
 * left, unless it doesn't fit on the screen there. CSS positions the label on
 * that side, grows it from the caret, and gives it a square corner there.
 * (The browser's own flipping, `position-try-fallbacks`, keeps a side that
 * still fits after the caret moved away from the edge, and CSS can't tell
 * which side it picked.)
 */
function updateSide(
  cursorElement: HTMLElement,
  { caret, label }: { caret: HTMLElement; label: HTMLElement },
) {
  const caretRect = caret.getBoundingClientRect();
  // The size of the open label: `clip-path` and margins don't change it.
  const { offsetWidth: width, offsetHeight: height } = label;
  const block = caretRect.top - height >= 0 ? "top" : "bottom";
  const inline =
    caretRect.left + width <= document.documentElement.clientWidth
      ? "start"
      : "end";
  const placement = `${block}-${inline}`;
  if (label.getAttribute("data-placement") === placement) {
    return;
  }
  label.setAttribute("data-placement", placement);
  if (!cursorElement.hasAttribute("data-active")) {
    // Closed, the label is the marker at the caret: moves it at once, so it
    // doesn't slide, and the label opens from the new side.
    label.style.transition = "none";
    getComputedStyle(label).getPropertyValue("clip-path");
    label.style.transition = "";
  }
}

/** The caret and label of a cursor that `floatCursorLabel` set up. */
function floatingCaretAndLabel(cursorElement: HTMLElement) {
  return cursorElement.hasAttribute("data-floating-label")
    ? caretAndLabel(cursorElement)
    : undefined;
}

/**
 * The collaborators whose edits a remote Yjs transaction applies: their clocks
 * advanced. Typing doesn't move a collaborator's cursor in Yjs (it is relative
 * to the text), so the edits show that they are active. Deletions don't
 * advance a clock, and Yjs doesn't record who deleted.
 */
export function remoteEditors(transaction: {
  local: boolean;
  beforeState: Map<number, number>;
  afterState: Map<number, number>;
}): number[] {
  if (transaction.local) {
    return [];
  }
  return [...transaction.afterState]
    .filter(
      ([client, clock]) => clock > (transaction.beforeState.get(client) ?? 0),
    )
    .map(([client]) => client);
}
