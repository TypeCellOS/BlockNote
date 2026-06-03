import AdvancedTablesApp from "@examples/03-ui-components/15-advanced-tables/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR, TABLE_SELECTOR } from "../../utils/const.js";
import { expectElement, sleep, waitForSelector } from "../../utils/editor.js";

// The advanced-tables example seeds a table with coloured cells (red/yellow/
// gray backgrounds, blue/purple text), which is exactly what this screenshot
// guards. It lives in its own file so it can mount that example directly via a
// single render() in beforeEach — re-rendering a second app inside a test that
// already rendered the default app in beforeEach is racy and paints blank.
beforeEach(async () => {
  await render(<AdvancedTablesApp />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check advanced table rendering", () => {
  test("Should render table cell colors", async () => {
    await waitForSelector(TABLE_SELECTOR);
    // Let the editor view finish painting the seeded cell colours before the
    // screenshot (the view mounts asynchronously after render()).
    await sleep(500);

    await expectElement(document.body).toMatchScreenshot("tableCellColors");
  });
});
