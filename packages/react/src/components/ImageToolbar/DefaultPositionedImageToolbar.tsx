import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  InlineContentSchema,
} from "@blocknote/core";
import { FC } from "react";

import { DefaultImageToolbar } from "./DefaultImageToolbar";
import { useImageToolbarPosition } from "./hooks/useImageToolbarPosition";

export const DefaultPositionedImageToolbar = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, any>;
  imageToolbar?: FC<{ editor: BlockNoteEditor<BSchema, I, any> }>;
}) => {
  const { isMounted, ref, style } = useImageToolbarPosition(props.editor);

  if (!isMounted) {
    return null;
  }

  const ImageToolbar = props.imageToolbar || DefaultImageToolbar;

  return (
    <div ref={ref} style={style}>
      <ImageToolbar editor={props.editor} />
    </div>
  );
};
