import {
  BlockNoteEditor,
  getBlockInfo,
  getNodeById,
  PartialBlock,
} from "@blocknote/core";
import { Fragment, Slice } from "prosemirror-model";
import { Mapping, ReplaceStep } from "prosemirror-transform";
import { describe, expect, it } from "vitest";
import { UpdateBlockToolCall } from "../api/tools/createUpdateBlockTool.js";
import { testUpdateOperations } from "../testUtil/updates/updateOperations.js";
import { agentStepToTr, getStepsAsAgent } from "./agent.js";
import { updateToReplaceSteps } from "./changeset.js";

describe("getStepsAsAgent", () => {
  // some basic tests to check `getStepsAsAgent` is working as expected

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

  it("simple replace step", async () => {
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

  // TODO: should include selection and result in a change-tracked update?
  it("node type change", async () => {
    const editor = createTestEditor();

    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", editor.prosemirrorState.doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const tr = editor.prosemirrorState.tr.setNodeMarkup(
      block.blockContent.beforePos,
      editor.pmSchema.nodes.heading
    );

    expect(tr.steps.length).toBe(1);

    // Apply the step
    const steps = getStepsAsAgent(editor, tr.steps);

    // Verify dispatch was called with the correct transactions
    expect(steps).toHaveLength(1); // select, replace, insert

    expect(steps).toMatchSnapshot();
  });

  // TODO: should include selection and result in a change-tracked update?
  it("node attr change", async () => {
    const editor = createTestEditor();

    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", editor.prosemirrorState.doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const tr = editor.prosemirrorState.tr.setNodeMarkup(
      block.blockContent.beforePos,
      undefined,
      {
        textAlignment: "right",
      }
    );

    expect(tr.steps.length).toBe(1);

    // Apply the step
    const steps = getStepsAsAgent(editor, tr.steps);

    // Verify dispatch was called with the correct transactions
    expect(steps).toHaveLength(1); // select, replace, insert

    expect(steps).toMatchSnapshot();
  });

  // TODO: should include selection and result in a change-tracked update?
  it("node type and content change", async () => {
    const editor = createTestEditor();

    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", editor.prosemirrorState.doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const step = new ReplaceStep(
      block.blockContent.beforePos,
      block.blockContent.beforePos + 3,
      // for simplicity, we're not actually changing the node type and content, but we just use the existing document
      // as replacement content
      editor.prosemirrorState.doc.slice(
        block.blockContent.beforePos,
        block.blockContent.beforePos + 3
      )
    );

    await expect(() => getStepsAsAgent(editor, [step])).toThrow(
      "Slice has openStart or openEnd > 0, but structure=false"
    );
  });

  it("multiple steps", async () => {
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

  it("throw error for non-ReplaceSteps", async () => {
    const editor = createTestEditor();

    // Create a non-ReplaceStep (we'll just mock it)
    const nonReplaceStep = { from: 0, to: 5 } as any;

    // Expect the function to throw an error
    await expect(() => getStepsAsAgent(editor, [nonReplaceStep])).toThrow(
      "Step is not a ReplaceStep"
    );
  });
});

describe("agentStepToTr", () => {
  // larger test to see if applying the steps work as expected

  async function testUpdate(
    editor: BlockNoteEditor<any, any, any>,
    update: UpdateBlockToolCall<PartialBlock<any, any, any>>["block"],
    blockId: string
  ) {
    const steps = updateToReplaceSteps(
      editor,
      {
        id: blockId,
        type: "update",
        block: update,
      },
      editor.prosemirrorState.doc
    );

    const agentSteps = getStepsAsAgent(editor, steps);

    const results = [];
    const trMapping = new Mapping();
    for (const step of agentSteps) {
      const tr = await agentStepToTr(editor, step, { withDelays: false });
      trMapping.appendMapping(tr.mapping);

      editor.dispatch(tr);
      results.push(
        step.type.slice(0, 1).toUpperCase() +
          "	" +
          JSON.stringify(editor.prosemirrorState.doc.toJSON())
      );
    }

    expect(results).toMatchSnapshot();
  }

  for (const test of testUpdateOperations) {
    it(`${test.description}`, async () => {
      const editor = test.editor();
      editor._tiptapEditor.forceEnablePlugins();
      await testUpdate(editor, test.updateOp.block, test.updateOp.id);
    });
  }
});
