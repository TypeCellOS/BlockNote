import { BlockNoteEditor, getBlock } from "@blocknote/core";
import { Mapping } from "prosemirror-transform";
import { updateToReplaceSteps } from "../../../../prosemirror/changeset.js";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";

export function createMDRebaseTool(
  id: string,
  editor: BlockNoteEditor<any, any, any>,
) {
  const tr = getApplySuggestionsTr(editor);
  const block = getBlock(tr.doc, id);
  if (!block) {
    throw new Error("block not found");
  }
  const md = editor.blocksToMarkdownLossy([block]);
  const blocks = editor.tryParseMarkdownToBlocks(md);

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
