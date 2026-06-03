import { userEvent } from "./context.js";
import { DRAG_HANDLE_ADD_SELECTOR, DRAG_HANDLE_SELECTOR } from "./const.js";
import { sleep, waitForSelector } from "./editor.js";
import { getRect, moveMouseOverElement } from "./mouse.js";

export async function addBlockFromDragHandle(command: string) {
  await userEvent.click(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
  await userEvent.keyboard(command);
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard("{Enter}");
  await sleep(500);
}

export async function hoverAndAddBlockFromDragHandle(
  selector: string,
  blockQuery: string,
) {
  await moveMouseOverElement(selector);
  await addBlockFromDragHandle(blockQuery);
}

export async function getDragHandleYCoord(selector: string) {
  await moveMouseOverElement(selector);
  await waitForSelector(DRAG_HANDLE_SELECTOR);
  return getRect(DRAG_HANDLE_SELECTOR).y;
}
