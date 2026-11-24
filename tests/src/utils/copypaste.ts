import type { BlockNoteEditor } from "@blocknote/core";
import { vi } from "vite-plus/test";
import {
  captureEditorClipboard,
  dispatchClipboardEvent,
} from "./clipboardEvent.js";
import { DOC_TRAILING_BLOCK_SELECTOR } from "./const.js";
import { MOD, userEvent } from "./context.js";

export async function selectAll() {
  // The first press selects the current block; the second selects the document.
  await userEvent.keyboard(`{${MOD}>}a{/${MOD}}`);
  await userEvent.keyboard(`{${MOD}>}a{/${MOD}}`);
}

export async function copyPaste(
  editor: Pick<BlockNoteEditor, "domElement">,
  root: HTMLElement,
) {
  const clipboard = captureEditorClipboard(editor);
  // Exit out of any menus/toolbars which may block the trailing block.
  await userEvent.keyboard("{Escape}");
  // The trailing block isn't always present (e.g. when the editor's last block
  // can't have one), so fall back to the last paragraph.
  const trailingBlock = root.querySelector<HTMLElement>(
    DOC_TRAILING_BLOCK_SELECTOR,
  );
  if (trailingBlock) {
    await userEvent.click(trailingBlock);
  } else {
    const paragraphs = root.querySelectorAll<HTMLElement>(
      '[data-content-type="paragraph"]',
    );
    await userEvent.click(paragraphs[paragraphs.length - 1]);
  }
  if (!editor.domElement) {
    throw new Error("Paste tests require a mounted editor");
  }
  const paste = dispatchClipboardEvent(editor.domElement, "paste", clipboard);
  if (!paste.defaultPrevented) {
    throw new Error("The editor did not handle the paste event");
  }
}

export async function copyPasteAll(
  editor: Pick<BlockNoteEditor, "domElement">,
  root: HTMLElement,
) {
  await selectAll();
  await copyPaste(editor, root);
}

export async function insertParagraph() {
  await userEvent.keyboard("Paragraph");
}

export async function insertHeading(headingLevel: number) {
  for (let i = 0; i < headingLevel; i++) {
    await userEvent.keyboard("#");
  }
  await userEvent.keyboard(" ");
  await userEvent.keyboard("Heading");
}

export function waitForWithin(root: Element, selector: string) {
  return vi.waitFor(
    () => {
      const element = root.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Selector not found in fixture: ${selector}`);
      }
      return element;
    },
    { timeout: 5000 },
  );
}
