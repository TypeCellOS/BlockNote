import {
  BlockNoteEditor,
  DefaultBlockSchema,
  SpecificBlock,
} from "@blocknote/core";

export type TableHandleMenuProps<
  BSchema extends { table: DefaultBlockSchema["table"] }
> = {
  orientation: "row" | "column";
  editor: BlockNoteEditor<BSchema, any, any>;
  block: SpecificBlock<
    { table: DefaultBlockSchema["table"] },
    "table",
    any,
    any
  >;
  index: number;
};