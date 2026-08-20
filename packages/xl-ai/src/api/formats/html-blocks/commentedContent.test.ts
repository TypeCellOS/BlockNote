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
import { BlockNoteEditor, createExtension } from "@blocknote/core";
import { CommentMark } from "@blocknote/core/comments";
import { describe, expect, it } from "vite-plus/test";

import { AIExtension } from "../../../AIExtension.js";
import { StreamToolExecutor } from "../../../streamTool/StreamToolExecutor.js";
import { StreamTool } from "../../../streamTool/streamTool.js";
import { tools } from "./tools/index.js";
import { createHTMLRebaseTool } from "./tools/rebaseTool.js";

/**
 * Registers just the comment mark. The full `CommentsExtension` needs a thread
 * store and user resolver, neither of which affects the document model.
 */
const CommentMarkExtension = createExtension(() => ({
  key: "commentMarkOnly",
  tiptapExtensions: [CommentMark],
}));

function createEditorWithComment() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      { id: "ref1", type: "paragraph", content: "Hello, world!" },
      { id: "ref2", type: "paragraph", content: "How are you?" },
    ],
    trailingBlock: false,
    extensions: [AIExtension(), CommentMarkExtension()],
  });
  editor.mount(document.createElement("div"));

  // comment on "Hello" in the first block
  editor.transact((tr) =>
    tr.addMark(
      3,
      8,
      editor.pmSchema.marks.comment.create({
        threadId: "thread-1",
        orphan: false,
      }),
    ),
  );

  return editor;
}

function commentedRanges(editor: BlockNoteEditor<any, any, any>) {
  const ranges: { text: string; threadId: string }[] = [];
  editor.prosemirrorState.doc.descendants((node) => {
    const mark = node.marks.find((m) => m.type.name === "comment");
    if (mark) {
      ranges.push({ text: node.text!, threadId: mark.attrs.threadId });
    }
  });
  return ranges;
}

async function runUpdate(
  editor: BlockNoteEditor<any, any, any>,
  id: string,
  html: string,
) {
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
  it("can build a rebase tool for a commented block", () => {
    const editor = createEditorWithComment();

    expect(() => createHTMLRebaseTool("ref1", editor)).not.toThrow();
  });

  it("updates a block that contains a comment", async () => {
    const editor = createEditorWithComment();

    await runUpdate(editor, "ref1", "<p>Hello, universe!</p>");

    editor.getExtension(AIExtension)?.acceptChanges();
    expect((editor.document[0] as any).content[0].text).toBe(
      "Hello, universe!",
    );
    // the untouched part of the comment is still anchored
    expect(commentedRanges(editor)).toEqual([
      { text: "Hello", threadId: "thread-1" },
    ]);
  });

  it("updates a sibling block while another block has a comment", async () => {
    const editor = createEditorWithComment();

    await runUpdate(editor, "ref2", "<p>How do you do?</p>");

    editor.getExtension(AIExtension)?.acceptChanges();
    expect((editor.document[1] as any).content[0].text).toBe("How do you do?");
    expect(commentedRanges(editor)).toEqual([
      { text: "Hello", threadId: "thread-1" },
    ]);
  });
});
