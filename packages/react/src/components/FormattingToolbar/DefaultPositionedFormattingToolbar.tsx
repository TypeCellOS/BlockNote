import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
} from "@blocknote/core";
import { FC } from "react";

import { useFormattingToolbarPosition } from "./hooks/useFormattingToolbarPosition";
import { DefaultFormattingToolbar } from "./DefaultFormattingToolbar";

export const DefaultPositionedFormattingToolbar = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema, any, any>;
  formattingToolbar?: FC<{ editor: BlockNoteEditor<BSchema, any, any> }>;
}) => {
  const { isMounted, ref, style } = useFormattingToolbarPosition(props.editor);

  if (!isMounted) {
    return null;
  }

  const FormattingToolbar = props.formattingToolbar || DefaultFormattingToolbar;

  return (
    <div ref={ref} style={style}>
      <FormattingToolbar editor={props.editor} />
    </div>
  );
};
