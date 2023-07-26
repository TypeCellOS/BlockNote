import { BaseSlashMenuItem, BlockSchema } from "@blocknote/core";

export type ReactSlashMenuItem<BSchema extends BlockSchema> =
  BaseSlashMenuItem<BSchema> & {
    group: string;
    icon: JSX.Element;
    hint?: string;
    shortcut?: string;
  };
