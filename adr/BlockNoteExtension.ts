import {
  BlockNoteEditor,
  BlocksChanged,
  Schema,
  Selection,
} from "@blocknote/core";
import { Store } from "@tanstack/store";
import { Plugin, Transaction } from "prosemirror-state";

/**
 * This is an abstract class to make it easier to implement an extension using a class.
 */
export abstract class BlockNoteExtension<
  State,
  BSchema extends Schema = Schema,
> {
  public key = "not-implemented";
  public store?: Store<State>;
  public priority?: number;
  public plugins?: Plugin[];
  public keyboardShortcuts?: Record<
    string,
    (context: ExtensionContext<BSchema>) => boolean
  >;
  public onCreate?: (context: ExtensionContext<BSchema>) => void;
  public onMount?: (context: ExtensionContext<BSchema>) => void;
  public onUnmount?: (context: ExtensionContext<BSchema>) => void;
  public onChange?: (
    context: ExtensionContext<BSchema> & {
      getChanges: () => BlocksChanged;
    },
  ) => void;
  public onSelectionChange?: (
    context: ExtensionContext<BSchema> & {
      getSelection: () => Selection<any, any, any> | undefined;
    },
  ) => void;
  public onBeforeChange?: (
    context: ExtensionContext<BSchema> & {
      getChanges: () => BlocksChanged;
      tr: Transaction;
    },
  ) => boolean | void;
  public onTransaction?: (
    context: ExtensionContext<BSchema> & {
      tr: Transaction;
    },
  ) => void;
}

export interface BlockNoteExtension<State, BSchema extends Schema = Schema> {
  /**
   * The name of this extension, must be unique
   */
  key: string;
  /**
   * The state of the extension, this is a @tanstack/store store instance
   */
  store?: Store<State>;
  /**
   * The priority of this extension, used to determine the order in which extensions are applied
   */
  priority?: number;
  /**
   * The plugins of the extension
   */
  plugins?: Plugin[];
  /**
   * Keyboard shortcuts this extension adds to the editor.
   * The key is the keyboard shortcut, and the value is a function that returns a boolean indicating whether the shortcut was handled.
   * If the function returns `true`, the shortcut is considered handled and will not be passed to other extensions.
   * If the function returns `false`, the shortcut will be passed to other extensions.
   */
  keyboardShortcuts?: Record<
    string,
    (context: ExtensionContext<BSchema>) => boolean
  >;

  /**
   * Called on initialization of the editor
   * @note the view is not yet mounted at this point
   */
  onCreate?: (context: ExtensionContext<BSchema>) => void;

  /**
   * Called when the editor is mounted
   * @note the view is available
   */
  onMount?: (context: ExtensionContext<BSchema>) => void;

  /**
   * Called when the editor is unmounted
   * @note the view will no longer be available after this is executed
   */
  onUnmount?: (context: ExtensionContext<BSchema>) => void;

  /**
   * Called when an editor transaction is applied
   */
  onTransaction?: (
    context: ExtensionContext<BSchema> & {
      tr: Transaction;
    },
  ) => void;

  /**
   * Called when the editor content changes
   * @note the changes are available
   */
  onChange?: (
    context: ExtensionContext<BSchema> & {
      getChanges: () => BlocksChanged;
    },
  ) => void;

  /**
   * Called when the selection changes
   * @note the selection is available
   */
  onSelectionChange?: (
    context: ExtensionContext<BSchema> & {
      getSelection: () => Selection<any, any, any> | undefined;
    },
  ) => void;

  /**
   * Called before an editor change is applied,
   * Allowing the extension to cancel the change
   */
  onBeforeChange?: (
    context: ExtensionContext<BSchema> & {
      getChanges: () => BlocksChanged;
      tr: Transaction;
    },
  ) => boolean | void;
}

export interface ExtensionContext<BSchema extends Schema> {
  editor: BlockNoteEditor<BSchema>;
}

/**
 * This is the class-form, where it can extend the abstract class
 */
export class MyExtension extends BlockNoteExtension<{ abc: number[] }> {
  public key = "my-extension";
  public store = new Store({ abc: [1, 2, 3] });

  constructor(_extensionOptions: { myCustomOption: string }) {
    super();
  }

  getFoo() {
    return 8;
  }
}

/**
 * This is the object-form, where it can be just a function that returns an object that implements the interface
 */
export function myExtension(_extensionOptions: {
  myCustomOption: string;
}): BlockNoteExtension<{ state: number }> {
  const myState = new Store({ state: 0 });
  return {
    key: "my-extension",
    store: myState,
    onMount(context) {
      context.editor.extensions.myExtension = this;
      myState.setState({ state: 1 });
    },
  };
}

/**
 * This type exposes the public API of an extension, excluding any {@link BlockNoteExtension} methods (for cleaner typing)
 */
export type ExtensionMethods<Extension extends BlockNoteExtension<any>> =
  Extension extends BlockNoteExtension<infer State>
    ? Omit<Extension, Exclude<keyof BlockNoteExtension<State>, "store" | "key">>
    : never;

/**
 * You'll notice that the `getFoo` method is the only  included type in the `MyExtensionMethods` type,
 * This makes it convenient to expose the right amount of details to the rest of the application (keeping the blocknote called methods hidden)
 */
export type MyExtensionMethods = ExtensionMethods<MyExtension>;
// editor.extensions.myExtension.getFoo();
