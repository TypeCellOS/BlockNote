import {
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  TableHandlesState,
} from "@blocknote/core";
import { DragEvent, FC } from "react";

import { DragHandleMenuProps } from "../SideMenu/DragHandleMenu/DragHandleMenuProps";

type NonUndefined<T> = T extends undefined ? never : T;

export type TableHandleProps<
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
  orientation: "row" | "column";
  index: number;
  dragStart: (e: DragEvent) => void;
  showOtherSide: () => void;
  hideOtherSide: () => void;
  tableHandleMenu?: FC<
    DragHandleMenuProps<
      {
        table: DefaultBlockSchema["table"];
      },
      I,
      S
    >
  >;
} & Pick<TableHandlesState<I, S>, "block"> &
  Pick<
    NonUndefined<
      BlockNoteEditor<
        {
          table: DefaultBlockSchema["table"];
        },
        I,
        S
      >["tableHandles"]
    >,
    "dragEnd" | "freezeHandles" | "unfreezeHandles"
  >;
