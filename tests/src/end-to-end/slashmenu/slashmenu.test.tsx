import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import {
  BLOCK_CONTAINER_SELECTOR,
  BLOCK_GROUP_SELECTOR,
  BULLET_LIST_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  NUMBERED_LIST_SELECTOR,
} from "../../utils/const.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  matchPageScreenshot,
  sleep,
  waitForSelector,
  waitForSelectorInEditor,
} from "../../utils/editor.js";
import { renderEditor } from "../../utils/render.js";
import { executeSlashCommand, openSlashMenu } from "../../utils/slashmenu.js";

beforeEach(async () => {
  await renderEditor(<App />);
});

describe("Check SlashMenu Functionality", () => {
  test("should show slash menu when / is typed", async () => {
    await focusOnEditor();
    await openSlashMenu();
  });
  test("Should be able to use PageUp/Down to navigate", async () => {
    await focusOnEditor();
    await openSlashMenu();
    await sleep(500);
    await userEvent.keyboard("{PageDown}");
    await matchPageScreenshot("slash_menu_page_down");
    await userEvent.keyboard("{PageUp}");
    await matchPageScreenshot("slash_menu_page_up");
  });
  test("Should be able to create h1", async () => {
    await focusOnEditor();
    await executeSlashCommand("h1");
    await userEvent.keyboard("This is a H1");
    await waitForSelectorInEditor(H_ONE_BLOCK_SELECTOR);
  });
  test("Should be able to create h2", async () => {
    await focusOnEditor();
    await executeSlashCommand("h2");
    await userEvent.keyboard("This is a H2");
    await waitForSelectorInEditor(H_TWO_BLOCK_SELECTOR);
  });
  test("Should be able to create h3", async () => {
    await focusOnEditor();
    await executeSlashCommand("h3");
    await userEvent.keyboard("This is a H3");
    await waitForSelectorInEditor(H_THREE_BLOCK_SELECTOR);
  });
  test("Should be able to create numbered list", async () => {
    await focusOnEditor();
    await executeSlashCommand("numbered");
    await userEvent.keyboard("This is a numbered list");
    await waitForSelectorInEditor(NUMBERED_LIST_SELECTOR);
  });
  test("Should be able to create bullet list", async () => {
    await focusOnEditor();
    await executeSlashCommand("bullet");
    await userEvent.keyboard("This is a bullet list");
    await waitForSelectorInEditor(BULLET_LIST_SELECTOR);
  });
  test("Should be able to create paragraph", async () => {
    await focusOnEditor();
    await executeSlashCommand("paragraph");
    await userEvent.keyboard("This is a Paragraph");
    const block = document.querySelectorAll(BLOCK_CONTAINER_SELECTOR)[0];
    const blockHeadingType = block.getAttribute("data-heading-type");
    expect(blockHeadingType).toBeFalsy();
  });
  test("Should add block as sibling of current block if block has content", async () => {
    await focusOnEditor();
    await executeSlashCommand("h1");
    await userEvent.keyboard("Hello");
    await executeSlashCommand("h2");
    // If done correctly all blocks should be in the same block group
    // resulting in a total of 1 block group.
    const blockGroupCount =
      document.querySelectorAll(BLOCK_GROUP_SELECTOR).length;
    expect(blockGroupCount).toBe(1);
  });
  test("Should add new block after current blocks children", async () => {
    // BLOCK_A /(create Block_C)
    //        BLOCK_B
    //
    // When adding a new block after Block_A, it should be added
    // As a sibling of Block_A, beneath it
    //
    // BLOCK_A
    //        BLOCK_B
    // BLOCK_C
    await focusOnEditor();
    await userEvent.keyboard("A");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await userEvent.keyboard("B");
    await userEvent.keyboard("{ArrowUp}");
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
  test("Should be able to create complex documents that match snapshots", async () => {
    await focusOnEditor();
    await executeSlashCommand("h1");
    await userEvent.keyboard("This is a h1");
    await executeSlashCommand("h2");
    await userEvent.keyboard("This is a h2");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Tab}");
    await executeSlashCommand("h3");
    await userEvent.keyboard("This is a h3");
    await executeSlashCommand("paragraph");
    await userEvent.keyboard("This is a paragraph");
    await userEvent.keyboard("{Tab}");
    await userEvent.keyboard("{ArrowUp}");
    await executeSlashCommand("numbered");
    await userEvent.keyboard("This is");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("a numbered list");
    await executeSlashCommand("bullet");
    await userEvent.keyboard("And this is a bullet list");
    await sleep(1000);
    // Compare doc object snapshot
    await compareDocToSnapshot("docStructureSnapshot");
    // Compare editor screenshot
    await matchPageScreenshot("slash_menu_end_product");
  });
});
