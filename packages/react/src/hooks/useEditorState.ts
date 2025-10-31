import type { BlockNoteEditor } from "@blocknote/core";
import deepEqual from "fast-deep-equal/es6/react";
import { useDebugValue, useEffect, useLayoutEffect, useState } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
import { useBlockNoteContext } from "../editor/BlockNoteContext.js";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type EditorStateSnapshot<
  TEditor extends BlockNoteEditor<any, any, any> | null = BlockNoteEditor<
    any,
    any,
    any
  > | null,
> = {
  editor: TEditor;
  transactionNumber: number;
};

export type UseEditorStateOptions<
  TSelectorResult,
  TEditor extends BlockNoteEditor<any, any, any> | null = BlockNoteEditor<
    any,
    any,
    any
  > | null,
> = {
  /**
   * The editor instance. If not provided, will use the editor from BlockNoteContext.
   */
  editor?: TEditor;

  /**
   * A selector function to determine the value to compare for re-rendering.
   */
  selector: (context: EditorStateSnapshot<TEditor>) => TSelectorResult;

  /**
   * A custom equality function to determine if the editor should re-render.
   * @default `deepEqual` from `fast-deep-equal`
   */
  equalityFn?: (a: TSelectorResult, b: TSelectorResult | null) => boolean;

  /**
   * The event to subscribe to.
   * @default "all"
   */
  on?: "all" | "selection" | "change";
};

/**
 * To synchronize the editor instance with the component state,
 * we need to create a separate instance that is not affected by the component re-renders.
 */
class EditorStateManager<
  TEditor extends BlockNoteEditor<any, any, any> | null = BlockNoteEditor<
    any,
    any,
    any
  > | null,
> {
  private transactionNumber = 0;

  private lastTransactionNumber = 0;

  private lastSnapshot: EditorStateSnapshot<TEditor>;

  private editor: TEditor;

  private subscribers = new Set<() => void>();

  constructor(initialEditor: TEditor) {
    this.editor = initialEditor;
    this.lastSnapshot = { editor: initialEditor, transactionNumber: 0 };

    this.getSnapshot = this.getSnapshot.bind(this);
    this.getServerSnapshot = this.getServerSnapshot.bind(this);
    this.watch = this.watch.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  /**
   * Get the current editor instance.
   */
  getSnapshot(): EditorStateSnapshot<TEditor> {
    if (this.transactionNumber === this.lastTransactionNumber) {
      return this.lastSnapshot;
    }
    this.lastTransactionNumber = this.transactionNumber;
    this.lastSnapshot = {
      editor: this.editor,
      transactionNumber: this.transactionNumber,
    };
    return this.lastSnapshot;
  }

  /**
   * Always disable the editor on the server-side.
   */
  getServerSnapshot(): EditorStateSnapshot<null> {
    return { editor: null, transactionNumber: 0 };
  }

  /**
   * Subscribe to the editor instance's changes.
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Watch the editor instance for changes.
   */
  watch(
    nextEditor: BlockNoteEditor<any, any, any> | null,
    on: "all" | "selection" | "change",
  ): undefined | (() => void) {
    this.editor = nextEditor as TEditor;

    if (this.editor) {
      /**
       * This will force a re-render when the editor state changes.
       * This is to support things like `editor.can().toggleBold()` in components that `useEditor`.
       * This could be more efficient, but it's a good trade-off for now.
       */
      const fn = () => {
        this.transactionNumber += 1;
        this.subscribers.forEach((callback) => callback());
      };

      const currentTiptapEditor = this.editor._tiptapEditor;

      const EVENT_TYPES = {
        all: "transaction",
        selection: "selectionUpdate",
        change: "update",
      } as const;

      currentTiptapEditor.on(EVENT_TYPES[on], fn);
      return () => {
        currentTiptapEditor.off(EVENT_TYPES[on], fn);
      };
    }

    return undefined;
  }
}

/**
 * This hook allows you to watch for changes on the editor instance.
 * It will allow you to select a part of the editor state and re-render the component when it changes.
 * @example
 * ```tsx
 * const { currentSelection } = useEditorState({
 *  selector: snapshot => ({ currentSelection: snapshot.editor?._tiptapEditor.state.selection }),
 * })
 * ```
 */
export function useEditorState<TSelectorResult>(
  options: UseEditorStateOptions<
    TSelectorResult,
    BlockNoteEditor<any, any, any>
  >,
): TSelectorResult;
/**
 * This hook allows you to watch for changes on the editor instance.
 * It will allow you to select a part of the editor state and re-render the component when it changes.
 * @example
 * ```tsx
 * const { currentSelection } = useEditorState({
 *  selector: snapshot => ({ currentSelection: snapshot.editor?._tiptapEditor.state.selection }),
 * })
 * ```
 */
export function useEditorState<TSelectorResult>(
  options: UseEditorStateOptions<
    TSelectorResult,
    BlockNoteEditor<any, any, any> | null
  >,
): TSelectorResult | null;

/**
 * This hook allows you to watch for changes on the editor instance.
 * It will allow you to select a part of the editor state and re-render the component when it changes.
 * @example
 * ```tsx
 * const { currentSelection } = useEditorState({
 *  selector: snapshot => ({ currentSelection: snapshot.editor?._tiptapEditor.state.selection }),
 * })
 * ```
 */
export function useEditorState<TSelectorResult>(
  options:
    | UseEditorStateOptions<TSelectorResult, BlockNoteEditor<any, any, any>>
    | UseEditorStateOptions<
        TSelectorResult,
        BlockNoteEditor<any, any, any> | null
      >,
): TSelectorResult | null {
  const editorContext = useBlockNoteContext();
  const editor = options.editor || editorContext?.editor || null;
  const on = options.on || "all";

  const [editorStateManager] = useState(() => new EditorStateManager(editor));

  // Using the `useSyncExternalStore` hook to sync the editor instance with the component state
  const selectedState = useSyncExternalStoreWithSelector(
    editorStateManager.subscribe,
    editorStateManager.getSnapshot,
    editorStateManager.getServerSnapshot,
    options.selector as UseEditorStateOptions<
      TSelectorResult,
      BlockNoteEditor<any, any, any> | null
    >["selector"],
    options.equalityFn ?? deepEqual,
  );

  useIsomorphicLayoutEffect(() => {
    return editorStateManager.watch(editor, on);
  }, [editor, editorStateManager, on]);

  useDebugValue(selectedState);

  return selectedState;
}
