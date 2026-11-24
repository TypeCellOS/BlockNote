import { describe, expect, it, vi } from "vite-plus/test";
import { ServerBlockNoteEditor } from "./context/ServerBlockNoteEditor.js";
import { getDocument } from "./dom.js";
import { useServerDOM } from "../testServerDOM.js";

describe("pluggable DOM document", () => {
  useServerDOM();
  it("shares an injected document across nested and concurrent exports", async () => {
    const document = globalThis.document;
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    try {
      const first = ServerBlockNoteEditor.create({}, document);
      const second = ServerBlockNoteEditor.create({}, document);
      await Promise.all([
        first.blocksToHTMLLossy([{ type: "paragraph", content: "First" }]),
        second.blocksToMarkdownLossy([
          { type: "paragraph", content: "Second" },
        ]),
        first._withDOM(async (activeDocument) => {
          expect(activeDocument === document).toBe(true);
          return first.blocksToFullHTML([]);
        }),
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("binds the injected document persistently on first DOM use", async () => {
    const document = globalThis.document;
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    try {
      const editor = ServerBlockNoteEditor.create({}, document);
      expect(globalThis.window).toBeUndefined();
      expect(
        await editor.blocksToMarkdownLossy([
          { type: "paragraph", content: "Hello" },
        ]),
      ).toContain("Hello");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(globalThis.window === document.defaultView).toBe(true);
      expect(globalThis.document === document).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects an injected document conflicting with the active environment", async () => {
    const activeWindow = globalThis.window;
    const activeDocument = globalThis.document;
    const injectedDocument = getDocument();
    try {
      const editor = ServerBlockNoteEditor.create({}, injectedDocument);
      await expect(editor.blocksToFullHTML([])).rejects.toThrow(
        /partial or conflicting DOM globals/,
      );
      expect(globalThis.window === activeWindow).toBe(true);
      expect(globalThis.document === activeDocument).toBe(true);
    } finally {
      injectedDocument.defaultView?.close();
    }
  });

  it.each(["window", "document"] as const)(
    "does not overwrite a partial environment missing %s",
    async (missing) => {
      const document = globalThis.document;
      vi.stubGlobal(missing, undefined);
      try {
        const editor = ServerBlockNoteEditor.create({}, document);
        await expect(editor.blocksToFullHTML([])).rejects.toThrow();
        expect(globalThis[missing]).toBeUndefined();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it("rejects a document without a window before installing globals", async () => {
    const document = globalThis.document.implementation.createHTMLDocument();
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    try {
      const editor = ServerBlockNoteEditor.create({}, document);
      await expect(editor.blocksToFullHTML([])).rejects.toThrow();
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.document).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
