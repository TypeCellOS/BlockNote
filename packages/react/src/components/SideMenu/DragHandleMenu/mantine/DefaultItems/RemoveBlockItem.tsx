import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../../../hooks/useBlockNoteEditor";
import { DragHandleMenuProps } from "../../DragHandleMenuProps";

export const RemoveBlockItem = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S> & {
    children: ReactNode;
  }
) => {
  const components = useComponentsContext()!;
  const editor = useBlockNoteEditor<BSchema, I, S>();

  return (
    <components.MenuItem onClick={() => editor.removeBlocks([props.block])}>
      {props.children}
    </components.MenuItem>
  );
};
