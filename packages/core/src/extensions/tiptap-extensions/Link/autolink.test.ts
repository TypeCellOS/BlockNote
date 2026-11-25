import { describe, expect } from "vite-plus/test";

import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { installHeadlessPlugins } from "../../testHeadlessEditor.js";
import { getLinksInDocument } from "./linkTestHelpers.js";

/**
 * Insert text at the end of a block, followed by a space to trigger autolink.
 * Returns the link marks found in that block afterward.
 */
function typeTextThenSpace(
  editor: BlockNoteEditor,
  blockId: string,
  text: string,
) {
  editor.setTextCursorPosition(blockId, "end");
  editor.transact((tr) => tr.insertText(text));

  // Now insert a space to trigger autolink
  editor.transact((tr) => tr.insertText(" "));

  return getLinksInDocument(editor);
}

describe("Link extension autolink behavior", () => {
  const it = globalThis.it.extend<{
    createEditor: (links?: {
      isValidLink: (href: string) => boolean;
    }) => Promise<BlockNoteEditor>;
  }>({
    createEditor: async ({ setupEditor }, use) => {
      await use(async (links) => {
        const { editor } = await setupEditor({
          links,
          initialContent: [{ id: "test-block", type: "paragraph" }],
        });
        installHeadlessPlugins(editor);
        return editor;
      });
    },
  });

  it("honors a restrictive isValidLink override while typing", async ({
    createEditor,
  }) => {
    const editor = await createEditor({ isValidLink: () => false });
    const links = typeTextThenSpace(
      editor,
      "test-block",
      "https://example.com",
    );
    expect(links).toHaveLength(0);
  });

  describe("should autolink", () => {
    it("autolinks https URL when followed by space", async ({
      createEditor,
    }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(
        editor,
        "test-block",
        "https://example.com",
      );
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com");
      expect(links[0].text).toBe("https://example.com");
    });

    it("autolinks http URL when followed by space", async ({
      createEditor,
    }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(
        editor,
        "test-block",
        "http://example.com",
      );
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("http://example.com");
    });

    it("autolinks schemeless URL with default protocol (https in BlockNote)", async ({
      createEditor,
    }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(editor, "test-block", "example.com");
      expect(links).toHaveLength(1);
      // BlockNote overrides the tiptap default to "https" via DEFAULT_LINK_PROTOCOL
      expect(links[0].href).toBe("https://example.com");
      expect(links[0].text).toBe("example.com");
    });

    it("autolinks www URL", async ({ createEditor }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(editor, "test-block", "www.example.com");
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://www.example.com");
    });

    it("autolinks URL with path and query", async ({ createEditor }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(
        editor,
        "test-block",
        "https://example.com/path?q=1",
      );
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com/path?q=1");
    });
  });

  describe("should NOT autolink", () => {
    it("does not autolink plain text", async ({ createEditor }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(editor, "test-block", "notaurl");
      expect(links).toHaveLength(0);
    });

    it("does not autolink single word", async ({ createEditor }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(editor, "test-block", "hello");
      expect(links).toHaveLength(0);
    });

    it("does not autolink IP address without protocol", async ({
      createEditor,
    }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(editor, "test-block", "192.168.1.1");
      expect(links).toHaveLength(0);
    });

    it("does not autolink localhost (single-word hostname)", async ({
      createEditor,
    }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(editor, "test-block", "localhost");
      expect(links).toHaveLength(0);
    });

    it("does not autolink domain with trailing number (invalid TLD)", async ({
      createEditor,
    }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(editor, "test-block", "example.com1");
      expect(links).toHaveLength(0);
    });

    it.for(["{example.com}", "example.com."])(
      "keeps %s as ordinary text",
      async (text, { createEditor }) => {
        const editor = await createEditor();

        typeTextThenSpace(editor, "test-block", text);

        expect(editor.getBlock("test-block")?.content).toEqual([
          { type: "text", text: `${text} `, styles: {} },
        ]);
      },
    );
  });

  describe("bracket-wrapped URLs", () => {
    it("autolinks URL in parentheses, linking only the URL", async ({
      createEditor,
    }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(
        editor,
        "test-block",
        "(https://example.com)",
      );
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com");
      expect(links[0].text).toBe("https://example.com");
    });

    it("autolinks URL in square brackets, linking only the URL", async ({
      createEditor,
    }) => {
      const editor = await createEditor();
      const links = typeTextThenSpace(
        editor,
        "test-block",
        "[https://example.com]",
      );
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe("https://example.com");
      expect(links[0].text).toBe("https://example.com");
    });
  });
});
