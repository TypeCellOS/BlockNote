import { aroundAll } from "vite-plus/test";

/** Installs a test-owned stylesheet for the suite that registers it. */
export function useBrowserSuiteStyles(css: string) {
  const head = document.head;
  // Keep the position where the side-effect CSS import used to append its
  // stylesheet, before any styles that setup adds when the suite starts.
  const previous = head.lastChild;

  aroundAll(async (runSuite) => {
    const style = document.createElement("style");
    style.textContent = css;
    head.insertBefore(
      style,
      previous === null
        ? head.firstChild
        : previous.parentNode === head
          ? previous.nextSibling
          : null,
    );
    try {
      await runSuite();
    } finally {
      style.remove();
    }
  });
}
