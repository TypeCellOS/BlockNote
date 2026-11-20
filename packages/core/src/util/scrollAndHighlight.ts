/** Scroll and briefly highlight without changing editor focus or selection. */
export function scrollAndHighlight(target: Element): void {
  const reducedMotion =
    target.ownerDocument.defaultView?.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false;
  target.scrollIntoView?.({
    block: "center",
    behavior: reducedMotion ? "auto" : "smooth",
  });
  const block = target.closest(".bn-block-content") ?? target;
  activeHighlight?.cancel();
  // WAAPI avoids DOM mutations for ProseMirror to observe. Scrolling still
  // works without animation support. The next reveal cancels any old pulse.
  activeHighlight = block.animate?.(
    [
      {
        backgroundColor: "var(--bn-scroll-highlight-background)",
        boxShadow: "0 0 0 1px var(--bn-scroll-highlight-border-color)",
        borderRadius: "4px",
        easing: "ease-out",
      },
      {
        backgroundColor: "transparent",
        boxShadow: "0 0 0 1px transparent",
        borderRadius: "4px",
      },
    ],
    { duration: 1500, fill: "none" },
  );
}

let activeHighlight: Animation | undefined;
