import { Store, StoreOptions } from "@tanstack/store";
import { type AnyExtension } from "@tiptap/core";
import type { Plugin } from "prosemirror-state";
import type { PartialBlockNoDefaults } from "../schema/index.js";
import type {
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "./BlockNoteEditor.js";

/**
 * This function is called when the extension is destroyed.
 */
type OnDestroy = () => void;

/**
 * Describes a BlockNote extension.
 */
export interface Extension<State = any, Key extends string = string> {
  /**
   * The unique identifier for the extension.
   */
  readonly key: Key;

  /**
   * Triggered when the extension is mounted to the editor.
   */
  readonly init?: (ctx: {
    /**
     * The DOM element that the editor is mounted to.
     */
    dom: HTMLElement;
    /**
     * The root document of the {@link document} that the editor is mounted to.
     */
    root: Document | ShadowRoot;
    /**
     * An {@link AbortSignal} that will be aborted when the extension is destroyed.
     */
    signal: AbortSignal;
  }) => void | OnDestroy;

  /**
   * The store for the extension.
   */
  readonly store?: Store<State>;

  /**
   * Declares what {@link Extension}s that this extension depends on.
   */
  readonly runsBefore?: ReadonlyArray<string>;

  /**
   * Input rules for a block: An input rule is what is used to replace text in a block when a regular expression match is found.
   * As an example, typing `#` in a paragraph block will trigger an input rule to replace the text with a heading block.
   */
  readonly inputRules?: ReadonlyArray<InputRule>;

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
  readonly keyboardShortcuts?: Record<
    string,
    (ctx: { editor: BlockNoteEditor<any, any, any> }) => boolean
  >;

  /**
   * Add additional prosemirror plugins to the editor.
   */
  readonly plugins?: ReadonlyArray<Plugin>;

  /**
   * Add additional tiptap extensions to the editor.
   */
  readonly tiptapExtensions?: ReadonlyArray<AnyExtension>;
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
  State = any,
  Options extends BlockNoteEditorOptions<
    any,
    any,
    any
  > = BlockNoteEditorOptions<any, any, any>,
  Key extends string = string,
> = (
  editor: BlockNoteEditor<any, any, any>,
  options: Options,
) => Extension<State, Key> | undefined;

export type ExtractExtensionKey<T extends ExtensionFactory | undefined> =
  T extends (
    editor: BlockNoteEditor<any, any, any>,
    options: BlockNoteEditorOptions<any, any, any>,
  ) => Extension<any, infer Key> | undefined
    ? Key
    : never;

export type ExtractExtensionByKey<
  T extends ExtensionFactory<any, any, any>,
  Key extends string,
> = T extends (
  editor: BlockNoteEditor<any, any, any>,
  options: BlockNoteEditorOptions<any, any, any>,
) => Extension<any, Key> | undefined
  ? ReturnType<T>
  : never;

// a type that maps the extension key to the return type of the extension factory
export type ExtensionMap<
  T extends ReadonlyArray<ExtensionFactory | undefined>,
> = {
  [K in ExtractExtensionKey<T[number]>]: ExtractExtensionByKey<
    Exclude<T[number], undefined>,
    K
  >;
};

/**
 * Helper function to create a BlockNote extension.
 * Can accept either an ExtensionFactory (function) or an Extension (object).
 * If an Extension is provided, it will be wrapped in a factory function.
 */
export function createExtension<const T extends ExtensionFactory>(ext: T): T;
export function createExtension<const Key extends string, const State = any>(
  ext: Extension<State, Key>,
): () => Extension<State, Key>;
export function createExtension<
  const T extends ExtensionFactory | Extension | undefined = any,
>(
  extension: T,
): T extends Extension
  ? () => T
  : T extends ExtensionFactory
    ? T
    : () => undefined {
  if (typeof extension === "function") {
    return extension as any;
  }

  if (typeof extension === "object" && "key" in extension) {
    return (() => extension) as any;
  }

  if (!extension) {
    return (() => undefined) as any;
  }

  throw new Error("Invalid extension", { cause: { extension } });
}

export function createStore<T = any>(
  initialState: T,
  options?: StoreOptions<T>,
): Store<T> {
  return new Store(initialState, options);
}
