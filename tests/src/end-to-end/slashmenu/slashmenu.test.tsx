import "@blocknote/core/fonts/inter.css";
import { SuggestionMenuController } from "@blocknote/react";
import { describe, expect } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import {
  BLOCK_CONTAINER_SELECTOR,
  BLOCK_GROUP_SELECTOR,
  BULLET_LIST_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  NUMBERED_LIST_SELECTOR,
  SLASH_MENU_SELECTOR,
} from "../../utils/const.js";
import {
  expectElement,
  focusOnEditor,
  waitForSelector,
  waitForSelectorDetached,
  waitForSelectorInEditor,
  waitForTextInEditor,
} from "../../utils/editor.js";
import { executeSlashCommand, openSlashMenu } from "../../utils/slashmenu.js";

describe("Check SlashMenu Functionality", () => {
  it("should show slash menu when / is typed", async ({ setupEditor }) => {
    await setupEditor();
    await focusOnEditor();
    await openSlashMenu();
  });
  it("Should be able to use PageUp/Down to navigate", async ({
    setupEditor,
  }) => {
    await setupEditor();
    await focusOnEditor();
    await openSlashMenu();
    await document.fonts.ready;
    const items = document.querySelectorAll(
      `${SLASH_MENU_SELECTOR} [role="option"]`,
    );
    await userEvent.keyboard("{PageDown}");
    await expect
      .poll(() => items[items.length - 1].getAttribute("aria-selected"))
      .toBe("true");
    await expectElement(document.body).toMatchScreenshot(
      "slash_menu_page_down",
    );
    await userEvent.keyboard("{PageUp}");
    await expect
      .poll(() => items[0].getAttribute("aria-selected"))
      .toBe("true");
    await expectElement(document.body).toMatchScreenshot("slash_menu_page_up");
  });
  it("Should be able to create h1", async ({ setupEditor }) => {
    await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("h1");
    await userEvent.keyboard("This is a H1");
    await waitForSelectorInEditor(H_ONE_BLOCK_SELECTOR);
  });
  it("Should be able to create h2", async ({ setupEditor }) => {
    await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("h2");
    await userEvent.keyboard("This is a H2");
    await waitForSelectorInEditor(H_TWO_BLOCK_SELECTOR);
  });
  it("Should be able to create h3", async ({ setupEditor }) => {
    await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("h3");
    await userEvent.keyboard("This is a H3");
    await waitForSelectorInEditor(H_THREE_BLOCK_SELECTOR);
  });
  it("Should be able to create numbered list", async ({ setupEditor }) => {
    await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("numbered");
    await userEvent.keyboard("This is a numbered list");
    await waitForSelectorInEditor(NUMBERED_LIST_SELECTOR);
  });
  it("Should be able to create bullet list", async ({ setupEditor }) => {
    await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("bullet");
    await userEvent.keyboard("This is a bullet list");
    await waitForSelectorInEditor(BULLET_LIST_SELECTOR);
  });
  it("Should be able to create paragraph", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await executeSlashCommand("paragraph");
    await userEvent.keyboard("This is a Paragraph");
    expect(editor.document).toMatchObject([
      { type: "paragraph", content: text("This is a Paragraph"), children: [] },
    ]);
  });
  it("Should be able to create complex documents that match snapshots", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      props: { slashMenu: false },
      children: (
        <SuggestionMenuController
          triggerCharacter="/"
          shouldOpen={(state) =>
            !state.selection.$from.parent.type.isInGroup("tableContent")
          }
          floatingUIOptions={{
            useTransitionStylesProps: { duration: 0 },
            useTransitionStatusProps: { duration: 0 },
          }}
        />
      ),
    });
    await focusOnEditor();
    await executeSlashCommand("h1");
    await userEvent.keyboard("This is a h1");
    await executeSlashCommand("h2");
    await userEvent.keyboard("This is a h2{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("h3");
    await userEvent.keyboard("This is a h3");
    await executeSlashCommand("paragraph");
    await userEvent.keyboard("This is a paragraph{Tab}");
    await userEvent.keyboard("{ArrowUp}");
    await executeSlashCommand("numbered");
    await userEvent.keyboard("This is{Enter}a numbered list");
    await executeSlashCommand("bullet");
    await userEvent.keyboard("And this is a bullet list");
    await waitForTextInEditor("And this is a bullet list");
    await waitForSelectorDetached(SLASH_MENU_SELECTOR);
    await document.fonts.ready;
    expect(editor.document).toMatchObject([
      {
        type: "heading",
        props: { level: 1 },
        content: text("This is a h1"),
        children: [],
      },
      {
        type: "heading",
        props: { level: 2 },
        content: text("This is a h2"),
        children: [
          {
            type: "heading",
            props: { level: 3 },
            content: text("This is a h3"),
            children: [
              {
                type: "paragraph",
                content: text("This is a paragraph"),
                children: [],
              },
            ],
          },
          { type: "numberedListItem", content: text("This is"), children: [] },
          {
            type: "numberedListItem",
            content: text("a numbered list"),
            children: [],
          },
          {
            type: "bulletListItem",
            content: text("And this is a bullet list"),
            children: [],
          },
        ],
      },
    ]);
    // Compare editor screenshot
    await expectElement(document.body).toMatchScreenshot(
      "slash_menu_end_product",
    );
  });
});

