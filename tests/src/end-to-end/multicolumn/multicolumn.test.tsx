import App from "@examples/01-basic/03-multi-column/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { MOD, page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  waitForSelector,
} from "../../utils/editor.js";
import { clickAt, getRect } from "../../utils/mouse.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Multi-Column Behaviour", () => {
  test("Check Delete before column", async () => {
    await focusOnEditor();

    const target = page
      .getByText("You can have multiple blocks in a column too")
      .element();
    const targetRect = getRect(target);
    await clickAt(targetRect.x + 1, targetRect.y + 1);
    await userEvent.keyboard("{ArrowLeft}");

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteBeforeColumn");
  });
  test("Check Delete before column with single block", async () => {
    await focusOnEditor();

    await userEvent.click(await waitForSelector(".bn-block-column"));

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteBeforeColumnWithSingleBlock");
  });
  test("Check Delete before column list", async () => {
    await focusOnEditor();

    await userEvent.click(await waitForSelector(".bn-block-content"));

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteBeforeColumnList");
  });
  test("Check Delete end of column list", async () => {
    await focusOnEditor();

    await userEvent.click(await waitForSelector(".bn-trailing-block"));
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{ArrowLeft}{/${MOD}}`);
    await userEvent.keyboard("{ArrowLeft}");

    await userEvent.keyboard("{Delete}");

    await compareDocToSnapshot("deleteEndOfColumnList");
  });
});
