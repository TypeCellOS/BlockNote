import { BaseSlashMenuItem, BlockNoteEditor } from "@blocknote/core";

export class ReactSlashMenuItem extends BaseSlashMenuItem {
  constructor(
    public readonly name: string,
    public readonly execute: (editor: BlockNoteEditor) => void,
    public readonly aliases: string[] = [],
    public readonly group: string,
    public readonly icon: JSX.Element,
    public readonly hint?: string,
    public readonly shortcut?: string
  ) {
    super(name, execute, aliases);
  }
}
