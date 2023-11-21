import {
  BaseSlashMenuItem,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
} from "@blocknote/core";
import { StyleSchema } from "@blocknote/core/src/extensions/Blocks/api/styles";

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
