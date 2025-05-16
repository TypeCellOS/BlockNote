import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { DragHandleMenuProps } from "../DragHandleMenuProps.js";

export const RemoveBlockItem = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: DragHandleMenuProps<BSchema, I, S> & {
    children: ReactNode;
  },
) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<BSchema, I, S>();

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      onClick={() => editor.removeBlocks([props.block])}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
};
