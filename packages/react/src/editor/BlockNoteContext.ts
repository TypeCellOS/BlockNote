import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { createContext, useContext } from "react";

export const BlockNoteContext = createContext<
  BlockNoteEditor<any, any, any> | undefined
>(undefined);

export function useBlockNoteContext<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
>(): BlockNoteEditor<BSchema, ISchema, SSchema> {
  const context = useContext(BlockNoteContext);

  if (!context) {
    throw new Error(
      "useBlockNoteContext must be used within a BlockNoteProvider"
    );
  }
  return context;
}