function text(text: string) {
  return [{ type: "text", text, styles: {} }];
}

describe("Slash command placement", () => {
  it("Should add block as sibling of current block if block has content", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        {
          id: "heading",
          type: "heading",
          props: { level: 1 },
          content: "Hello",
        },
      ],
      trailingBlock: false,
    });
    editor.setTextCursorPosition("heading", "end");
    editor.focus();
    await executeSlashCommand("h2");
    expect(editor.document.map((block) => block.type)).toEqual([
      "heading",
      "heading",
    ]);
    // If done correctly all blocks should be in the same block group
    // resulting in a total of 1 block group.
    const blockGroupCount =
      document.querySelectorAll(BLOCK_GROUP_SELECTOR).length;
    expect(blockGroupCount).toBe(1);
  });
  it("Should add new block after current blocks children", async ({
    setupEditor,
  }) => {
    // BLOCK_A /(create Block_C)
    //        BLOCK_B
    //
    // When adding a new block after Block_A, it should be added
    // As a sibling of Block_A, beneath it
    //
    // BLOCK_A
    //        BLOCK_B
    // BLOCK_C
    const { editor } = await setupEditor({
      initialContent: [
        {
          id: "parent",
          type: "paragraph",
          content: "A",
          children: [{ id: "child", type: "paragraph", content: "B" }],
        },
      ],
      trailingBlock: false,
    });
    editor.setTextCursorPosition("parent", "end");
    editor.focus();
    await executeSlashCommand("h1");
    await waitForSelector(H_ONE_BLOCK_SELECTOR);
    // If done correctly there should be a total on 2 block groups
    // a total of 3 blocks and the 3rd block should have no blockgroup
    // and BLOCK_A should have one child
    const blockGroupCount =
      document.querySelectorAll(BLOCK_GROUP_SELECTOR).length;
    expect(blockGroupCount).toBe(2);
    const blockCount = document.querySelectorAll(
      BLOCK_CONTAINER_SELECTOR,
    ).length;
    expect(blockCount).toBe(3);
    const thirdBlock = document.querySelectorAll(BLOCK_CONTAINER_SELECTOR)[2];
    expect(thirdBlock.querySelector(BLOCK_GROUP_SELECTOR)).toBeNull();
    const firstBlock = document.querySelectorAll(BLOCK_CONTAINER_SELECTOR)[0];
    const firstBlockChildren = firstBlock.querySelectorAll(
      BLOCK_CONTAINER_SELECTOR,
    ).length;
    expect(firstBlockChildren).toBe(1);
  });
});
