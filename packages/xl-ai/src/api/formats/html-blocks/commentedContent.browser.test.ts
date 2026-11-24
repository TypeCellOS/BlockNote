/**
 * Regression test for https://github.com/TypeCellOS/BlockNote/issues/2947
 *
 * Comment marks are `blocknoteIgnore` marks: they're not part of the BlockNote
 * document model and don't survive an HTML round-trip. The HTML rebase tool
 * used to treat that as a fatal "html diff", which made every AI operation on a
 * block containing a comment fail.
 *
 * Runs fully offline (no LLM call): tool calls are fed straight into the
 * executor.
 */
import type { BlockNoteEditor } from "@blocknote/core";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { YjsThreadStore } from "@blocknote/core/yjs";
import { Doc } from "yjs";
import { describe, expect, type TestContext } from "vite-plus/test";
import type { BrowserContext } from "../../../../../../tests/src/fixtures/editor.js";

import { AIExtension } from "../../../AIExtension.js";
import { StreamToolExecutor } from "../../../streamTool/StreamToolExecutor.js";
import { StreamTool } from "../../../streamTool/streamTool.js";
import { tools } from "./tools/index.js";
import { createHTMLRebaseTool } from "./tools/rebaseTool.js";

async function createEditorWithComment({
  setupEditor,
  selectText,
  onTestFinished,
}: Pick<BrowserContext, "setupEditor" | "selectText"> &
  Pick<TestContext, "onTestFinished">) {
  const doc = new Doc();
  onTestFinished(() => doc.destroy());
  const userId = "author";
  const threadStore = new YjsThreadStore(
    userId,
    doc.getMap("threads"),
    new DefaultThreadStoreAuth(userId, "editor"),
  );
  const { editor } = await setupEditor({
    mountType: "dom",
    initialContent: [
      { id: "ref1", type: "paragraph", content: "Hello, world!" },
      { id: "ref2", type: "paragraph", content: "How are you?" },
    ],
    trailingBlock: false,
    extensions: [
      AIExtension(),
      CommentsExtension({ threadStore, resolveUsers: async () => [] }),
    ],
  });
  selectText(editor, "Hello");
  await editor.getExtension(CommentsExtension)!.createThread({
    initialComment: {
      body: [{ id: "comment", type: "paragraph", content: "A comment" }],
    },
  });

  const [threadId] = threadStore.getThreads().keys();
  expect(commentedRanges(editor)).toEqual([{ text: "Hello", threadId }]);
  return { editor, threadId };
}

function commentedRanges(editor: BlockNoteEditor) {
  return Array.from(editor.domElement!.querySelectorAll(".bn-thread-mark")).map(
    (mark) => ({
      text: mark.textContent,
      threadId: mark.getAttribute("data-bn-thread-id"),
    }),
  );
}

async function runUpdate(editor: BlockNoteEditor, id: string, html: string) {
  const streamTools = [
    tools.update(editor, { idsSuffixed: false, withDelays: false }),
  ] as StreamTool<any>[];

  await new StreamToolExecutor(streamTools).execute(
    (async function* () {
      yield {
        operation: { type: "update" as const, id, block: html },
        isUpdateToPreviousOperation: false,
        isPossiblyPartial: false,
        metadata: undefined,
      };
    })(),
  );
}

describe("blocks containing comments", () => {
  it("can build a rebase tool for a commented block", async ({
    setupEditor,
    selectText,
    onTestFinished,
  }) => {
    const { editor } = await createEditorWithComment({
      setupEditor,
      selectText,
      onTestFinished,
    });

    expect(() => createHTMLRebaseTool("ref1", editor)).not.toThrow();
  });

  it("updates a block that contains a comment", async ({
    setupEditor,
    selectText,
    onTestFinished,
  }) => {
    const { editor, threadId } = await createEditorWithComment({
      setupEditor,
      selectText,
      onTestFinished,
    });

    await runUpdate(editor, "ref1", "<p>Hello, universe!</p>");

    editor.getExtension(AIExtension)?.acceptChanges();
    expect(editor.getBlock("ref1")?.content).toMatchObject([
      { type: "text", text: "Hello, universe!" },
    ]);
    // the untouched part of the comment is still anchored
    expect(commentedRanges(editor)).toEqual([{ text: "Hello", threadId }]);
  });

  it("updates a sibling block while another block has a comment", async ({
    setupEditor,
    selectText,
    onTestFinished,
  }) => {
    const { editor, threadId } = await createEditorWithComment({
      setupEditor,
      selectText,
      onTestFinished,
    });

    await runUpdate(editor, "ref2", "<p>How do you do?</p>");

    editor.getExtension(AIExtension)?.acceptChanges();
    expect(editor.getBlock("ref2")?.content).toMatchObject([
      { type: "text", text: "How do you do?" },
    ]);
    expect(commentedRanges(editor)).toEqual([{ text: "Hello", threadId }]);
  });
});
