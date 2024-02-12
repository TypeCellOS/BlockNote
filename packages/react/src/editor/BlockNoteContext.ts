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

type BlockNoteContextValue<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
> = {
  editor?: BlockNoteEditor<BSchema, ISchema, SSchema>;
  colorSchemePreference?: "light" | "dark";
};

export const BlockNoteContext = createContext<
  BlockNoteContextValue | undefined
>(undefined);

export function useBlockNoteContext<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
>(): BlockNoteContextValue<BSchema, ISchema, SSchema> | undefined {
  const context = useContext(BlockNoteContext) as any;

  return context;
}
