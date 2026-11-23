import type { BlockNoteEditor } from "@blocknote/core";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { describe, expect } from "vite-plus/test";
import * as Y from "yjs";
import { YjsThreadStore } from "../yjs/comments/YjsThreadStore.js";

function copySelection(editor: BlockNoteEditor) {
  const clipboardData = new DataTransfer();
  const event = new ClipboardEvent("copy", {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  editor.domElement!.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  return {
    clipboardHTML: clipboardData.getData("blocknote/html"),
    externalHTML: clipboardData.getData("text/html"),
    markdown: clipboardData.getData("text/plain"),
  };
}

function pasteAtEndOfTarget(editor: BlockNoteEditor, html: string) {
  editor.setTextCursorPosition("target", "end");
  editor.pasteHTML(html, true);
}

function commentedText(editor: BlockNoteEditor) {
  return Array.from(
    editor.domElement!.querySelectorAll(".bn-thread-mark"),
    (mark) => mark.textContent,
  );
}

describe("CommentsExtension", () => {
  const it = globalThis.it.extend<{
    commentedEditor: { editor: BlockNoteEditor; threadId: string };
  }>({
    commentedEditor: async (
      { setupEditor, selectText, onTestFinished },
      use,
    ) => {
      const doc = new Y.Doc();
      onTestFinished(() => doc.destroy());
      const threadStore = new YjsThreadStore(
        "author",
        doc.getMap("threads"),
        new DefaultThreadStoreAuth("author", "editor"),
      );
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [
          { type: "paragraph", content: "Hello world" },
          { id: "target", type: "paragraph", content: "target" },
        ],
        trailingBlock: false,
        extensions: [
          CommentsExtension({ threadStore, resolveUsers: async () => [] }),
        ],
      });
      selectText(editor, "Hello");
      await editor.getExtension(CommentsExtension)!.createThread({
        initialComment: { body: "Review this" },
      });
      const [threadId] = threadStore.getThreads().keys();
      expect(threadId).toBeDefined();
      expect(commentedText(editor)).toEqual(["Hello"]);
      selectText(editor, "Hello");
      await use({ editor, threadId });
    },
  });

  it("doesn't put comment marks or thread IDs on the clipboard", ({
    commentedEditor: { editor, threadId },
  }) => {
    const { clipboardHTML, externalHTML, markdown } = copySelection(editor);
    for (const html of [clipboardHTML, externalHTML]) {
      expect(html).toContain("Hello");
      expect(html).not.toContain("bn-thread-mark");
      expect(html).not.toContain("data-bn-thread-id");
      expect(html).not.toContain(threadId);
    }
    expect(markdown).toBe("Hello\n");
    // Serializing the selection must not change the original anchor.
    expect(commentedText(editor)).toEqual(["Hello"]);
  });

  it("doesn't paste the comment of copied text", ({
    commentedEditor: { editor },
  }) => {
    const { clipboardHTML } = copySelection(editor);
    pasteAtEndOfTarget(editor, clipboardHTML);

    expect(editor.document[1].content).toMatchObject([
      { type: "text", text: "targetHello" },
    ]);
    // The comment stays on the original text only.
    expect(commentedText(editor)).toEqual(["Hello"]);
  });

  it("doesn't strip comment marks from incoming HTML", ({
    commentedEditor: { editor, threadId },
  }) => {
    pasteAtEndOfTarget(
      editor,
      `<p><span class="bn-thread-mark" data-bn-thread-id="${threadId}">Hello</span></p>`,
    );

    expect(commentedText(editor)).toEqual(["Hello", "Hello"]);
  });
});
