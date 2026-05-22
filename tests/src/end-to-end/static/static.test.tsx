import BasicBlocksApp from "@examples/01-basic/04-default-blocks/src/App";
import BasicBlocksStaticApp from "@examples/05-interoperability/10-static-html-render/src/App";
import StaticApp from "@examples/02-backend/04-rendering-static-documents/src/App";
import { describe, test } from "vite-plus/test";
import { matchPageScreenshot, sleep } from "../../utils/editor.js";
import { renderEditor } from "../../utils/render.js";

describe("Check static rendering", () => {
  test("Check static rendering", async () => {
    await renderEditor(<StaticApp />);
    await sleep(500);
    await matchPageScreenshot("static-rendering");
  });

  test("Check static rendering visually matches live editor", async () => {
    const liveEditor = await renderEditor(<BasicBlocksApp />);
    // Hide the trailing block widget so the live editor's page height matches
    // the static export, which doesn't render it.
    const style = document.createElement("style");
    style.textContent = ".bn-trailing-block { display: none !important; }";
    document.head.appendChild(style);
    await sleep(500);

    // NOTE: the original Playwright test masked video/audio/checkbox/toggle
    // elements and allowed a 200px diff (placehold.co renders the caption's
    // '×' vs 'x' inconsistently). The shared `matchPageScreenshot` util doesn't
    // expose mask/maxDiffPixels options, so those allowances aren't applied
    // here — flag for review if this snapshot proves flaky.
    await matchPageScreenshot("static-rendering-equality");

    liveEditor.unmount();
    style.remove();

    await renderEditor(<BasicBlocksStaticApp />);
    await sleep(500);
    await matchPageScreenshot("static-rendering-equality");
  });
});
