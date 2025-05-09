import {
  BlockNoteEditor,
  prosemirrorSliceToSlicedBlocks,
} from "@blocknote/core";
import { partialBlockToBlockForTesting } from "@shared/formatConversionTestUtil.js";
import { describe, expect, it } from "vitest";
import {
  getTestEditor,
  TestUpdateOperation,
  testUpdateOperations,
} from "../testUtil/updates/updateOperations.js";
import { updateToReplaceSteps } from "./changeset.js";

function testUpdate(
  editor: BlockNoteEditor<any, any, any>,
  test: TestUpdateOperation
) {
  const update = test.updateOp.block;
  const blockId = test.updateOp.id;

  const selection = test.getTestSelection?.(editor);
  const steps = updateToReplaceSteps(
    {
      id: blockId,
      type: "update",
      block: update,
    },
    editor.prosemirrorState.doc,
    undefined,
    selection?.from,
    selection?.to
  );

  const formatted = steps.map((step) => ({
    replaced: editor.prosemirrorState.doc.slice(step.from, step.to).toJSON(),
    step: step,
  }));
  expect(formatted).toMatchSnapshot();

  editor.transact((tr) => {
    for (const step of steps) {
      const mapped = step.map(tr.mapping);
      if (!mapped) {
        throw new Error("Failed to map step");
      }
      tr.step(mapped);
    }
  });

  let block = editor.getBlock(blockId)!;

  if (selection) {
    const selectionInfo = prosemirrorSliceToSlicedBlocks(
      editor.prosemirrorState.doc.slice(selection.from, selection.to, true),
      editor.pmSchema
    );
    block = selectionInfo.blocks[0];
  }

  if (update.type) {
    // eslint-disable-next-line
    expect(block.type).toEqual(update.type);
  }
  if (update.props) {
    // eslint-disable-next-line
    expect(block.props).toMatchObject(update.props);
  }
  if (update.content) {
    const partialBlock = {
      type: block.type,
      ...update,
    };
    // eslint-disable-next-line
    expect(block.content).toEqual(
      partialBlockToBlockForTesting(editor.schema.blockSchema, partialBlock)
        .content
    );
  }
}

for (const test of testUpdateOperations) {
  it(`${test.description}`, async () => {
    testUpdate(test.editor(), test);
  });
}

describe("dontReplaceContentAtEnd=true", () => {
  it("keeps content at end of block", async () => {
    const editor = getTestEditor();
    const steps = updateToReplaceSteps(
      {
        id: "ref1",
        type: "update",
        block: {
          content: [{ type: "text", text: "Hello" }],
        },
      },
      editor.prosemirrorState.doc,
      true
    );

    expect(steps).toEqual([]);
  });

  it("keeps content at end of block (mark update)", async () => {
    const editor = getTestEditor();
    const steps = updateToReplaceSteps(
      {
        id: "ref1",
        type: "update",
        block: {
          content: [
            { type: "text", text: "Hello, " },
            { type: "text", text: "wo", styles: { bold: true } },
          ],
        },
      },
      editor.prosemirrorState.doc,
      true
    );

    expect(steps).toEqual([]);
  });
});
