import { BlockNoteEditor, getBlockInfo, getNodeById } from "@blocknote/core";
import { Fragment, Slice } from "prosemirror-model";
import { ReplaceStep, Transform } from "prosemirror-transform";
import { describe, expect, it } from "vitest";
import { getAIExtension } from "../AIExtension.js";
import {
  DocumentOperationTestCase,
  getExpectedEditor,
} from "../testUtil/cases/index.js";
import { updateOperationTestCases } from "../testUtil/cases/updateOperationTestCases.js";
import { validateRejectingResultsInOriginalDoc } from "../testUtil/suggestChangesTestUtil.js";
import { applyAgentStep, getStepsAsAgent } from "./agent.js";
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
    const doc = editor.prosemirrorState.doc;
    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", doc)!;
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

    const tr = new Transform(doc);
    tr.step(new ReplaceStep(from, to, new Slice(fragment, 0, 0)));

    // Apply the step
    const steps = getStepsAsAgent(tr);

    // Verify dispatch was called with the correct transactions
    expect(steps).toHaveLength(3); // select, replace, insert

    expect(steps).toMatchSnapshot();
  });

  it("node type change", async () => {
    const editor = createTestEditor();
    const doc = editor.prosemirrorState.doc;
    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const tr = editor.prosemirrorState.tr.setNodeMarkup(
      block.blockContent.beforePos,
      editor.pmSchema.nodes.heading,
    );

    expect(tr.steps.length).toBe(1);

    // Apply the step
    const steps = getStepsAsAgent(tr);

    // Verify dispatch was called with the correct transactions
    expect(steps).toHaveLength(1); // select, replace, insert

    expect(steps).toMatchSnapshot();
  });

  it("node attr change", async () => {
    const editor = createTestEditor();
    const doc = editor.prosemirrorState.doc;
    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const tr = editor.prosemirrorState.tr.setNodeMarkup(
      block.blockContent.beforePos,
      undefined,
      {
        textAlignment: "right",
      },
    );

    expect(tr.steps.length).toBe(1);

    // Apply the step
    const steps = getStepsAsAgent(tr);

    // Verify dispatch was called with the correct transactions
    expect(steps).toHaveLength(1); // select, replace, insert

    expect(steps).toMatchSnapshot();
  });

  it("node type and content change", async () => {
    const editor = createTestEditor();

    const doc = editor.prosemirrorState.doc;
    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", doc)!;
    const block = getBlockInfo(blockPos);
    if (!block.isBlockContainer) {
      throw new Error("Block is not a container");
    }

    const step = new ReplaceStep(
      block.blockContent.beforePos,
      block.blockContent.beforePos + 3,
      // for simplicity, we're not actually changing the node type and content, but we just use the existing document
      // as replacement content
      doc.slice(block.blockContent.beforePos, block.blockContent.beforePos + 3),
    );

    const tr = new Transform(doc);
    tr.step(step);

    await expect(() => getStepsAsAgent(tr)).toThrow(
      "Slice has openStart or openEnd > 0, but structure=false",
    );
  });

  it("multiple steps", async () => {
    const editor = createTestEditor();
    const doc = editor.prosemirrorState.doc;

    const tr = new Transform(doc);

    // Get the position of the content in the paragraph
    const blockPos = getNodeById("1", doc)!;
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
      new Slice(fragment1, 0, 0),
    );
    tr.step(step1);

    // 2. Replace "world" with "there"
    const fragment2 = Fragment.from(editor.pmSchema.text("there"));
    const step2 = new ReplaceStep(
      contentStart + 8 - 3,
      contentStart + 13 - 3,
      new Slice(fragment2, 0, 0),
    );
    tr.step(step2);

    // Apply the steps
    const steps = getStepsAsAgent(tr);

    // Verify dispatch was called for each step
    // For each step: select, replace, and potentially multiple inserts
    expect(steps).toHaveLength(9);

    expect(steps).toMatchSnapshot();
  });

  it("throw error for non-ReplaceSteps", async () => {
    const editor = createTestEditor();
    const doc = editor.prosemirrorState.doc;
    // Create a non-ReplaceStep (we'll just mock it)
    const tr = new Transform(doc);
    tr.addMark(0, 5, editor.pmSchema.marks.bold.create());
    // Expect the function to throw an error
    await expect(() => getStepsAsAgent(tr)).toThrow(
      "Step is not a ReplaceStep",
    );
  });
});

async function executeTestCase(
  editor: BlockNoteEditor<any, any, any>,
  test: DocumentOperationTestCase,
) {
  const results = [];
  const doc = editor.prosemirrorState.doc;
  for (const updateOp of test.baseToolCalls) {
    if (updateOp.type !== "update") {
      throw new Error("Only update operations are supported");
    }
    const blockId = updateOp.id;
    const update = updateOp.block;

    const selection = test.getTestSelection?.(editor);

    const steps = updateToReplaceSteps(
      {
        id: blockId,
        block: update,
      },
      doc,
      undefined,
      selection?.from,
      selection?.to,
    );

    const tr = new Transform(doc);
    for (const step of steps) {
      tr.step(step.map(tr.mapping)!);
    }
    const agentSteps = getStepsAsAgent(tr);

    for (const step of agentSteps) {
      editor.transact((tr) => {
        applyAgentStep(tr, step);
      });
      results.push(
        step.type.slice(0, 1).toUpperCase() +
          "	" +
          JSON.stringify(editor.prosemirrorState.doc.toJSON()),
      );
    }
  }

  validateRejectingResultsInOriginalDoc(editor, doc);
  expect(results).toMatchSnapshot();

  getAIExtension(editor).acceptChanges();
  expect(editor.document).toEqual(getExpectedEditor(test).document);

  return results;
}

describe("agentStepToTr", () => {
  // larger test to see if applying the steps work as expected

  // REC: we might also want to test Insert / combined / delete test cases here,
  // but this is a little more complex because currently `executeTestCase` expects
  // relies directly on `updateToReplaceSteps` which is designed for the update op.
  describe("Update", () => {
    for (const test of updateOperationTestCases) {
      it(`${test.description}`, async () => {
        const editor = test.editor();

        await executeTestCase(editor, test);
      });
    }
  });
});
