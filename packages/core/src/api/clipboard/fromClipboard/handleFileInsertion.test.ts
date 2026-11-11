// @vitest-environment node
import { describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { handleFileInsertion } from "./handleFileInsertion.js";

describe("File insertion", () => {
  describe.each(["success", "rejection", "empty URL"] as const)(
    "%s for the first upload",
    (outcome) => {
      it.each(["before", "after", "paste"] as const)(
        "preserves transfer order (%s a nonempty paragraph)",
        async (placement) => {
          let finishFirstUpload!: () => void;
          let finishSecondUpload!: () => void;
          const firstPending = new Promise<void>((resolve) => {
            finishFirstUpload = resolve;
          });
          const secondPending = new Promise<void>((resolve) => {
            finishSecondUpload = resolve;
          });
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
              await secondPending;
            }
            return `https://example.com/${file.name}`;
          });
          const editor = BlockNoteEditor.create({
            initialContent: [
              { id: "target", type: "paragraph", content: "Wrapped paragraph" },
            ],
            trailingBlock: false,
            uploadFile,
          });

          try {
            editor.setTextCursorPosition("target", "end");
            // Only layout is substituted: resolve the real target node after each
            // insertion, as posAtCoords would for a drop over the paragraph.
            Object.defineProperty(editor, "prosemirrorView", {
              value: {
                posAtCoords: () => {
                  let targetPos = 0;
                  editor.prosemirrorState.doc.descendants((node, pos) => {
                    if (node.attrs.id === "target") {
                      targetPos = pos + 1;
                    }
                  });
                  return { pos: targetPos, inside: -1 };
                },
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
            const files = [
              new File(["first"], "image.gif", { type: "image/gif" }),
              new File(["second"], "picture.png", { type: "image/png" }),
            ];
            const event =
              placement === "paste"
                ? new ClipboardEvent("paste", { cancelable: true })
                : new DragEvent("drop", { cancelable: true });
            Object.defineProperties(event, {
              [placement === "paste" ? "clipboardData" : "dataTransfer"]: {
                value: {
                  types: ["Files"],
                  items: files.map((file) => ({
                    type: file.type,
                    getAsFile: () => file,
                  })),
                },
              },
              clientX: { value: 10 },
              clientY: { value: placement === "before" ? 10 : 90 },
            });

            const insertion = handleFileInsertion(event, editor);
            // Uploads stay sequential. Let the first finish while the second is
            // still pending, then check that its completion cannot reorder blocks.
            expect(uploadFile).toHaveBeenCalledTimes(1);
            finishFirstUpload();
            await vi.waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2));

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
            editor._tiptapEditor.destroy();
          }
        },
      );
    },
  );

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
