import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";

/**
 * A class that defines a slash command (/<command>).
 *
 * (Not to be confused with ProseMirror commands nor TipTap commands.)
 */
export class BaseSlashMenuItem<
  BSchema extends BlockSchema
> extends SuggestionItem {
  /**
   * Constructs a new slash-command.
   *
   * @param name The name of the command
   * @param execute The callback for creating a new node
   * @param aliases Aliases for this command
   */
  constructor(
    public readonly name: string,
    public readonly execute: (editor: BlockNoteEditor<BSchema>) => void,
    public readonly aliases: string[] = []
  ) {
    super(name, (query: string): boolean => {
      return (
        this.name.toLowerCase().startsWith(query.toLowerCase()) ||
        this.aliases.filter((alias) =>
          alias.toLowerCase().startsWith(query.toLowerCase())
        ).length !== 0
      );
    });
  }
}
