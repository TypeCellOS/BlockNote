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

import { DragHandleMenuProps } from "../SideMenu/DragHandleMenu/DragHandleMenuProps.js";

export type TableHandleProps<
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
  orientation: "row" | "column";
  index: number;
  dragStart: (e: DragEvent) => void;
  showOtherSide: () => void;
  hideOtherSide: () => void;
  menuContainer: HTMLDivElement;
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
    "dragEnd" | "freezeHandles" | "unfreezeHandles"
  >;
