import { BlockNoteEditor, getBlock } from "@blocknote/core";
import { updateToReplaceSteps } from "../../../../prosemirror/changeset.js";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";
import { applyOperations } from "../../../executor/streamOperations/applyOperations.js";
import { StreamToolCall } from "../../../streamTool/streamTool.js";
import { toJSONToolCalls } from "./toJSONToolCalls.js";

export async function* applyHTMLOperations(
  editor: BlockNoteEditor<any, any, any>,
  operationsSource: AsyncIterable<{
    operation: StreamToolCall<any>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  updateFromPos?: number,
  updateToPos?: number
) {
  const jsonToolCalls = toJSONToolCalls(editor, operationsSource);

  yield* applyOperations(
    editor,
    jsonToolCalls,
    async (id) => {
      const tr = getApplySuggestionsTr(editor);
      const block = getBlock(editor, id, tr.doc);
      if (!block) {
        // debugger;
        throw new Error("block not found");
      }
      const html = await editor.blocksToHTMLLossy([block]);
      const blocks = await editor.tryParseHTMLToBlocks(html);
      if (blocks.length !== 1) {
        throw new Error("html diff invalid block count");
      }
      const htmlBlock = blocks[0];
      htmlBlock.id = id;
      // console.log(html);
      // console.log(JSON.stringify(blocks, null, 2));
      const steps = updateToReplaceSteps(
        editor,
        {
          id,
          block: htmlBlock,
          type: "update",
        },
        tr.doc
      );

      if (steps.length) {
        console.error("html diff", steps);
        // throw new Error("html diff");
      }
      // const stepMapping = new Mapping();
      // for (const step of steps) {
      //   const mapped = step.map(stepMapping);
      //   if (!mapped) {
      //     throw new Error("Failed to map step");
      //   }
      //   tr.step(mapped);
      //   stepMapping.appendMap(mapped.getMap());
      // }

      return rebaseTool(editor, tr);
    },
    {
      withDelays: true, // TODO: make configurable
    },
    updateFromPos,
    updateToPos
  );
}
