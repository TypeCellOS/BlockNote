import { BlockNoteEditor, getBlock } from "@blocknote/core";
import { Mapping } from "prosemirror-transform";
import { updateToReplaceSteps } from "../../../../prosemirror/changeset.js";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";

export async function createMDRebaseTool(
  id: string,
  editor: BlockNoteEditor<any, any, any>,
) {
  const tr = getApplySuggestionsTr(editor);
  const md = await editor.blocksToMarkdownLossy([getBlock(tr.doc, id)!]);
  const blocks = await editor.tryParseMarkdownToBlocks(md);

  const steps = updateToReplaceSteps(
    {
      id,
      block: blocks[0],
    },
    tr.doc,
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
}
