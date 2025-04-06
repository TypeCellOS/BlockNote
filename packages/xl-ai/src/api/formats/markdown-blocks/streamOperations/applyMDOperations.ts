import {
  BlockNoteEditor,
  getBlock
} from "@blocknote/core";
  
  import { Mapping } from "prosemirror-transform";
import { updateToReplaceSteps } from "../../../../prosemirror/changeset.js";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";
import {
  applyOperations
} from "../../../executor/streamOperations/applyOperations.js";
import { StreamToolCall } from "../../../streamTool/streamTool.js";
import { toJSONToolCalls } from "./toJSONToolCalls.js";
  
  export async function* applyMDOperations(
    editor: BlockNoteEditor<any, any, any>,
    operationsSource: AsyncIterable<{
        operation: StreamToolCall<any>;
        isUpdateToPreviousOperation: boolean;
        isPossiblyPartial: boolean;
      }>,
      updateFromPos?: number,
      updateToPos?: number
  ){
    const jsonToolCalls = toJSONToolCalls(
      editor,
      operationsSource
    );
  
    yield* applyOperations(
      editor,
      jsonToolCalls,
      async (id) => {
        const tr = getApplySuggestionsTr(editor);
        const md = await editor.blocksToMarkdownLossy([
          getBlock(editor, id, tr.doc)!,
        ]);
        const blocks = await editor.tryParseMarkdownToBlocks(md);
  
        const steps = updateToReplaceSteps(
          editor,
          {
            id,
            block: blocks[0],
            type: "update",
          },
          tr.doc
        );
  
        const stepMapping = new Mapping();
        for (const step of steps) {
          const mapped = step.map(stepMapping);
          if (!mapped) {
            throw new Error("Failed to map step");
          }
          tr.step(mapped);
          stepMapping.appendMap(mapped.getMap());
        }
  
        return rebaseTool(editor, tr);
      
      },
      {
        withDelays: true, // TODO: make configurable
      },
      updateFromPos,
      updateToPos
    );
  
   
  }
  