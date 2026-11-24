import { describe, expect, vi } from "vite-plus/test";

import "../../../style.css";
import { handleFileInsertion } from "./handleFileInsertion.js";

it("drops a file after a paragraph when the upper half resolves to the text end (#2570)", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    initialContent: [
      { id: "target", type: "paragraph", content: "Target line" },
      { id: "below", type: "paragraph", content: "Below" },
    ],
    uploadFile: async () => "https://example.com/test.txt",
  });
  const target = editor.domElement!.querySelector('[data-id="target"]')!;
  const bounds = target.getBoundingClientRect();
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(
    new File(["test"], "test.txt", { type: "text/plain" }),
  );

  await handleFileInsertion(
    new DragEvent("drop", {
      dataTransfer,
      clientX: bounds.right - 4,
      clientY: bounds.top + bounds.height / 4,
      cancelable: true,
    }),
    editor,
  );

  expect(editor.document).toMatchObject([
    { id: "target" },
    { type: "file", props: { name: "test.txt" } },
    { id: "below" },
  ]);
});

// Reproduces #3246 in the real file insertion handler and vanilla node view.
// Await the handler directly so its rejected promise can be asserted rather
// than becoming an unhandled rejection in the test runner.
describe.each(["drop", "paste"] as const)("file %s", (eventType) => {
  it.for(["empty URL", "rejection", "success"] as const)(
    "settles the loading preview after %s",
    async (outcome, { setupEditor }) => {
      const uploadFile = vi.fn(async () => {
        if (outcome === "rejection") {
          throw new Error("rejected");
        }
        return outcome === "success" ? "https://example.com/test.txt" : "";
      });
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [{ id: "target", type: "paragraph" }],
        uploadFile,
      });
      const root = editor.domElement!;
      editor.setTextCursorPosition("target");
      const onUploadEnd = vi.fn();
      editor.onUploadEnd(onUploadEnd);

      const data = new DataTransfer();
      data.items.add(new File(["test"], "test.txt", { type: "text/plain" }));
      const target = root.querySelector('[data-id="target"]');
      if (!target) {
        throw new Error("Target block was not rendered");
      }
      const rect = target.getBoundingClientRect();
      const event =
        eventType === "drop"
          ? new DragEvent("drop", {
              dataTransfer: data,
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height / 2,
              cancelable: true,
            })
          : new ClipboardEvent("paste", {
              clipboardData: data,
              cancelable: true,
            });
      // Firefox strips file data from constructed ClipboardEvents. Supply the
      // original DataTransfer when calling the handler directly.
      if (eventType === "paste") {
        Object.defineProperty(event, "clipboardData", { value: data });
      }

      const insertion = handleFileInsertion(event, editor);
      expect(uploadFile).toHaveBeenCalledOnce();
      expect(root.querySelector(".bn-file-loading-preview")?.textContent).toBe(
        "Loading...",
      );
      const result = await insertion.then(
        () => "resolved",
        () => "rejected",
      );

      expect(onUploadEnd).toHaveBeenCalledOnce();
      expect.soft(result).toBe("resolved");
      expect.soft(root.querySelector(".bn-file-loading-preview")).toBeNull();
      if (outcome !== "success") {
        expect.soft(root.querySelector(".bn-add-file-button")).not.toBeNull();
      } else {
        expect(editor.document[0].props).toMatchObject({
          name: "test.txt",
          url: "https://example.com/test.txt",
        });
      }
    },
  );
});
