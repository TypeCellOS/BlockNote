import {
  BaseSlashMenuItem,
  BlockNoteEditor,
  BlockSchema,
} from "@blocknote/core";

export class ReactSlashMenuItem<
  BSchema extends BlockSchema
> extends BaseSlashMenuItem<BSchema> {
  constructor(
    public readonly name: string,
    public readonly execute: (editor: BlockNoteEditor<BSchema>) => void,
    public readonly aliases: string[] = [],
    public readonly group: string,
    public readonly icon: JSX.Element,
    public readonly hint?: string,
    public readonly shortcut?: string
  ) {
    super(name, execute, aliases);
  }
}
