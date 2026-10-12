import { defaultSchemaDocument } from "../../../../tests/a11y/documents.js";
import { expect, test } from "../../../../tests/a11y/test.js";
import {
  openEditor,
  checkAxe,
  pressKey,
  readSelection,
  saveTranscript,
} from "../../../../tests/a11y/helpers.js";

test.afterEach(async ({ screenReader }) => {
  await saveTranscript(screenReader);
});

test("default schema: axe and arrow-key document navigation", async ({
  page,
  screenReader,
}) => {
  await openEditor(page, defaultSchemaDocument, screenReader);
  await checkAxe(page);
  await pressKey(page, "Tab", screenReader);
  await expect(page.locator(".bn-editor")).toBeFocused();

  // Bound the traversal so a keyboard trap produces a useful failure instead
  // of an infinite loop. Selection endpoints prove the arrows actually moved.
  const visitedTableCells = new Set<string>();
  for (
    let step = 0;
    step < 120 && (await readSelection(page)).blockId !== "end";
    step++
  ) {
    const { tableCell } = await readSelection(page);
    if (tableCell) {
      visitedTableCells.add(`${tableCell.row},${tableCell.column}`);
    }
    // ArrowDown alone skips columns. Move through cell text and across each
    // row with ArrowRight, then resume ArrowDown from the final cell.
    await pressKey(
      page,
      tableCell && visitedTableCells.size < 4 ? "ArrowRight" : "ArrowDown",
      screenReader,
    );
  }
  expect([...visitedTableCells].sort(), "Every table cell is visited").toEqual([
    "0,0",
    "0,1",
    "1,0",
    "1,1",
  ]);
  expect(
    (await readSelection(page)).blockId,
    "Arrow keys reach the final block",
  ).toBe("end");

  for (
    let step = 0;
    step < 120 && (await readSelection(page)).blockId !== "start";
    step++
  ) {
    await pressKey(page, "ArrowUp", screenReader);
  }
  expect(
    (await readSelection(page)).blockId,
    "ArrowUp returns to the first block",
  ).toBe("start");
});

test.fixme("keyboard selection includes an entire block", async () => {
  // TODO: Whole-block keyboard selection is not currently available.
  // Once implemented, select a block using only the keyboard and assert the
  // block selection (not just its text), leaving neighbouring blocks unselected.
  // Verify the visible selection and screen-reader announcement. The keyboard
  // interaction remains unspecified until the product behavior is designed.
});

test.fixme("keyboard selection includes the entire editor", async () => {
  // TODO: Whole-editor keyboard selection is not currently available.
  // Once implemented, select all editor content using only the keyboard,
  // including non-text blocks, without selecting surrounding page controls.
  // Verify the selection boundaries, visible selection and announcement.
  // Do not assume a shortcut before the product interaction is defined.
});

test.fixme("keyboard focus can enter and leave the editor in both directions", async () => {
  // TODO: There is currently no easy keyboard escape from the editor.
  // Once the interaction is designed, navigate from Before editor into the
  // editor (including interactive blocks), escape to After editor, and repeat
  // in reverse. Assert focus at each boundary and capture its visible indicator.
  // Do not choose an escape shortcut here before the product behavior exists.
});

// Screenshots need human review for clipping/overlap before accepting a
// baseline; matching an existing image alone does not prove accessibility.
test.describe("text spacing and resizing", () => {
  test.skip(
    ({ headless }) => !headless,
    "Visual baselines are generated and compared only in Linux/Docker.",
  );

  test("default schema remains readable with text spacing overrides", async ({
    page,
  }) => {
    await openEditor(page, defaultSchemaDocument);
    // WCAG 1.4.12: override spacing without changing any other style property.
    // https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
    await page.addStyleTag({
      content: `
      .bn-editor, .bn-editor * {
        line-height: 1.5 !important;
        letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important;
      }
      .bn-editor p { margin-block-end: 2em !important; }
    `,
    });
    await expect(page).toHaveScreenshot("default-schema-text-spacing.png", {
      fullPage: true,
      animations: "disabled",
      // Native media controls can vary by a few pixels between runs.
      maxDiffPixels: 10,
    });
  });

  test("default schema remains readable at 200% text size", async ({
    page,
  }) => {
    await openEditor(page, defaultSchemaDocument);
    const editor = page.locator(".bn-editor");
    const paragraph = editor.locator("p").first();
    const fontSize = await paragraph.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );

    // WCAG 1.4.4: resize text to 200%, without scaling its containers/images.
    // Read every original size first so inherited sizes aren't doubled twice.
    // https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
    await editor.evaluate((element) => {
      const sizes = [element, ...element.querySelectorAll("*")]
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .map((node) => ({
          node,
          size: Number.parseFloat(getComputedStyle(node).fontSize),
        }));
      for (const { node, size } of sizes) {
        node.style.setProperty("font-size", `${size * 2}px`, "important");
      }
    });
    await expect(paragraph).toHaveCSS("font-size", `${fontSize * 2}px`);
    await expect(page).toHaveScreenshot(
      "default-schema-text-size-200-percent.png",
      {
        fullPage: true,
        animations: "disabled",
        // Native media controls can vary by a few pixels between runs.
        maxDiffPixels: 10,
      },
    );
  });
});
