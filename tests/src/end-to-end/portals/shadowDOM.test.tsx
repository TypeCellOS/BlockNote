import App from "@examples/01-basic/15-shadowdom/src/App";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import reactCss from "../../../../packages/react/src/editor/styles.css?inline";
import { page } from "../../utils/context.js";
import { expectElement } from "../../utils/editor.js";

// Force the mobile path without depending on a real on-screen keyboard. Keep
// the example, Mantine toolbar, portal placement and shadow-scoped CSS real.
vi.mock(
  "../../../../packages/react/src/components/FormattingToolbar/useVirtualKeyboard.js",
  () => ({ useVirtualKeyboard: () => true }),
);
vi.mock("@blocknote/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@blocknote/core")>()),
  isTouchDevice: () => true,
}));

afterEach(() => {
  document.documentElement.style.removeProperty("--bn-vv-height");
});

// Regression for #3304: mounting the toolbar in body loses the example's CSS.
test("mobile toolbar retains the Shadow DOM example's scoped styles", async () => {
  await page.viewport(393, 400);
  document.documentElement.style.setProperty("--bn-vv-height", "400px");
  const screen = await render(<App />);
  screen.container.style.minHeight = "calc(100vh - 16px)";
  const host = screen.container.firstElementChild;
  await vi.waitFor(() => expect(host?.shadowRoot).not.toBeNull());
  const root = host!.shadowRoot!;
  // Browser tests resolve packages to source, where react/style.css is an
  // empty build placeholder. Supply its real contents, still shadow-scoped.
  const style = document.createElement("style");
  style.textContent = reactCss;
  root.prepend(style);
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
