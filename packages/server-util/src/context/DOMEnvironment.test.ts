import { describe, expect, it, vi } from "vite-plus/test";
import { ServerBlockNoteEditor } from "./ServerBlockNoteEditor.js";

describe("application-owned DOM environment", () => {
  it.each(["window", "document"] as const)(
    "fails clearly when %s is missing without installing globals",
    async (global) => {
      const testWindow = globalThis.window;
      const testDocument = globalThis.document;
      vi.stubGlobal(global, undefined);
      try {
        const editor = ServerBlockNoteEditor.create();
        await expect(editor.blocksToFullHTML([])).rejects.toThrow();
        await expect(editor.blocksToHTMLLossy([])).rejects.toThrow();
        await expect(editor.blocksToMarkdownLossy([])).rejects.toThrow();
        await expect(editor.tryParseHTMLToBlocks("Hello")).rejects.toThrow();
        await expect(
          editor.tryParseMarkdownToBlocks("Hello"),
        ).rejects.toThrow();
        await expect(
          editor.withReactContext(
            ({ children }) => children,
            async () => "unused",
          ),
        ).rejects.toThrow();
        expect(globalThis[global]).toBeUndefined();
        expect(
          global === "window" ? globalThis.document : globalThis.window,
        ).toBe(global === "window" ? testDocument : testWindow);
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it("allows JSON and Yjs conversions without any DOM globals", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    try {
      const editor = ServerBlockNoteEditor.create();
      const blocks = [{ type: "paragraph", content: "No DOM" }] as const;
      const node = editor._blocksToProsemirrorNode([...blocks]);
      expect(editor._prosemirrorNodeToBlocks(node)[0].type).toBe("paragraph");
      const doc = editor.blocksToYDoc([...blocks]);
      expect(editor.yDocToBlocks(doc)[0].type).toBe("paragraph");
      doc.destroy();
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.document).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects mismatched DOM globals without replacing either", async () => {
    const unrelatedDocument = document.implementation.createHTMLDocument();
    vi.stubGlobal("document", unrelatedDocument);
    try {
      await expect(
        ServerBlockNoteEditor.create().blocksToHTMLLossy([]),
      ).rejects.toThrow();
      expect(globalThis.document).toBe(unrelatedDocument);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
