import { BlockNoteEditor, getBlock } from "@blocknote/core";
import { updateToReplaceSteps } from "../../../../prosemirror/changeset.js";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";

export async function createHTMLRebaseTool(
  id: string,
  editor: BlockNoteEditor<any, any, any>,
) {
  const tr = getApplySuggestionsTr(editor);
  const block = getBlock(tr.doc, id);
  if (!block) {
    throw new Error("block not found");
  }

  const html = await editor.blocksToHTMLLossy([
    {
      ...block,
      children: [],
    },
  ]);

  const initialMockID = (window as any).__TEST_OPTIONS?.mockID;

  const blocks = await editor.tryParseHTMLToBlocks(html);

  // hacky
  if ((window as any).__TEST_OPTIONS) {
    (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID =
      initialMockID;
  }

  if (blocks.length !== 1) {
    throw new Error("html diff invalid block count");
  }

  const htmlBlock = blocks[0];
  htmlBlock.id = id;

  const steps = updateToReplaceSteps(
    {
      id,
      block: htmlBlock,
    },
    tr.doc,
  );

  if (steps.length) {
    // console.error("html diff", steps);
    throw new Error("html diff");
  }

  return rebaseTool(editor, tr);
}
