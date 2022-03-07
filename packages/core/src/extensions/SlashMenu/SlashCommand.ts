import { Editor, Range } from "@tiptap/core";
import SuggestionItem from "../../shared/plugins/suggestion/SuggestionItem";

export type SlashCommandCallback = (editor: Editor, range: Range) => boolean;

export enum CommandGroup {
  HEADINGS = "Headings",
  BASIC_BLOCKS = "Basic Blocks",
  CODE = "Code Blocks",

  // Just some examples, that are not currently in use
  INLINE = "Inline",
  EMBED = "Embed",
  PLUGIN = "Plugin",
}

/**
 * A class that defines a slash command (/<command>).
 *
 * Not to be confused with ProseMirror commands nor TipTap commands.
 */
export class SlashCommand implements SuggestionItem {
  groupName: string;
  // other parameters initialized in the constructor

  /**
   * Constructs a new slash-command.
   *
   * @param name The name of the command
   * @param group Used to organize the menu
   * @param execute The callback for creating a new node
   * @param aliases Aliases for this command
   * @param icon To be shown next to the name in the menu
   * @param shortcut Info about keyboard shortcut that would activate this command
   */
  constructor(
    public readonly name: string,
    public readonly group: CommandGroup,
    public readonly execute: SlashCommandCallback,
    public readonly aliases: string[] = [],
    public readonly icon?: React.ComponentType<{ className: string }>,
    public readonly hint?: string,
    public readonly shortcut?: string
  ) {
    this.groupName = group;
  }

  match(query: string): boolean {
    return (
      this.name.toLowerCase().startsWith(query.toLowerCase()) ||
      this.aliases.filter((alias) =>
        alias.toLowerCase().startsWith(query.toLowerCase())
      ).length !== 0
    );
  }
}
