import { describe, expect, vi } from "vite-plus/test";

import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { handleFileInsertion } from "./handleFileInsertion.js";

function fileTransferEvent(
  type: "drop" | "paste",
  items: Pick<DataTransferItem, "type" | "getAsFile">[],
  coords = { clientX: 0, clientY: 0 },
) {
  // Keep real EventTarget dispatch and preventDefault in Node. Only the
  // browser-specific transfer payload and pointer coordinates are supplied.
  const event = new Event(type, { cancelable: true });
  const data = { types: ["Files"], items };
  if (type === "drop") {
    Object.assign(event, coords, { dataTransfer: data });
    return event as DragEvent;
  }
  Object.assign(event, { clipboardData: data });
  return event as ClipboardEvent;
}

describe("File insertion", () => {
  it.for([
    { position: "end", y: 12, placement: "after" },
    { position: "end", y: 28, placement: "after" },
    { position: "start", y: 12, placement: "before" },
    { position: "middle", y: 12, placement: "before" },
    { position: "middle", y: 28, placement: "after" },
    { position: "gap before", y: -1, placement: "before" },
    { position: "gap after", y: 41, placement: "after" },
    // Padding within the block follows the resolved text-end position too.
    { position: "end", y: 5, placement: "after" },
    { position: "end", y: 35, placement: "after" },
    // The same text-end position outside the block keeps gap placement.
    { position: "end", y: -1, placement: "before" },
    { position: "end", y: 41, placement: "after" },
  ] as const)(
    "drops at $position (y=$y) $placement the paragraph",
    async ({ position, y, placement }, { setupEditor }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "above", type: "paragraph", content: "Above" },
          { id: "target", type: "paragraph", content: "Target line" },
          { id: "below", type: "paragraph", content: "Below" },
        ],
        trailingBlock: false,
        uploadFile: async () => "https://example.com/image.png",
      });
      editor.setTextCursorPosition("target", "end");
      const end = editor.transact(({ selection }) => selection.from);
      const start = end - "Target line".length;
      const positions = {
        start,
        middle: start + 3,
        end,
        "gap before": start - 2,
        "gap after": end + 2,
      };
      // Supply already-resolved coordinates to isolate the placement policy.
      // The mounted regression separately covers browser coordinate resolution.
      Object.defineProperty(editor, "prosemirrorView", {
        value: {
          posAtCoords: () => ({ pos: positions[position], inside: -1 }),
        } satisfies Pick<BlockNoteEditor["prosemirrorView"], "posAtCoords">,
      });
      Object.defineProperty(editor, "domElement", {
        value: {
          querySelector: (selector: string) => ({
            getBoundingClientRect: () =>
              selector === '[data-id="below"]'
                ? { top: 40, bottom: 80 }
                : { top: 0, bottom: 40 },
          }),
        },
      });
      const file = new File(["image"], "image.png", { type: "image/png" });
      const event = fileTransferEvent(
        "drop",
        [{ type: file.type, getAsFile: () => file }],
        { clientX: 100, clientY: y },
      );

      await handleFileInsertion(event, editor);

      expect(event.defaultPrevented).toBe(true);
      expect(
        editor.document.map((block) =>
          block.type === "image" ? "image" : block.id,
        ),
      ).toEqual(
        placement === "before"
          ? ["above", "image", "target", "below"]
          : ["above", "target", "image", "below"],
      );
    },
  );

  describe.each(["success", "rejection", "empty URL"] as const)(
    "%s for the first upload",
    (outcome) => {
      it.for(["before", "after", "paste"] as const)(
        "preserves transfer order (%s a nonempty paragraph)",
        async (placement, { setupEditor }) => {
          let finishFirstUpload!: () => void;
          let finishSecondUpload!: () => void;
          const firstPending = new Promise<void>((resolve) => {
            finishFirstUpload = resolve;
          });
          const secondPending = new Promise<void>((resolve) => {
            finishSecondUpload = resolve;
          });
          const { promise: secondUploadStarted, resolve: startSecondUpload } =
            Promise.withResolvers<void>();
          const uploadFile = vi.fn(async (file: File) => {
            if (file.name === "image.gif") {
              await firstPending;
              if (outcome === "rejection") {
                throw new Error("Upload rejected");
              }
              if (outcome === "empty URL") {
                return "";
              }
            } else {
              startSecondUpload();
              await secondPending;
            }
            return `https://example.com/${file.name}`;
          });
          const { editor } = await setupEditor({
            initialContent: [
              { id: "target", type: "paragraph", content: "Wrapped paragraph" },
            ],
            trailingBlock: false,
            uploadFile,
          });

          let insertion: Promise<void> | undefined;
          try {
            editor.setTextCursorPosition("target", "end");
            // Only layout is substituted: resolve the real target node after each
            // insertion, as posAtCoords would for a drop over the paragraph.
            if (placement !== "paste") {
              Object.defineProperty(editor, "prosemirrorView", {
                value: {
                  posAtCoords: () =>
                    editor.transact(({ doc }) => {
                      let targetPos = 0;
                      doc.descendants((node, pos) => {
                        if (node.attrs.id === "target") {
                          targetPos = pos + 1;
                        }
                      });
                      return { pos: targetPos, inside: -1 };
                    }),
                } satisfies Pick<
                  BlockNoteEditor["prosemirrorView"],
                  "posAtCoords"
                >,
              });
              Object.defineProperty(editor, "domElement", {
                value: {
                  querySelector: () => ({
                    getBoundingClientRect: () => ({ top: 0, bottom: 100 }),
                  }),
                },
              });
            }
            const files = [
              new File(["first"], "image.gif", { type: "image/gif" }),
              new File(["second"], "picture.png", { type: "image/png" }),
            ];
            const event = fileTransferEvent(
              placement === "paste" ? "paste" : "drop",
              files.map((file) => ({ type: file.type, getAsFile: () => file })),
              { clientX: 10, clientY: placement === "before" ? 10 : 90 },
            );

            insertion = handleFileInsertion(event, editor);
            // Uploads stay sequential. Let the first finish while the second is
            // still pending, then check that its completion cannot reorder blocks.
            expect(uploadFile).toHaveBeenCalledTimes(1);
            finishFirstUpload();
            await Promise.race([
              secondUploadStarted,
              insertion.then(() => {
                throw new Error(
                  "Insertion finished before the second upload started",
                );
              }),
            ]);
            expect(uploadFile).toHaveBeenCalledTimes(2);

            expect(event.defaultPrevented).toBe(true);
            expect(uploadFile.mock.calls.map(([file]) => file)).toEqual(files);
            const order = editor.document.map((block) =>
              "name" in block.props ? block.props.name : block.id,
            );
            expect
              .soft(order)
              .toEqual(
                placement === "before"
                  ? ["image.gif", "picture.png", "target"]
                  : ["target", "image.gif", "picture.png"],
              );
            finishSecondUpload();
            await insertion;
            expect(
              editor.document
                .filter((block) => block.type === "image")
                .map((block) => block.props.url),
            ).toEqual([
              outcome === "success" ? "https://example.com/image.gif" : "",
              "https://example.com/picture.png",
            ]);
          } finally {
            finishFirstUpload();
            finishSecondUpload();
            await insertion;
          }
        },
      );
    },
  );

  it.for(["drop", "paste"] as const)(
    "uploads and inserts all files in order after %s data becomes unavailable",
    async (eventType, { setupEditor }) => {
      let finishUpload!: () => void;
      const uploadPending = new Promise<void>((resolve) => {
        finishUpload = resolve;
      });
      const uploadFile = vi.fn(async (file: File) => {
        await uploadPending;
        return `https://example.com/${file.name}`;
      });
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph" }],
        trailingBlock: false,
        uploadFile,
      });

      let insertion = Promise.resolve();
      try {
        // Resolve drops to the first block without mounting a view.
        if (eventType === "drop") {
          Object.defineProperty(editor, "prosemirrorView", {
            value: {
              posAtCoords: () => ({ pos: 1, inside: -1 }),
            } satisfies Pick<BlockNoteEditor["prosemirrorView"], "posAtCoords">,
          });
        }
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
        const event = fileTransferEvent(eventType, items);
        const target = new EventTarget();
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
        finishUpload();
        await insertion;
      }
    },
  );
});
