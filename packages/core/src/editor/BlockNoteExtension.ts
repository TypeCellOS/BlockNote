import { Store, StoreOptions } from "@tanstack/store";
import { type AnyExtension } from "@tiptap/core";
import type { Plugin as ProsemirrorPlugin } from "prosemirror-state";
import type { PartialBlockNoDefaults } from "../schema/index.js";
import type { BlockNoteEditor } from "./BlockNoteEditor.js";
import { originalFactorySymbol } from "./managers/ExtensionManager/symbol.js";

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
  readonly mount?: (ctx: {
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
  readonly prosemirrorPlugins?: ReadonlyArray<ProsemirrorPlugin>;

  /**
   * Add additional tiptap extensions to the editor.
   */
  readonly tiptapExtensions?: ReadonlyArray<AnyExtension>;

  /**
   * Add additional BlockNote extensions to the editor.
   */
  readonly blockNoteExtensions?: ReadonlyArray<ExtensionFactoryInstance>;
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

/**
 * These are the arguments that are passed to an {@link ExtensionFactoryInstance}.
 */
export interface ExtensionOptions<
  Options extends Record<string, any> | undefined =
    | Record<string, any>
    | undefined,
> {
  options: Options;
  editor: BlockNoteEditor<any, any, any>;
}

// a type that maps the extension key to the return type of the extension factory
export type ExtensionMap<T extends ReadonlyArray<ExtensionFactoryInstance>> = {
  [K in T[number] extends ExtensionFactoryInstance<infer Ext>
    ? Ext["key"]
    : never]: T[number] extends ExtensionFactoryInstance<infer Ext>
    ? Ext
    : never;
};

/**
 * This is a type that represents the function which will actually create the extension.
 * It requires the editor instance to be passed in, but will already have the options applied automatically.
 *
 * @note Only the BlockNoteEditor should instantiate this function, not the user. Look at {@link createExtension} for user-facing functions.
 */
export type ExtensionFactoryInstance<
  Ext extends Extension<any, any> = Extension<any, any>,
> = (ctx: Omit<ExtensionOptions<any>, "options">) => Ext;

/**
 * This is the return type of the {@link createExtension} function.
 * It is a function that can be invoked with the extension's options to create a new extension factory.
 */
export type ExtensionFactory<
  State = any,
  Key extends string = string,
  Factory extends (ctx: any) => Extension<State, Key> = (
    ctx: ExtensionOptions<any>,
  ) => Extension<State, Key>,
> =
  Parameters<Factory>[0] extends ExtensionOptions<infer Options>
    ? undefined extends Options
      ? (
          options?: Exclude<Options, undefined>,
        ) => ExtensionFactoryInstance<ReturnType<Factory>>
      : (options: Options) => ExtensionFactoryInstance<ReturnType<Factory>>
    : () => ExtensionFactoryInstance<ReturnType<Factory>>;

/**
 * Constructs a BlockNote {@link ExtensionFactory} from a factory function or object
 */
// This overload is for `createExtension({ key: "test", ... })`
export function createExtension<
  const State = any,
  const Key extends string = string,
  const Ext extends Extension<State, Key> = Extension<State, Key>,
>(factory: Ext): ExtensionFactoryInstance<Ext>;
// This overload is for `createExtension(({editor, options}) => ({ key: "test", ... }))`
export function createExtension<
  const State = any,
  const Options extends Record<string, any> | undefined = any,
  const Key extends string = string,
  const Factory extends (ctx: any) => Extension<State, Key> = (
    ctx: ExtensionOptions<Options>,
  ) => Extension<State, Key>,
>(factory: Factory): ExtensionFactory<State, Key, Factory>;
// This overload is for both of the above overloads as it is the implementation of the function
export function createExtension<
  const State = any,
  const Options extends Record<string, any> | undefined = any,
  const Key extends string = string,
  const Factory extends
    | Extension<State, Key>
    | ((ctx: any) => Extension<State, Key>) = (
    ctx: ExtensionOptions<Options>,
  ) => Extension<State, Key>,
>(
  factory: Factory,
): Factory extends Extension<State, Key>
  ? ExtensionFactoryInstance<Factory>
  : Factory extends (ctx: any) => Extension<State, Key>
    ? ExtensionFactory<State, Key, Factory>
    : never {
  if (typeof factory === "object" && "key" in factory) {
    return function factoryFn() {
      (factory as any)[originalFactorySymbol] = factoryFn;
      return factory;
    } as any;
  }

  if (typeof factory !== "function") {
    throw new Error("factory must be a function");
  }

  return function factoryFn(options: Options) {
    return (ctx: { editor: BlockNoteEditor<any, any, any> }) => {
      const extension = factory({ editor: ctx.editor, options });
      // We stick a symbol onto the extension to allow us to retrieve the original factory for comparison later.
      // This enables us to do things like: `editor.getExtension(YSync).prosemirrorPlugins`
      (extension as any)[originalFactorySymbol] = factoryFn;
      return extension;
    };
  } as any;
}

export function createStore<T = any>(
  initialState: T,
  options?: StoreOptions<T>,
): Store<T> {
  return new Store(initialState, options);
}
