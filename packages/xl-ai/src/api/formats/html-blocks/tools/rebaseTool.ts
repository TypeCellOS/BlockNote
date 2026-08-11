import { BlockNoteEditor, getBlock } from "@blocknote/core";
import { Mapping } from "prosemirror-transform";
import { updateToReplaceSteps } from "../../../../prosemirror/changeset.js";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";

export function createHTMLRebaseTool(
  id: string,
  editor: BlockNoteEditor<any, any, any>,
) {
  const tr = getApplySuggestionsTr(editor);
  const block = getBlock(tr.doc, id);
  if (!block) {
    throw new Error("block not found");
  }

  const html = editor.blocksToHTMLLossy([
    {
      ...block,
      children: [],
    },
  ]);

  const initialMockID = (window as any).__TEST_OPTIONS?.mockID;

  const blocks = editor.tryParseHTMLToBlocks(html);

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

  // The HTML round-trip isn't always lossless: marks that aren't part of the
  // BlockNote document model (`blocknoteIgnore`, e.g. comments) don't survive
  // it. Apply the difference to the projection, so operations are applied to
  // the document as the HTML format sees it, and are then rebased onto the
  // actual document (same as `createMDRebaseTool` does for markdown).
  const stepMapping = new Mapping();
  for (const step of steps) {
    const mapped = step.map(stepMapping);
    if (!mapped) {
      throw new Error("html diff", {
        cause: {
          html,
          htmlBlock,
        },
      });
    }
    tr.step(mapped);
    stepMapping.appendMap(mapped.getMap());
  }

  return rebaseTool(editor, tr);
}
