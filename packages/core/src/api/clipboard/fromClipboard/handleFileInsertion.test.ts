// @vitest-environment node
import { describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { handleFileInsertion } from "./handleFileInsertion.js";

describe("File insertion", () => {
  it.each(["drop", "paste"] as const)(
    "uploads and inserts all files in order after %s data becomes unavailable",
    async (eventType) => {
      let finishUpload!: () => void;
      const uploadPending = new Promise<void>((resolve) => {
        finishUpload = resolve;
      });
      const uploadFile = vi.fn(async (file: File) => {
        await uploadPending;
        return `https://example.com/${file.name}`;
      });
      const editor = BlockNoteEditor.create({
        initialContent: [{ type: "paragraph" }],
        trailingBlock: false,
        uploadFile,
      });

      try {
        // Resolve drops to the first block without mounting a view.
        Object.defineProperty(editor, "prosemirrorView", {
          value: {
            posAtCoords: () => ({ pos: 1, inside: -1 }),
          } satisfies Pick<BlockNoteEditor["prosemirrorView"], "posAtCoords">,
        });
        const files = [
          new File(["first"], "first.png", { type: "image/png" }),
          new File(["second"], "second.pdf", { type: "application/pdf" }),
        ];
        let protectedData = false;
        const items = files.map((file) => ({
          kind: "file",
          type: file.type,
          getAsFile: () => (protectedData ? null : file),
        }));
        const event =
          eventType === "drop"
            ? new DragEvent("drop", { cancelable: true })
            : new ClipboardEvent("paste", { cancelable: true });
        Object.defineProperty(
          event,
          eventType === "drop" ? "dataTransfer" : "clipboardData",
          { value: { types: ["Files"], items } },
        );
        const target = new EventTarget();
        let insertion = Promise.resolve();
        target.addEventListener(eventType, () => {
          insertion = handleFileInsertion(event, editor);
        });
        target.dispatchEvent(event);
        // Native event data is only available during synchronous dispatch.
        protectedData = true;
        items.length = 0;
        expect(uploadFile).toHaveBeenCalledTimes(1);
        finishUpload();
        await insertion;

        expect.soft(uploadFile).toHaveBeenCalledTimes(2);
        expect(
          editor.document.map((block) => ({
            type: block.type,
            props: block.props,
          })),
        ).toMatchObject([
          {
            type: "image",
            props: {
              name: "first.png",
              url: "https://example.com/first.png",
            },
          },
          {
            type: "file",
            props: {
              name: "second.pdf",
              url: "https://example.com/second.pdf",
            },
          },
        ]);
        expect(uploadFile.mock.calls.map(([file]) => file)).toEqual(files);
      } finally {
        editor._tiptapEditor.destroy();
      }
    },
  );
});
