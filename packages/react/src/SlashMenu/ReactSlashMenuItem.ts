import {
  BaseSlashMenuItem,
  BlockNoteEditor,
  BlockSchema,
} from "@blocknote/core";

export type ReactSlashMenuItem<BSchema extends BlockSchema> =
  BaseSlashMenuItem<BSchema> & {
    group: string;
    icon: JSX.Element;
    hint?: string;
    shortcut?: string;
  };

export function createReactSlashMenuItem<BSchema extends BlockSchema>(
  name: string,
  execute: (editor: BlockNoteEditor<BSchema>) => void,
  aliases: string[] = [],
  group: string,
  icon: JSX.Element,
  hint?: string,
  shortcut?: string
): ReactSlashMenuItem<BSchema> {
  return {
    name,
    execute,
    aliases,
    group,
    icon,
    hint,
    shortcut,
    match: (query: string): boolean => {
      return (
        name.toLowerCase().startsWith(query.toLowerCase()) ||
        aliases.filter((alias) =>
          alias.toLowerCase().startsWith(query.toLowerCase())
        ).length !== 0
      );
    },
  };
}
