import {
  BlockNoteEditor,
  BlockNoteSchema,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { createContext, useContext, useState } from "react";

export type BlockNoteContextValue<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> = {
  setContentEditableProps?: ReturnType<typeof useState<Record<string, any>>>[1]; // copy type of setXXX from useState
  editor?: BlockNoteEditor<BSchema, ISchema, SSchema>;
  colorSchemePreference?: "light" | "dark";
};

export const BlockNoteContext = createContext<
  BlockNoteContextValue | undefined
>(undefined);

/**
 * Get the BlockNoteContext instance from the nearest BlockNoteContext provider
 * @param _schema: optional, pass in the schema to return type-safe Context if you're using a custom schema
 */
export function useBlockNoteContext<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
>(
  _schema?: BlockNoteSchema<BSchema, ISchema, SSchema>,
): BlockNoteContextValue<BSchema, ISchema, SSchema> | undefined {
  const context = useContext(BlockNoteContext) as any;

  return context;
}
