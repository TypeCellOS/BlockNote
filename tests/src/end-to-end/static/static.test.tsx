import BasicBlocksApp from "@examples/01-basic/04-default-blocks/src/App";
import BasicBlocksStaticApp from "@examples/05-interoperability/10-static-html-render/src/App";
import StaticApp from "@examples/02-backend/04-rendering-static-documents/src/App";
import { describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { expectElement, sleep, waitForSelector } from "../../utils/editor.js";

describe("Check static rendering", () => {
  test("Check static rendering", async () => {
    render(<StaticApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("static-rendering");
  });

  // Renders two editors back-to-back and screenshots each. Heavy enough that
  // even the suite-wide 30s testTimeout is tight when 3 browsers contend in
  // one Docker container — bump to 60s to absorb the contention.
  test(
    "Check static rendering visually matches live editor",
    { timeout: 60000 },
    async () => {
      const liveEditor = await render(<BasicBlocksApp />);
      await waitForSelector(EDITOR_SELECTOR);
      // Hide the trailing block widget so the live editor's page height matches
      // the static export, which doesn't render it.
      const style = document.createElement("style");
      style.textContent = ".bn-trailing-block { display: none !important; }";
      document.head.appendChild(style);
      await sleep(500);

      await expectElement(document.body).toMatchScreenshot(
        "static-rendering-equality",
      );

      liveEditor.unmount();
      style.remove();

      render(<BasicBlocksStaticApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await sleep(500);
      await expectElement(document.body).toMatchScreenshot(
        "static-rendering-equality",
      );
    },
  );
});
