import { defaultSchemaDocument } from "../../../../tests/a11y/documents.js";
import { expect, test, afterEach } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { screenshotFull } from "../../../../tests/src/utils/screenshotFull.js";
import {
  openEditor,
  checkAxe,
  pressKey,
  readSelection,
  saveTranscript,
  screenReader,
} from "../../../../tests/a11y/helpers.js";

afterEach(async () => {
  await saveTranscript();
});

test("default schema: axe and arrow-key document navigation", async () => {
  await openEditor(defaultSchemaDocument);
  await checkAxe();
  await pressKey("Tab");
  await expect.element(page.getByRole("textbox")).toHaveFocus();

  // Bound the traversal so a keyboard trap produces a useful failure instead
  // of an infinite loop. Selection endpoints prove the arrows actually moved.
  const visitedTableCells = new Set<string>();
  for (let step = 0; step < 120 && readSelection().blockId !== "end"; step++) {
    const { tableCell } = readSelection();
    if (tableCell) {
      visitedTableCells.add(`${tableCell.row},${tableCell.column}`);
    }
    // ArrowDown alone skips columns. Move through cell text and across each
    // row with ArrowRight, then resume ArrowDown from the final cell.
    await pressKey(
      tableCell && visitedTableCells.size < 4 ? "ArrowRight" : "ArrowDown",
    );
  }
  expect([...visitedTableCells].sort(), "Every table cell is visited").toEqual([
    "0,0",
    "0,1",
    "1,0",
    "1,1",
  ]);
  expect(readSelection().blockId, "Arrow keys reach the final block").toBe(
    "end",
  );

  for (
    let step = 0;
    step < 120 && readSelection().blockId !== "start";
    step++
  ) {
    await pressKey("ArrowUp");
  }
  expect(readSelection().blockId, "ArrowUp returns to the first block").toBe(
    "start",
  );
});

test.skip("keyboard selection includes an entire block", async () => {
  // TODO: Whole-block keyboard selection is not currently available.
  // Once implemented, select a block using only the keyboard and assert the
  // block selection (not just its text), leaving neighbouring blocks unselected.
  // Verify the visible selection and screen-reader announcement. The keyboard
  // interaction remains unspecified until the product behavior is designed.
});

test.skip("keyboard selection includes the entire editor", async () => {
  // TODO: Whole-editor keyboard selection is not currently available.
  // Once implemented, select all editor content using only the keyboard,
  // including non-text blocks, without selecting surrounding page controls.
  // Verify the selection boundaries, visible selection and announcement.
  // Do not assume a shortcut before the product interaction is defined.
});

test.skip("keyboard focus can enter and leave the editor in both directions", async () => {
  // TODO: There is currently no easy keyboard escape from the editor.
  // Once the interaction is designed, navigate from Before editor into the
  // editor (including interactive blocks), escape to After editor, and repeat
  // in reverse. Assert focus at each boundary and capture its visible indicator.
  // Do not choose an escape shortcut here before the product behavior exists.
});

// Screenshots need human review for clipping/overlap before accepting a
// baseline; matching an existing image alone does not prove accessibility.
async function waitForMedia() {
  // Capture the loaded controls and first video frame, not loading animations.
  for (const media of document.querySelectorAll("audio, video")) {
    if (media instanceof HTMLMediaElement) {
      media.preload = "auto";
      media.load();
      await expect.poll(() => media.readyState).toBeGreaterThanOrEqual(2);
    }
  }
}

test.describe.skipIf(screenReader)("text spacing and resizing", () => {
  test("default schema remains readable with text spacing overrides", async () => {
    await openEditor(defaultSchemaDocument);
    await waitForMedia();
    // WCAG 1.4.12: override spacing without changing any other style property.
    // https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
    const style = document.createElement("style");
    style.textContent = `
      .bn-editor, .bn-editor * {
        line-height: 1.5 !important;
        letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important;
      }
      .bn-editor p { margin-block-end: 2em !important; }
    `;
    page.getByRole("main").element().append(style);
    await screenshotFull(document.body, "default-schema-text-spacing.png", {
      comparatorOptions: { allowedMismatchedPixels: 10 },
    });
  });

  test("default schema remains readable at 200% text size", async () => {
    await openEditor(defaultSchemaDocument);
    await waitForMedia();
    const editor = page.getByRole("textbox").element();
    const paragraph = editor.querySelector("p")!;
    const fontSize = Number.parseFloat(getComputedStyle(paragraph).fontSize);

    // WCAG 1.4.4: resize text to 200%, without scaling its containers/images.
    // Read every original size first so inherited sizes aren't doubled twice.
    // https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
    const sizes = [editor, ...editor.querySelectorAll("*")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => ({
        node,
        size: Number.parseFloat(getComputedStyle(node).fontSize),
      }));
    // Use a stylesheet: changing contenteditable DOM attributes directly makes
    // ProseMirror reconcile the mutations and replace the affected nodes.
    const style = document.createElement("style");
    style.textContent = sizes
      .map(({ node, size }) => {
        const path: string[] = [];
        for (let child = node; child !== editor; child = child.parentElement!) {
          const siblings = Array.from(child.parentElement!.children);
          path.unshift(`> :nth-child(${siblings.indexOf(child) + 1})`);
        }
        return `.bn-editor ${path.join(" ")} { font-size: ${size * 2}px !important; }`;
      })
      .join("\n");
    page.getByRole("main").element().append(style);
    await expect
      .poll(() => getComputedStyle(paragraph).fontSize)
      .toBe(`${fontSize * 2}px`);
    await screenshotFull(
      document.body,
      "default-schema-text-size-200-percent.png",
      {
        comparatorOptions: { allowedMismatchedPixels: 10 },
      },
    );
  });
});
