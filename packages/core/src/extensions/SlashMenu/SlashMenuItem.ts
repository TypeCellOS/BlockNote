import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { EditorFunctions } from "../../api/EditorFunctions";

/**
 * A class that defines a slash command (/<command>).
 *
 * Not to be confused with ProseMirror commands nor TipTap commands.
 */
export class SlashMenuItem implements SuggestionItem {
  /**
   * Constructs a new slash-command.
   *
   * @param name The name of the command
   * @param execute The callback for creating a new node
   * @param aliases Aliases for this command
   */
  constructor(
    public readonly name: string,
    public readonly execute: (editorFunctions: EditorFunctions) => void,
    public readonly aliases: string[] = []
  ) {}

  match(query: string): boolean {
    return (
      this.name.toLowerCase().startsWith(query.toLowerCase()) ||
      this.aliases.filter((alias) =>
        alias.toLowerCase().startsWith(query.toLowerCase())
      ).length !== 0
    );
  }
}
