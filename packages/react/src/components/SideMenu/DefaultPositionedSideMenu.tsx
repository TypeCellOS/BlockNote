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

import { DefaultSideMenu } from "./DefaultSideMenu";
import { useSideMenuPosition } from "./hooks/useSideMenuPosition";

export const DefaultPositionedSideMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  sideMenu?: FC<{
    editor: BlockNoteEditor<BSchema, I, S>;
  }>;
}) => {
  const { isMounted, ref, style } = useSideMenuPosition(props.editor);

  if (!isMounted) {
    return null;
  }

  const SideMenu = props.sideMenu || DefaultSideMenu;

  return (
    <div ref={ref} style={style}>
      <SideMenu editor={props.editor} />
    </div>
  );
};
