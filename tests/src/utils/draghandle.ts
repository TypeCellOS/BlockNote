import { expect } from "vite-plus/test";
import { userEvent } from "./context.js";
import { DRAG_HANDLE_ADD_SELECTOR, SLASH_MENU_SELECTOR } from "./const.js";
import { waitForSelector, waitForSelectorDetached } from "./editor.js";
import { moveMouseOverElement, waitForDragHandle } from "./mouse.js";

const selectedOption = `${SLASH_MENU_SELECTOR} [role="option"][aria-selected="true"]`;

export async function addBlockFromDragHandle(level: 1 | 2) {
  await userEvent.click(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
  await waitForSelector(selectedOption);
  await userEvent.keyboard(`h${level}`);
  const selection = () => document.querySelector(selectedOption)?.textContent;
  await expect.poll(selection).toMatch(new RegExp(`^Heading ${level}`));
  await userEvent.keyboard("{ArrowDown}");
  await expect.poll(selection).toContain(`Toggle Heading ${level}`);
  await userEvent.keyboard("{Enter}");
  await waitForSelectorDetached(SLASH_MENU_SELECTOR);
}

export async function hoverAndAddBlockFromDragHandle(
  selector: string,
  level: 1 | 2,
) {
  await moveMouseOverElement(selector);
  await addBlockFromDragHandle(level);
}

export async function getDragHandleYCoord(selector: string) {
  const block = await waitForSelector(selector);
  await moveMouseOverElement(block);
  return (await waitForDragHandle(block)).getBoundingClientRect().y;
}
