import BasicBlocksApp from "@examples/01-basic/04-default-blocks/src/App";
import BasicBlocksStaticApp from "@examples/05-interoperability/10-static-html-render/src/App";
import StaticApp from "@examples/02-backend/04-rendering-static-documents/src/App";
import { describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { expectElement, sleep, waitForSelector } from "../../utils/editor.js";

describe("Check static rendering", () => {
  test("Check static rendering", async () => {
    await render(<StaticApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("static-rendering");
  });

  // Renders two editors back-to-back and screenshots each against the same
  // baseline, asserting the static HTML export looks like the live editor.
  // Heavy enough that even the suite-wide 30s testTimeout is tight when 3
  // browsers contend in one Docker container — bump to 60s to absorb that.
  test(
    "Check static rendering visually matches live editor",
    { timeout: 60000 },
    async () => {
      // Screenshots the page body against the shared baseline. Mirrors the
      // options the original Playwright test used:
      // - Mask the regions that legitimately differ between the live editor and
      //   the static export, or that aren't deterministic across runs. <video>/
      //   <audio> render differently as they load (and the amount loaded varies
      //   per run) — unmasked, their per-frame changes also keep the page from
      //   ever stabilising, which hangs the screenshot matcher. Checkboxes and
      //   toggle buttons are interactive widgets in the live editor but plain
      //   markup in the export. Masks are resolved at call time so they pick up
      //   whichever of these elements the current render produced.
      // - `allowedMismatchedPixels` is vite-plus's pixelmatch equivalent of
      //   Playwright's `maxDiffPixels`: a small allowance for the image caption
      //   text, which renders slightly differently (e.g. '×' vs 'x').
      const matchEquality = () =>
        expectElement(document.body).toMatchScreenshot(
          "static-rendering-equality",
          {
            comparatorOptions: { allowedMismatchedPixels: 200 },
            screenshotOptions: {
              scale: "css",
              mask: [
                ...document.querySelectorAll("video"),
                ...document.querySelectorAll("audio"),
                ...document.querySelectorAll('input[type="checkbox"]'),
                ...document.querySelectorAll(".bn-toggle-button"),
              ],
            },
          },
        );

      const liveEditor = await render(<BasicBlocksApp />);
      await waitForSelector(EDITOR_SELECTOR);
      // Hide the trailing block widget so the live editor's page height matches
      // the static export, which doesn't render it.
      const style = document.createElement("style");
      style.textContent = ".bn-trailing-block { display: none !important; }";
      document.head.appendChild(style);
      await sleep(500);

      await matchEquality();

      // Await the unmount: `render`/`unmount` run inside `act()`, and starting
      // the next render before the unmount settles triggers React's
      // "overlapping act() calls" warning and leaves a pending act promise that
      // hangs the test.
      await liveEditor.unmount();
      style.remove();

      await render(<BasicBlocksStaticApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await sleep(500);
      await matchEquality();
    },
  );
});
