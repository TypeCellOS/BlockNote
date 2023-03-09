import { EditorFunctions, BaseSlashMenuItem } from "@blocknote/core";

export class ReactSlashMenuItem extends BaseSlashMenuItem {
  constructor(
    public readonly name: string,
    public readonly execute: (editorFunctions: EditorFunctions) => void,
    public readonly aliases: string[] = [],
    public readonly group: string,
    public readonly icon: JSX.Element,
    public readonly hint?: string,
    public readonly shortcut?: string
  ) {
    super(name, execute, aliases);
  }
}
