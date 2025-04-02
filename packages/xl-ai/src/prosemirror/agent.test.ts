import { BlockNoteEditor, getBlockInfo, getNodeById } from "@blocknote/core";
import { Fragment, Slice } from "prosemirror-model";
import { ReplaceStep } from "prosemirror-transform";
import { describe, expect, it } from "vitest";
import { getStepsAsAgent } from "./agent.js";

describe("applyStepsAsAgent", () => {
  // Helper function to create a test editor with a simple paragraph
  function createTestEditor() {
    return BlockNoteEditor.create({
      initialContent: [
        {
          id: "1",
          type: "paragraph",
          content: "Hello, world!",
        },
      ],
    });
  }

  it("should apply a simple replace step", async () => {
    const editor = createTestEditor();

    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", editor.prosemirrorState.doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const contentStart = block.blockContent.beforePos;

    // Create a ReplaceStep that replaces "Hello" with "Hi"
    const from = contentStart + 1; // +1 to skip the initial position
    const to = contentStart + 6; // "Hello" is 5 characters

    // Create a slice using the editor's schema
    const fragment = Fragment.from(editor.pmSchema.text("Hi"));

    // const slice = fragment.slice(0, fragment.content.size);

    const step = new ReplaceStep(from, to, new Slice(fragment, 0, 0));

    // Apply the step
    const steps = getStepsAsAgent(editor, [step]);

    // Verify dispatch was called with the correct transactions
    expect(steps).toHaveLength(3); // select, replace, insert

    expect(steps).toMatchSnapshot();
  });

  it("should handle multiple steps", async () => {
    const editor = createTestEditor();

    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", editor.prosemirrorState.doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const contentStart = block.blockContent.beforePos;

    // Create two ReplaceSteps
    // 1. Replace "Hello" with "Hi"
    const fragment1 = Fragment.from(editor.pmSchema.text("Hi"));
    const step1 = new ReplaceStep(
      contentStart + 1,
      contentStart + 6,
      new Slice(fragment1, 0, 0)
    );

    // 2. Replace "world" with "there"
    const fragment2 = Fragment.from(editor.pmSchema.text("there"));
    const step2 = new ReplaceStep(
      contentStart + 8,
      contentStart + 13,
      new Slice(fragment2, 0, 0)
    );

    // Apply the steps
    const steps = getStepsAsAgent(editor, [step1, step2]);

    // Verify dispatch was called for each step
    // For each step: select, replace, and potentially multiple inserts
    expect(steps).toHaveLength(9);

    expect(steps).toMatchSnapshot();
  });

  it("should throw an error for non-ReplaceSteps", async () => {
    const editor = createTestEditor();

    // Create a non-ReplaceStep (we'll just mock it)
    const nonReplaceStep = { from: 0, to: 5 } as any;

    // Expect the function to throw an error
    await expect(getStepsAsAgent(editor, [nonReplaceStep])).rejects.toThrow(
      "Step is not a ReplaceStep"
    );
  });

  it("should throw an error for slices with openStart or openEnd > 0", async () => {
    const editor = createTestEditor();

    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", editor.prosemirrorState.doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const contentStart = block.blockContent.beforePos;

    // Create a custom slice with openEnd > 0 (mocking the behavior)
    const step = new ReplaceStep(contentStart + 1, contentStart + 6, {
      content: editor.pmSchema.text("Hi"),
      openStart: 0,
      openEnd: 1,
      size: 2,
    } as any);

    // Expect the function to throw an error
    await expect(getStepsAsAgent(editor, [step])).rejects.toThrow(
      "Slice has openStart or openEnd > 0"
    );
  });
});
