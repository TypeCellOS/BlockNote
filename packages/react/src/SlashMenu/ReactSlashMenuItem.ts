import {
  BaseSlashMenuItem,
  BlockSchema,
  DefaultBlockSchema,
} from "@blocknote/core";

export type ReactSlashMenuItem<
  BSchema extends BlockSchema = DefaultBlockSchema
> = BaseSlashMenuItem<BSchema> & {
  group: string;
  icon: JSX.Element;
  hint?: string;
  shortcut?: string;
};
