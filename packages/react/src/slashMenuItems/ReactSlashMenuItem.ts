import {
  BaseSlashMenuItem,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export type ReactSlashMenuItem<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = BaseSlashMenuItem<BSchema, I, S> & {
  group: string;
  icon: JSX.Element;
  hint?: string;
  shortcut?: string;
};
