import { BlockNoteEditor } from "@blocknote/core";
import { Store } from "@tanstack/store";
import { Plugin } from "prosemirror-state";

export type BlockNoteExtension<State> = (
  editor: BlockNoteEditor,
) => BlockNoteExtensionConfig<State>;

export interface BlockNoteExtensionConfig<State> {
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
   * The prosemirror plugins of the extension
   */
  plugins?: Plugin[];
  /**
   * Keyboard shortcuts this extension adds to the editor.
   * The key is the keyboard shortcut, and the value is a function that returns a boolean indicating whether the shortcut was handled.
   * If the function returns `true`, the shortcut is considered handled and will not be passed to other extensions.
   * If the function returns `false`, the shortcut will be passed to other extensions.
   */
  keyboardShortcuts?: Record<string, (context) => boolean>;

  /**
   * Called when the editor is mounted
   * @note the view is available
   */
  onMount?: () => void;

  /**
   * Called when the editor is unmounted
   * @note the view will no longer be available after this is executed
   */
  onUnmount?: () => void;
}

/**
 * This is the object-form, where it can be just a function that returns an object that implements the interface
 */
export function myExtension(_extensionOptions: { myCustomOption: string }) {
  const myState = new Store({ state: 0 });
  return ((editor) => ({
    key: "my-extension",
    store: myState,
    onMount() {
      editor.onChange((change) => {
        console.log(change);
      });
      myState.setState({ state: 1 });
    },
    getFoo() {
      return 8;
    },
  })) satisfies BlockNoteExtension<{ state: number }>;
}

/**
 * This type exposes the public API of an extension, excluding any {@link BlockNoteExtension} methods (for cleaner typing)
 */
export type ExtensionMethods<Extension extends BlockNoteExtension<any>> =
  Extension extends BlockNoteExtension<infer State>
    ? Omit<
        ReturnType<Extension>,
        Exclude<keyof BlockNoteExtensionConfig<State>, "store" | "key">
      >
    : never;

/**
 * You'll notice that the `getFoo` method is the only  included type in the `MyExtensionMethods` type,
 * This makes it convenient to expose the right amount of details to the rest of the application (keeping the blocknote called methods hidden)
 */
export type MyExtensionMethods = ExtensionMethods<
  ReturnType<typeof myExtension>
>;
// editor.extensions.myExtension.getFoo();
