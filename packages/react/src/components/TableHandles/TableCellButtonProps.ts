import {
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  TableHandlesState,
} from "@blocknote/core";
import { TableCellMenuProps } from "./TableCellMenu/TableCellMenuProps.js";
import { FC } from "react";

export type TableCellButtonProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = {
  editor: BlockNoteEditor<
    {
      table: DefaultBlockSchema["table"];
    },
    I,
    S
  >;
  rowIndex: number;
  colIndex: number;
  menuContainer: HTMLDivElement;
  tableCellMenu?: FC<TableCellMenuProps<I, S>>;
} & Pick<TableHandlesState<I, S>, "block"> &
  Pick<
    Exclude<
      BlockNoteEditor<
        {
          table: DefaultBlockSchema["table"];
        },
        I,
        S
      >["tableHandles"],
      undefined
    >,
    "freezeHandles" | "unfreezeHandles"
  >;
