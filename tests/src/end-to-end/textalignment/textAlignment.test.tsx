import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { describe, expect } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import { ALIGN_TEXT_RIGHT_BUTTON_SELECTOR } from "../../utils/const.js";
import {
  expectElement,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";

describe("Check Text Alignment Functionality", () => {
  it.for([
    {
      name: "single block",
      aligned: ["h2"],
      screenshot: "alignTextSingleBlock",
    },
    {
      name: "multiple blocks",
      aligned: ["h1", "h2"],
      screenshot: "alignTextMultipleBlocks",
    },
  ])(
    "Should be able to set text alignment on $name",
    async ({ aligned, screenshot }, { setupEditor }) => {
      const { editor } = await setupEditor({
        initialContent: ([1, 2, 3] as const).map((level): PartialBlock => ({
          id: `h${level}`,
          type: "heading",
          props: { level },
          content: "Heading",
        })),
      });
      editor.focus();
      if (aligned.length === 1) {
        const heading = await waitForSelector(
          '[data-id="h2"] .bn-inline-content',
        );
        document.getSelection()?.selectAllChildren(heading);
        await expect.poll(() => editor.getSelectedText()).toBe("Heading");
      } else {
        editor.setSelection("h1", "h2");
      }

      await userEvent.click(
        await waitForSelector(ALIGN_TEXT_RIGHT_BUTTON_SELECTOR),
      );
      expect(
        editor.document
          .filter(
            (block) =>
              block.type === "heading" && block.props.textAlignment === "right",
          )
          .map((block) => block.id),
      ).toEqual(aligned);
      editor.focus();
      editor.setTextCursorPosition("h2");
      await waitForSelectorDetached(ALIGN_TEXT_RIGHT_BUTTON_SELECTOR);
      await expect.poll(() => document.getSelection()?.isCollapsed).toBe(true);

      await expectElement(document.body).toMatchScreenshot(screenshot);
    },
  );
});
