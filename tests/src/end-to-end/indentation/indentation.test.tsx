import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { describe, expect } from "vite-plus/test";
import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { userEvent } from "../../utils/context.js";
import {
  H_TWO_BLOCK_SELECTOR,
  NEST_BLOCK_BUTTON_SELECTOR,
  UNNEST_BLOCK_BUTTON_SELECTOR,
} from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";

async function setupIndentationTestContent(setupEditor: SetupEditor) {
  const { editor } = await setupEditor({
    initialContent: [
      {
        id: "0",
        type: "paragraph",
        content: "Paragraph",
        children: ([1, 2, 3] as const).map((level): PartialBlock => ({
          id: String(level),
          type: "heading",
          props: { level },
          content: "Heading",
        })),
      },
    ],
  });
  const [paragraph] = editor.document;
  const [h1, h2, h3] = paragraph.children;
  return { editor, paragraph, h1, h2, h3 };
}

async function selectSecondHeading(
  editor: Awaited<ReturnType<typeof setupIndentationTestContent>>["editor"],
) {
  const heading = await waitForSelector(
    `${H_TWO_BLOCK_SELECTOR} .bn-inline-content`,
  );
  editor.focus();
  document.getSelection()?.selectAllChildren(heading);
  await expect.poll(() => editor.getSelectedText()).toBe("Heading");
}

describe("Check Block Indentation Functionality", () => {
  it("Should be able to increase indentation for single block", async ({
    setupEditor,
  }) => {
    const { editor, paragraph, h1, h2, h3 } =
      await setupIndentationTestContent(setupEditor);
    await selectSecondHeading(editor);

    await userEvent.click(await waitForSelector(NEST_BLOCK_BUTTON_SELECTOR));

    expect(editor.document).toEqual([
      { ...paragraph, children: [{ ...h1, children: [h2] }, h3] },
    ]);
  });
  it("Should be able to decrease indentation for single block", async ({
    setupEditor,
  }) => {
    const { editor, paragraph, h1, h2, h3 } =
      await setupIndentationTestContent(setupEditor);
    await selectSecondHeading(editor);

    await userEvent.click(await waitForSelector(UNNEST_BLOCK_BUTTON_SELECTOR));

    expect(editor.document).toEqual([
      { ...paragraph, children: [h1] },
      { ...h2, children: [h3] },
    ]);
  });
  it("Should be able to increase indentation for multiple blocks", async ({
    setupEditor,
  }) => {
    const { editor, paragraph, h1, h2, h3 } =
      await setupIndentationTestContent(setupEditor);
    // The command acts on a block range; how the selection was made is not
    // under test. Set it directly rather than relying on cross-device clicks.
    editor.focus();
    editor.setSelection(h2, h3);
    expect(editor.getSelection()?.blocks.map((block) => block.id)).toEqual([
      h2.id,
      h3.id,
    ]);

    await userEvent.click(await waitForSelector(NEST_BLOCK_BUTTON_SELECTOR));

    expect(editor.document).toEqual([
      { ...paragraph, children: [{ ...h1, children: [h2, h3] }] },
    ]);
  });
  it("Should be able to decrease indentation for multiple blocks", async ({
    setupEditor,
  }) => {
    const { editor, paragraph, h1, h2, h3 } =
      await setupIndentationTestContent(setupEditor);
    // Seed the block range as in the multi-block indent test. Only the
    // toolbar action, not native range selection, is under test here.
    editor.focus();
    editor.setSelection(h2, h3);
    expect(editor.getSelection()?.blocks.map((block) => block.id)).toEqual([
      h2.id,
      h3.id,
    ]);

    await userEvent.click(await waitForSelector(UNNEST_BLOCK_BUTTON_SELECTOR));

    expect(editor.document).toEqual([{ ...paragraph, children: [h1] }, h2, h3]);
  });
});
