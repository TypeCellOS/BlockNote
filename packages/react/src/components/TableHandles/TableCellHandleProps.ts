import {
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  TableHandlesState,
} from "@blocknote/core";
import { TableCellHandleMenuProps } from "./TableCellHandleMenu/TableCellHandleMenuProps.js";
import { FC } from "react";

export type TableCellHandleProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
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
  tableCellHandleMenu?: FC<TableCellHandleMenuProps<I, S>>;
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
