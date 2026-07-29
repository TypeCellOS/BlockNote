import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";
import { FormulaInlineView } from "./formula/FormulaInline";
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
            editor.openEdit({ kind: "inline", latex: props.inlineContent.props.latex })
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
    // formulaBlock added in Task 4
  },
});

export type FormulaSchema = typeof schema;
