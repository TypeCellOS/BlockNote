import {
  type BlockNoteEditor,
  getNodeById,
  inlineContentToNodes,
  type PartialBlock,
} from "@blocknote/core";
import { Fragment } from "prosemirror-model";
import { ReplaceStep } from "prosemirror-transform";
import { describe, expect } from "vite-plus/test";

import type { LensInlineContent } from "../model.js";
import { commentedText, commentEditorOptions } from "../testUtil/comments.js";
import { addInlineContentSteps } from "./inlineSteps.js";

/** The options of an editor with the comments extension and a paragraph "p" with `text`. */
function paragraphOptions(text: string) {
  return {
    initialContent: [{ id: "p", type: "paragraph", content: text }],
    ...commentEditorOptions(),
  } satisfies { initialContent: PartialBlock[] };
}

/** Applies the steps that change paragraph "p" to `content`, and returns the steps. */
function applySteps(
  editor: BlockNoteEditor<any, any, any>,
  content: LensInlineContent[],
) {
  let steps: readonly unknown[] = [];
  editor.transact((tr) => {
    const found = getNodeById("p", tr.doc)!;
    const blockContent = found.node.firstChild!;
    addInlineContentSteps(
      tr,
      found.posBeforeNode + 2,
      blockContent,
      Fragment.from(
        inlineContentToNodes<any, any>(
          content,
          editor.pmSchema,
          blockContent.type.name,
        ),
      ),
    );
    steps = tr.steps;
  });
  return steps;
}

const text = (value: string, styles = {}) => ({
  type: "text" as const,
  text: value,
  styles,
});

describe("addInlineContentSteps", () => {
  it("replaces only the changed word", async ({ setupEditor }) => {
    const { editor } = await setupEditor(paragraphOptions("Hello big world"));
    const steps = applySteps(editor, [text("Hello small world")]);

    expect(editor.getBlock("p")?.content).toEqual([text("Hello small world")]);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toBeInstanceOf(ReplaceStep);
  });

  it("replaces a changed word with one step, also if it has letters in common", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor(paragraphOptions("The last word"));
    const steps = applySteps(editor, [text("The final word")]);

    expect(steps).toHaveLength(1);
    expect(steps[0]).toBeInstanceOf(ReplaceStep);
  });

  it("changes only marks if only the styles changed", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor(paragraphOptions("Hello world"));
    const steps = applySteps(editor, [
      text("Hello "),
      text("world", { bold: true }),
    ]);

    expect(editor.getBlock("p")?.content).toEqual([
      text("Hello "),
      text("world", { bold: true }),
    ]);
    expect(steps.some((step) => step instanceof ReplaceStep)).toBe(false);
  });

  it("keeps a comment on text that does not change", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor(paragraphOptions("Hello world"));
    // Positions: the paragraph text starts at 3. "Hello" is 3 to 8.
    const comment = editor.pmSchema.marks.comment.create({
      threadId: "thread-1",
      orphan: false,
    });
    editor.transact((tr) => tr.addMark(3, 8, comment));

    applySteps(editor, [text("Hello brave world")]);

    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe("Hello");
    expect(editor.getBlock("p")?.content).toEqual([text("Hello brave world")]);
  });

  it("does not split emoji", async ({ setupEditor }) => {
    const { editor } = await setupEditor(paragraphOptions("I 😀"));
    applySteps(editor, [text("I 😁")]);
    expect(editor.getBlock("p")?.content).toEqual([text("I 😁")]);
  });

  it("makes at most 200 steps for a large change of one block, and keeps a comment on its unchanged text", async ({
    setupEditor,
  }) => {
    // 500 words, and the text changes each one: 500 changed runs.
    const words = Array.from({ length: 500 }, (_, i) => `w${i}`);
    const { editor } = await setupEditor(paragraphOptions(words.join(" ")));
    const comment = editor.pmSchema.marks.comment.create({
      threadId: "thread-1",
      orphan: false,
    });
    // The space after "w250" has a comment. The paragraph text starts at 3.
    const at = 3 + words.slice(0, 251).join(" ").length;
    editor.transact((tr) => tr.addMark(at, at + 1, comment));

    const steps = applySteps(editor, [
      text(words.map((word) => `${word}x`).join(" ")),
    ]);

    expect(steps.length).toBeLessThanOrEqual(200);
    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe(" ");
    expect(editor.getBlock("p")?.content).toEqual([
      text(words.map((word) => `${word}x`).join(" ")),
    ]);
  });

  it("joins only the runs with short unchanged parts between them, if there are more than 200", async ({
    setupEditor,
  }) => {
    // 300 changed words. After each 50th word, a long sentence that does not
    // change. The 100 shortest unchanged parts must join (300 runs, at most
    // 200 groups): they are all at most 5 characters long. The 5 long
    // sentences are longer, thus they split the runs into 6 groups.
    const sentence = " and a long sentence that does not change";
    const parts = (changed: boolean) =>
      Array.from(
        { length: 300 },
        (_, i) =>
          `w${i}${changed ? "x" : ""}${i % 50 === 49 && i < 299 ? sentence : ""}`,
      ).join(" ");
    const { editor } = await setupEditor(paragraphOptions(parts(false)));

    const steps = applySteps(editor, [text(parts(true))]);

    expect(steps.filter((step) => step instanceof ReplaceStep)).toHaveLength(6);
    expect(editor.getBlock("p")?.content).toEqual([text(parts(true))]);
  });
});
