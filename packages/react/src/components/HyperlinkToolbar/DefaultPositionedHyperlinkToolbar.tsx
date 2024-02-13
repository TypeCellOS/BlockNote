import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC } from "react";

import { useHyperlinkToolbarPosition } from "./hooks/useHyperlinkToolbarPosition";
import { DefaultHyperlinkToolbar } from "./DefaultHyperlinkToolbar";

export const DefaultPositionedHyperlinkToolbar = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  hyperlinkToolbar?: FC<{ editor: BlockNoteEditor<BSchema, I, S> }>;
}) => {
  const { isMounted, ref, style } = useHyperlinkToolbarPosition(props.editor);

  if (!isMounted) {
    return null;
  }

  const HyperlinkToolbar = props.hyperlinkToolbar || DefaultHyperlinkToolbar;

  return (
    <div ref={ref} style={style}>
      <HyperlinkToolbar editor={props.editor} />
    </div>
  );
};
