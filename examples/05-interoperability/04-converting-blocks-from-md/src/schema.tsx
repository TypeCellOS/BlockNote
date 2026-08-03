import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import {
  createReactInlineContentSpec,
  createReactBlockSpec,
} from "@blocknote/react";
import { FormulaInlineView } from "./formula/FormulaInline";
import { FormulaBlockView } from "./formula/FormulaBlock";
import { useFormulaEditor } from "./formula/formulaContext";

export const formulaInline = createReactInlineContentSpec(
  {
    type: "formulaInline",
    propSchema: {
      latex: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const editor = useFormulaEditor();
      return (
        <FormulaInlineView
          latex={props.inlineContent.props.latex}
          onOpenEditor={() =>
            editor.openEdit({
              kind: "inline",
              latex: props.inlineContent.props.latex,
            })
          }
        />
      );
    },
  },
);

export const formulaBlock = createReactBlockSpec(
  {
    type: "formulaBlock",
    propSchema: {
      latex: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const editor = useFormulaEditor();
      return (
        <FormulaBlockView
          latex={props.block.props.latex}
          onOpenEditor={() =>
            editor.openEdit({
              kind: "block",
              latex: props.block.props.latex,
              blockId: props.block.id,
            })
          }
        />
      );
    },
  },
);

export const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    formulaInline,
  },
  blockSpecs: {
    ...defaultBlockSpecs,
    formulaBlock: formulaBlock(),
  },
});

export type FormulaSchema = typeof schema;
