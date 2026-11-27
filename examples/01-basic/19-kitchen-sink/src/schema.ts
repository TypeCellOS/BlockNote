import { codeBlockOptions } from "@blocknote/code-block";
import {
  BlockNoteSchema,
  createCodeBlockSpec,
  withPageBreak,
} from "@blocknote/core";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import { withMultiColumn } from "@blocknote/xl-multi-column";

export const schema = withMultiColumn(
  withPageBreak(BlockNoteSchema.create()),
).extend({
  blockSpecs: {
    codeBlock: createCodeBlockSpec(codeBlockOptions),
    mathBlock: createReactMathBlockSpec(),
    diagram: createReactDiagramBlockSpec(),
  },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});
export type KitchenSinkBlock = typeof schema.PartialBlock;
export type KitchenSinkEditor = typeof schema.BlockNoteEditor;
