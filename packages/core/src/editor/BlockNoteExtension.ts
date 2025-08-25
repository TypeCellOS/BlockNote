import { Plugin } from "prosemirror-state";
import { EventEmitter } from "../util/EventEmitter.js";

import { BlockNoteEditor } from "./BlockNoteEditor.js";
import { PartialBlockNoDefaults } from "../schema/index.js";

export abstract class BlockNoteExtension<
  TEvent extends Record<string, any> = any,
> extends EventEmitter<TEvent> {
  public static key(): string {
    throw new Error("You must implement the key method in your extension");
  }

  protected addProsemirrorPlugin(plugin: Plugin) {
    this.plugins.push(plugin);
  }

  public readonly plugins: Plugin[] = [];
  public get priority(): number | undefined {
    return undefined;
  }

  // eslint-disable-next-line
  constructor(..._args: any[]) {
    super();
    // Allow subclasses to have constructors with parameters
    // without this, we can't easily implement BlockNoteEditor.extension(MyExtension) pattern
  }

  /**
   * Input rules for the block
   */
  public inputRules?: InputRule[];

  public keyboardShortcuts?: Record<
    string,
    (ctx: {
      // TODO types
      editor: BlockNoteEditor<any, any, any>;
    }) => boolean
  >;
}

export type InputRule = {
  /**
   * The regex to match when to trigger the input rule
   */
  find: RegExp;
  /**
   * The function to call when the input rule is matched
   * @returns undefined if the input rule should not be triggered, or an object with the type and props to update the block
   */
  replace: (props: {
    /**
     * The result of the regex match
     */
    match: RegExpMatchArray;
    // TODO this will be a Point, when we have the Location API
    /**
     * The range of the text that was matched
     */
    range: { from: number; to: number };
    /**
     * The editor instance
     */
    editor: BlockNoteEditor<any, any, any>;
  }) => undefined | PartialBlockNoDefaults<any, any, any>;
};
