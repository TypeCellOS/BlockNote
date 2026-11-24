import type { BlockNoteEditor } from "@blocknote/core";

/** Exercise clipboard event handlers without touching the OS clipboard. */
export function dispatchClipboardEvent(
  target: Element,
  type: "copy" | "cut" | "paste",
  clipboardData: DataTransfer,
) {
  const event = new ClipboardEvent(type, { bubbles: true, cancelable: true });
  // Firefox doesn't write back to the DataTransfer passed in the event init.
  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  target.dispatchEvent(event);
  return event;
}

/** Exercise the editor's copy handler without writing to the system clipboard. */
export function captureEditorClipboard(
  editor: Pick<BlockNoteEditor, "domElement">,
) {
  const dom = editor.domElement;
  if (!dom) {
    throw new Error("Copy tests require a mounted editor");
  }
  const clipboard = new DataTransfer();
  if (!dispatchClipboardEvent(dom, "copy", clipboard).defaultPrevented) {
    throw new Error("The editor did not handle the copy event");
  }
  return clipboard;
}
