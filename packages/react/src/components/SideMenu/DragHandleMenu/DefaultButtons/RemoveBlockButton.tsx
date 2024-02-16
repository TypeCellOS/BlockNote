import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import type { DragHandleMenuProps } from "../DragHandleMenu";
import { DragHandleMenuItem } from "../DragHandleMenuItem";
import { useBlockNoteEditor } from "../../../../editor/BlockNoteContext";

export const RemoveBlockButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S> & {
    children: ReactNode;
  }
) => {
  const editor = useBlockNoteEditor<BSchema, I, S>();

  return (
    <DragHandleMenuItem onClick={() => editor.removeBlocks([props.block])}>
      {props.children}
    </DragHandleMenuItem>
  );
};
