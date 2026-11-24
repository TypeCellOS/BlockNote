import App from "@examples/01-basic/15-shadowdom/src/App";
import { expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { FormattingToolbarInputContext } from "../../../../packages/react/src/components/FormattingToolbar/FormattingToolbarInputContext.js";
import reactCss from "../../../../packages/react/src/editor/styles.css?inline";
import { installBrowserNoMotion } from "../../commands/browser/installBrowserTestStyles.js";
import { page } from "../../utils/context.js";
import { expectElement } from "../../utils/editor.js";

// Regression for #3304: mounting the toolbar in body loses the example's CSS.
test("mobile toolbar retains the Shadow DOM example's scoped styles", async ({
  onTestFinished,
}) => {
  const { innerWidth, innerHeight } = window;
  onTestFinished(() => page.viewport(innerWidth, innerHeight));
  await page.viewport(393, 400);
  const documentStyle = document.documentElement.style;
  const viewportHeight = "--bn-vv-height";
  const previousHeight = documentStyle.getPropertyValue(viewportHeight);
  const previousPriority = documentStyle.getPropertyPriority(viewportHeight);
  documentStyle.setProperty(viewportHeight, "400px");
  onTestFinished(() => {
    if (previousHeight === "") {
      documentStyle.removeProperty(viewportHeight);
    } else {
      documentStyle.setProperty(
        viewportHeight,
        previousHeight,
        previousPriority,
      );
    }
  });
  // Only the example tree sees the open touch keyboard; its default Mantine
  // toolbar and shadow-scoped styles still render through the normal path.
  const screen = await render(
    <FormattingToolbarInputContext.Provider
      value={{ isTouchDevice: true, keyboardOpen: true }}
    >
      <App />
    </FormattingToolbarInputContext.Provider>,
  );
  screen.container.style.minHeight = "calc(100vh - 16px)";
  const host = screen.container.firstElementChild;
  await vi.waitFor(() => expect(host?.shadowRoot).not.toBeNull());
  const root = host!.shadowRoot!;
  // Browser tests resolve packages to source, where react/style.css is an
  // empty build placeholder. Supply its real contents, still shadow-scoped.
  const style = document.createElement("style");
  style.textContent = reactCss;
  root.prepend(style);
  onTestFinished(() => style.remove());
  onTestFinished(installBrowserNoMotion(root));
  await vi.waitFor(() => {
    const editor = root.querySelector<HTMLElement>(".bn-editor");
    expect(editor).not.toBeNull();
    editor!.focus();
  });

  await vi.waitFor(() =>
    expect(root.querySelector(".bn-mobile-formatting-toolbar")).not.toBeNull(),
  );
  await document.fonts.ready;
  // Capture the viewport, including the fixed toolbar. Vitest's generated
  // element selectors do not reliably distinguish siblings inside a shadow root.
  await expectElement(document.documentElement).toMatchScreenshot(
    "shadow-dom-mobile-toolbar",
  );
});
