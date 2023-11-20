import {
  BaseSlashMenuItem,
  BlockSchema,
  DefaultBlockSchema,
  DefaultStyleSchema,
} from "@blocknote/core";
import { StyleSchema } from "@blocknote/core/src/extensions/Blocks/api/styles";

export type ReactSlashMenuItem<
  BSchema extends BlockSchema = DefaultBlockSchema,
  S extends StyleSchema = DefaultStyleSchema
> = BaseSlashMenuItem<BSchema, S> & {
  group: string;
  icon: JSX.Element;
  hint?: string;
  shortcut?: string;
};
