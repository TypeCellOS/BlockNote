import {
  BlockNoteEditor,
  PartialBlock,
  partialBlockToBlockForTesting,
} from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { UpdateBlockToolCall } from "../api/tools/createUpdateBlockTool.js";
import {
  getTestEditor,
  testUpdateOperations,
} from "../testUtil/updates/updateOperations.js";
import { updateToReplaceSteps } from "./changeset.js";

function testUpdate(
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
  const formatted = steps.map((step) => ({
    replaced: editor.prosemirrorState.doc.slice(step.from, step.to).toJSON(),
    step: step,
  }));
  expect(formatted).toMatchSnapshot();

  const tr = editor.prosemirrorState.tr;
  for (const step of steps) {
    const mapped = step.map(tr.mapping);
    if (!mapped) {
      throw new Error("Failed to map step");
    }
    tr.step(mapped);
  }
  editor.dispatch(tr);

  const block = editor.getBlock(blockId)!;
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
    testUpdate(test.editor(), test.updateOp.block, test.updateOp.id);
  });
}

describe("dontReplaceContentAtEnd=true", () => {
  it("keeps content at end of block", async () => {
    const editor = getTestEditor();
    const steps = updateToReplaceSteps(
      editor,
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
      editor,
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
