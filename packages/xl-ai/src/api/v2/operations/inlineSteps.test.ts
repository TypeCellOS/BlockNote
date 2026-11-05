import {
  BlockNoteEditor,
  getNodeById,
  inlineContentToNodes,
} from "@blocknote/core";
import { Fragment } from "prosemirror-model";
import { ReplaceStep } from "prosemirror-transform";
import { describe, expect, it } from "vite-plus/test";

import type { LensInlineContent } from "../blocks/types.js";
import { commentedText, createCommentEditor } from "../testUtil/comments.js";
import { addInlineContentSteps } from "./inlineSteps.js";

function createEditor(text: string) {
  return createCommentEditor([{ id: "p", type: "paragraph", content: text }]);
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
  it("replaces only the changed word", () => {
    const editor = createEditor("Hello big world");
    const steps = applySteps(editor, [text("Hello small world")]);

    expect(editor.getBlock("p")?.content).toEqual([text("Hello small world")]);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toBeInstanceOf(ReplaceStep);
  });

  it("replaces a changed word with one step, also if it has letters in common", () => {
    const editor = createEditor("The last word");
    const steps = applySteps(editor, [text("The final word")]);

    expect(steps).toHaveLength(1);
    expect(steps[0]).toBeInstanceOf(ReplaceStep);
  });

  it("changes only marks if only the styles changed", () => {
    const editor = createEditor("Hello world");
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

  it("keeps a comment on text that does not change", () => {
    const editor = createEditor("Hello world");
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

  it("does not split emoji", () => {
    const editor = createEditor("I 😀");
    applySteps(editor, [text("I 😁")]);
    expect(editor.getBlock("p")?.content).toEqual([text("I 😁")]);
  });

  it("makes at most 200 steps for a large change of one block, and keeps a comment on its unchanged text", () => {
    // 500 words, and the text changes each one: 500 changed runs.
    const words = Array.from({ length: 500 }, (_, i) => `w${i}`);
    const editor = createEditor(words.join(" "));
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
});
