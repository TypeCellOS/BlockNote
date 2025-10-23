import { Store } from "@tanstack/store";
import { AnyExtension } from "@tiptap/core";
import { BlockNoteEditor } from "../../BlockNoteEditor.js";
import { PartialBlockNoDefaults } from "../../../schema/index.js";
import { Plugin } from "prosemirror-state";

/**
 * This function is called when the extension is destroyed.
 */
type OnDestroy = () => void;

/**
 * Describes a BlockNote extension.
 */
export interface Extension<Key extends string = string, State = any> {
  /**
   * The unique identifier for the extension.
   */
  key: Key;

  /**
   * Triggered when the extension is mounted to the editor.
   */
  init?: (ctx: {
    /**
     * The DOM element that the editor is mounted to.
     */
    dom: HTMLElement;
    /**
     * The root document of the {@link document} that the editor is mounted to.
     */
    root: Document | ShadowRoot;
    /**
     * An {@link AbortController} that will be aborted when the extension is destroyed.
     */
    abortController: AbortController;
  }) => void | OnDestroy;

  /**
   * The store for the extension.
   */
  store?: Store<State>;

  /**
   * Declares what {@link Extension}s that this extension depends on.
   */
  dependsOn?: string[];

  /**
   * Input rules for a block: An input rule is what is used to replace text in a block when a regular expression match is found.
   * As an example, typing `#` in a paragraph block will trigger an input rule to replace the text with a heading block.
   */
  inputRules?: InputRule[];

  /**
   * A mapping of a keyboard shortcut to a function that will be called when the shortcut is pressed
   *
   * The keys are in the format:
   * - Key names may be strings like `Shift-Ctrl-Enter`—a key identifier prefixed with zero or more modifiers
   * - Key identifiers are based on the strings that can appear in KeyEvent.key
   * - Use lowercase letters to refer to letter keys (or uppercase letters if you want shift to be held)
   * - You may use `Space` as an alias for the " " name
   * - Modifiers can be given in any order: `Shift-` (or `s-`), `Alt-` (or `a-`), `Ctrl-` (or `c-` or `Control-`) and `Cmd-` (or `m-` or `Meta-`)
   * - For characters that are created by holding shift, the Shift- prefix is implied, and should not be added explicitly
   * - You can use Mod- as a shorthand for Cmd- on Mac and Ctrl- on other platforms
   *
   * @example
   * ```typescript
   * keyboardShortcuts: {
   *   "Mod-Enter": (ctx) => {  return true; },
   *   "Shift-Ctrl-Space": (ctx) => { return true; },
   *   "a": (ctx) => { return true; },
   *   "Space": (ctx) => { return true; }
   * }
   * ```
   */
  keyboardShortcuts?: Record<
    string,
    (ctx: { editor: BlockNoteEditor }) => boolean
  >;

  /**
   * Add additional prosemirror plugins to the editor.
   */
  plugins?: Plugin[];

  /**
   * Add additional tiptap extensions to the editor.
   */
  tiptapExtensions?: AnyExtension[];
}

/**
 * An input rule is what is used to replace text in a block when a regular expression match is found.
 * As an example, typing `#` in a paragraph block will trigger an input rule to replace the text with a heading block.
 */
type InputRule = {
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

export type ExtensionFactory<
  Key extends string = string,
  State = any,
  Options = any,
> = (editor: BlockNoteEditor, options: Options) => Extension<Key, State>;

/**
 * Helper function to create a BlockNote extension.
 */
export function createExtension<
  Key extends string = string,
  State = any,
  T extends ExtensionFactory<Key, State> = ExtensionFactory<Key, State>,
>(plugin: T): T {
  return plugin;
}

export function createStore<T = any>(initialState: T): Store<T> {
  return new Store(initialState);
}
