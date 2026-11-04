import { Command, Plugin, PluginKey, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { HistoryExtension } from "../../extensions/History/History.js";
import { Store } from "../../util/Store.js";
import { BlockNoteEditor } from "../BlockNoteEditor.js";

/** Editor-owned permissions and the additional restriction observed from the view. */
type EditabilityState = {
  /** The application's requested editing preference. */
  editable: boolean;
  /** Independent feature keys currently preventing editing. */
  restrictions: Set<string>;
  /** Last mounted view's permission, or undefined when no view is mounted. */
  viewIsEditable: boolean | undefined;
  /** Suppress callbacks while ProseMirror is constructing plugin views. */
  updatingView: boolean;
};

export class StateManager {
  private readonly editability: Store<EditabilityState>;

  constructor(
    private editor: BlockNoteEditor<any, any, any>,
    editable = true,
  ) {
    this.editability = new Store<EditabilityState>(
      {
        editable,
        restrictions: new Set(),
        viewIsEditable: undefined,
        updatingView: false,
      },
      {
        onUpdate: (state, previous) => {
          if (
            (state.editable && state.restrictions.size === 0) !==
              (previous.editable && previous.restrictions.size === 0) &&
            !editor.headless
          ) {
            // Reuse a pending transaction without reporting a document change.
            this.transact((tr) => tr.setMeta("editable", true));
          }
        },
      },
    );
    editor.onUnmount(() => {
      // Plugin views can be recreated while mounted. Only discard their
      // observed restriction when the editor actually unmounts.
      this.editability.setState({
        ...this.editability.state,
        viewIsEditable: undefined,
      });
    });
  }

  /** Bridges editor-owned editability to ProseMirror, independently of extensions. */
  public readonly prosemirrorPlugins = [
    new Plugin({
      key: new PluginKey("bn-editability"),
      props: {
        editable: () => {
          const { editable, restrictions } = this.editability.state;
          return editable && restrictions.size === 0;
        },
      },
      view: (view) => {
        const store = this.editability;
        function syncEditability(view: EditorView) {
          if (store.state.viewIsEditable !== view.editable) {
            store.setState({
              ...store.state,
              viewIsEditable: view.editable,
            });
          }
        }
        syncEditability(view);
        return { update: syncEditability };
      },
    }),
  ];

  /**
   * Stores the currently active transaction, which is the accumulated transaction from all {@link dispatch} calls during a {@link transact} calls
   */
  private activeTransaction: Transaction | null = null;

  /**
   * For any command that can be executed, you can check if it can be executed by calling `editor.can(command)`.
   * @example
   * ```ts
   * if (editor.can(editor.undo)) {
   *   // show button
   * } else {
   *   // hide button
   * }
   */
  public can(cb: () => boolean) {
    try {
      this.isInCan = true;
      return cb();
    } finally {
      this.isInCan = false;
    }
  }

  // Flag to indicate if we're in a `can` call
  private isInCan = false;

  /**
   * Execute a prosemirror command. This is mostly for backwards compatibility with older code.
   *
   * @note You should prefer the {@link transact} method when possible, as it will automatically handle the dispatching of the transaction and work across blocknote transactions.
   *
   * @example
   * ```ts
   * editor.exec((state, dispatch, view) => {
   *   dispatch(state.tr.insertText("Hello, world!"));
   * });
   * ```
   */
  public exec(command: Command) {
    if (this.activeTransaction) {
      throw new Error(
        "`exec` should not be called within a `transact` call, move the `exec` call outside of the `transact` call",
      );
    }
    if (this.isInCan) {
      return this.canExec(command);
    }
    const state = this.prosemirrorState;
    const view = this.prosemirrorView;
    const dispatch = (tr: Transaction) => this.prosemirrorView.dispatch(tr);

    return command(state, dispatch, view);
  }

  /**
   * Check if a command can be executed. A command should return `false` if it is not valid in the current state.
   *
   * @example
   * ```ts
   * if (editor.canExec(command)) {
   *   // show button
   * } else {
   *   // hide button
   * }
   * ```
   */
  public canExec(command: Command): boolean {
    if (this.activeTransaction) {
      throw new Error(
        "`canExec` should not be called within a `transact` call, move the `canExec` call outside of the `transact` call",
      );
    }
    const state = this.prosemirrorState;
    const view = this.prosemirrorView;

    return command(state, undefined, view);
  }

  /**
   * Execute a function within a "blocknote transaction".
   * All changes to the editor within the transaction will be grouped together, so that
   * we can dispatch them as a single operation (thus creating only a single undo step)
   *
   * @note There is no need to dispatch the transaction, as it will be automatically dispatched when the callback is complete.
   *
   * @example
   * ```ts
   * // All changes to the editor will be grouped together
   * editor.transact((tr) => {
   *   tr.insertText("Hello, world!");
   * // These two operations will be grouped together in a single undo step
   *   editor.transact((tr) => {
   *     tr.insertText("Hello, world!");
   *   });
   * });
   * ```
   */
  public transact<T>(
    callback: (
      /**
       * The current active transaction, this will automatically be dispatched to the editor when the callback is complete
       * If another `transact` call is made within the callback, it will be passed the same transaction as the parent call.
       */
      tr: Transaction,
    ) => T,
  ): T {
    if (this.activeTransaction) {
      // Already in a transaction, so we can just callback immediately
      return callback(this.activeTransaction);
    }

    try {
      // Enter transaction mode, by setting a starting transaction
      this.activeTransaction = this.editor._tiptapEditor.state.tr;

      // Capture all dispatch'd transactions
      const result = callback(this.activeTransaction);

      // Any transactions captured by the `dispatch` call will be stored in `this.activeTransaction`
      const activeTr = this.activeTransaction;

      this.activeTransaction = null;
      if (
        activeTr &&
        // Only dispatch if the transaction was actually modified in some way
        (activeTr.docChanged ||
          activeTr.selectionSet ||
          activeTr.scrolledIntoView ||
          activeTr.storedMarksSet ||
          !activeTr.isGeneric)
      ) {
        // Dispatch the transaction if it was modified
        this.prosemirrorView.dispatch(activeTr);
      }

      return result;
    } finally {
      // We wrap this in a finally block to ensure we don't disable future transactions just because of an error in the callback
      this.activeTransaction = null;
    }
  }
  /**
   * Get the underlying prosemirror state
   * @note Prefer using `editor.transact` to read the current editor state, as that will ensure the state is up to date
   * @see https://prosemirror.net/docs/ref/#state.EditorState
   */
  public get prosemirrorState() {
    if (this.activeTransaction) {
      throw new Error(
        "`prosemirrorState` should not be called within a `transact` call, move the `prosemirrorState` call outside of the `transact` call or use `editor.transact` to read the current editor state",
      );
    }
    return this.editor._tiptapEditor.state;
  }

  /**
   * Get the underlying prosemirror view
   * @see https://prosemirror.net/docs/ref/#view.EditorView
   */
  public get prosemirrorView() {
    return this.editor._tiptapEditor.view;
  }

  public isFocused() {
    return this.prosemirrorView?.hasFocus() || false;
  }

  public focus() {
    this.prosemirrorView?.focus();
  }

  /**
   * Checks if the editor is currently editable, or if it's locked.
   * @returns True if the editor is editable, false otherwise.
   */
  public get isEditable(): boolean {
    const { editable, restrictions, viewIsEditable } = this.editability.state;
    // Internal restrictions always win; other plugins can only restrict further.
    return editable && restrictions.size === 0 && viewIsEditable !== false;
  }

  /**
   * Sets the application's editable preference without releasing feature restrictions.
   * @param editable True to make the editor editable, or false to lock it.
   */
  public set isEditable(editable: boolean) {
    if (this.editability.state.editable === editable) {
      return;
    }
    this.editability.setState({ ...this.editability.state, editable });
  }

  public setReadOnly(readOnly: boolean, key: string) {
    const restrictions = new Set(this.editability.state.restrictions);
    if (readOnly) {
      restrictions.add(key);
    } else {
      restrictions.delete(key);
    }
    this.editability.setState({ ...this.editability.state, restrictions });
  }

  public onEditableChange(callback: (editable: boolean) => void) {
    let previous = this.isEditable;
    return this.editability.subscribe(() => {
      if (this.updatingView) {
        return;
      }
      const editable = this.isEditable;
      if (editable !== previous) {
        previous = editable;
        callback(editable);
      }
    });
  }

  /** Mount/reconfiguration restores this flag when plugin views are ready. */
  public get updatingView(): boolean {
    return this.editability.state.updatingView;
  }

  public set updatingView(updatingView: boolean) {
    if (this.updatingView !== updatingView) {
      // Releasing the flag also notifies subscribers of the final editability.
      this.editability.setState({ ...this.editability.state, updatingView });
    }
  }

  /**
   * Undo the last action.
   */
  public undo(): boolean {
    // Purposefully not using the UndoPlugin to not import y-prosemirror when not needed
    const undoPlugin =
      this.editor.getExtension<typeof HistoryExtension>("yUndo");
    if (undoPlugin) {
      return this.exec(undoPlugin.undoCommand);
    }

    const historyPlugin =
      this.editor.getExtension<typeof HistoryExtension>("history");
    if (historyPlugin) {
      return this.exec(historyPlugin.undoCommand);
    }

    throw new Error("No undo plugin found");
  }

  /**
   * Redo the last action.
   */
  public redo() {
    const undoPlugin =
      this.editor.getExtension<typeof HistoryExtension>("yUndo");
    if (undoPlugin) {
      return this.exec(undoPlugin.redoCommand);
    }

    const historyPlugin =
      this.editor.getExtension<typeof HistoryExtension>("history");
    if (historyPlugin) {
      return this.exec(historyPlugin.redoCommand);
    }

    throw new Error("No redo plugin found");
  }
}
