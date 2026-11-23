export function installBrowserTestStyles() {
  // Match the playground's editor framing so screenshots line up with what
  // users see at https://www.blocknotejs.org/examples (max-width 731px,
  // horizontally centred, slight top padding). Without this the editor
  // stretches the full 1280px and snapshot baselines drift from production.
  const style = document.createElement("style");
  style.textContent = `.bn-container { max-width: 731px; margin: 0 auto; padding-top: 8px; }`;
  document.head.appendChild(style);
  const removeNoMotion = installBrowserNoMotion(document);

  return () => {
    removeNoMotion();
    style.remove();
  };
}

/** Document styles do not reach shadow trees; install in each test-owned root. */
export function installBrowserNoMotion(root: Document | ShadowRoot) {
  // Disable CSS transitions & animations for the whole suite. The editor
  // animates block geometry (e.g. `.bn-block-outer { transition: margin 0.2s }`
  // driven by the PreviousBlockType depth-change decorations), so for ~200ms
  // after a Tab/Shift+Tab the blocks' x-positions are mid-flight. Visual caret
  // movement (ArrowUp/ArrowDown) then lands at a timing-dependent text offset,
  // which made document snapshots race the animation clock under CPU
  // contention. With motion disabled, layout is always in its settled state and
  // caret geometry is deterministic. (No product code listens for
  // transitionend/animationend, and no keyframes rely on fill-mode, so
  // suppressing motion only removes the timing dependency.)
  const container = "head" in root ? root.head : root;
  const noMotion = container.ownerDocument.createElement("style");
  noMotion.textContent = `*, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }`;
  container.appendChild(noMotion);

  return () => noMotion.remove();
}
