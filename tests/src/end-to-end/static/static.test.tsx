import BasicBlocksApp from "@examples/01-basic/04-default-blocks/src/App";
import BasicBlocksStaticApp from "@examples/05-interoperability/10-static-html-render/src/App";
import StaticApp from "@examples/02-backend/04-rendering-static-documents/src/App";
import { describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { page } from "../../utils/context.js";
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
  // Heavy (two full editors + two full-page screenshots), and Firefox is slow,
  // so under 3-browser-in-one-container contention even 60s is tight — 90s.
  test(
    "Check static rendering visually matches live editor",
    { timeout: 90000 },
    async () => {
      // Screenshots the whole page against the shared baseline. Mirrors the
      // options the original Playwright test used:
      // - Mask the regions that legitimately differ between the live editor and
      //   the static export, or that aren't deterministic across runs. <video>/
      //   <audio> render differently as they load (and the amount loaded varies
      //   per run); checkboxes and toggle buttons are interactive widgets in the
      //   live editor but plain markup in the export. The `mask` option only
      //   accepts vitest Locators (NOT raw DOM elements — passing elements
      //   silently masks nothing), so each matched element is wrapped with
      //   `page.elementLocator`. Resolved at call time to pick up whichever of
      //   these elements the current render produced.
      //   https://vitest.dev/guide/browser/visual-regression-testing.html#handle-dynamic-content
      // - `allowedMismatchedPixels` is vite-plus's pixelmatch equivalent of
      //   Playwright's `maxDiffPixels`: a small allowance for the image caption
      //   text, which renders slightly differently (e.g. '×' vs 'x').
      const masks = () =>
        ["video", "audio", 'input[type="checkbox"]', ".bn-toggle-button"]
          .flatMap((sel) => [...document.querySelectorAll(sel)])
          .map((el) => page.elementLocator(el));
      const matchEquality = () =>
        expectElement(document.body).toMatchScreenshot(
          "static-rendering-equality",
          {
            comparatorOptions: { allowedMismatchedPixels: 200 },
            screenshotOptions: { scale: "css", mask: masks() },
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

      // This document is taller than the suite-wide 1280x720 iframe. The matcher
      // captures the `document.body` element box (it can't `fullPage`
      // scroll-and-stitch), and a fixed-height iframe never paints what's below
      // its fold — so grow the iframe past the whole document first. No restore
      // is needed: every test file's `beforeAll` resets the iframe to 1280x720.
      //
      // The height is a FIXED constant (comfortably taller than the document),
      // NOT the measured `scrollHeight`: the latter drifts a few px between
      // runs/renders on Firefox, and since the capture is downscaled (below)
      // that drift changes the output dimensions and fails the dimension check.
      //
      // NB: the browser *window* stays 1280x720 (a taller window breaks
      // Firefox's native `<select>` handling — see customblocks), so the capture
      // of the now-taller iframe is downscaled to fit the window. The whole page
      // is captured, but the baseline is smaller than 1280xH (not 1:1).
      // Full-resolution would require running these tests in a separate
      // tall-window browser project.
      const PAGE_HEIGHT = 1800;
      await page.viewport(1280, PAGE_HEIGHT);
      await sleep(200);

      await matchEquality();

      // Await the unmount: `render`/`unmount` run inside `act()`, and starting
      // the next render before the unmount settles triggers React's
      // "overlapping act() calls" warning and leaves a pending act promise that
      // hangs the test.
      await liveEditor.unmount();
      style.remove();

      await render(<BasicBlocksStaticApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await page.viewport(1280, PAGE_HEIGHT);
      await sleep(500);
      await matchEquality();
    },
  );
});
