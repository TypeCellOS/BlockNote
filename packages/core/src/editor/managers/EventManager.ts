import type { BlockNoteEditor } from "../BlockNoteEditor.js";
import {
  getBlocksChangedByTransaction,
  type BlocksChanged,
} from "../../api/getBlocksChangedByTransaction.js";
import { Transaction } from "prosemirror-state";
import { EventEmitter } from "../../util/EventEmitter.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";

/**
 * A function that can be used to unsubscribe from an event.
 */
export type Unsubscribe = () => void;

/**
 * Options shared by the focus APIs (`isFocused`, `onFocusChange`).
 */
export type EditorFocusOptions = {
  /**
   * When true, the editor's own UI - toolbars, menus and popovers, i.e.
   * everything portalled into `editor.portalElement` - counts as focused,
   * answering "is the user still interacting with this editor?" rather than
   * "does the content area hold DOM focus?".
   *
   * Events then fire once focus movement has settled: when that combined
   * state changes (a handoff from the content area into a popover's input
   * reports no blur at all), and also when settled focus moves *between*
   * parts of the editor's UI with the state staying `focused: true` — so
   * consumers can re-evaluate which part holds focus (say, a nested comment
   * editor). The default reports raw content-area focus.
   */
  includeEditorUI?: boolean;
};

/**
 * EventManager is a class which manages the events of the editor
 */
export class EventManager<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> extends EventEmitter<{
  onChange: [
    ctx: {
      editor: BlockNoteEditor<BSchema, I, S>;
      transaction: Transaction;
      appendedTransactions: Transaction[];
    },
  ];
  onSelectionChange: [
    ctx: { editor: BlockNoteEditor<BSchema, I, S>; transaction: Transaction },
  ];
  onFocusChange: [
    ctx: {
      editor: BlockNoteEditor<BSchema, I, S>;
      focused: boolean;
      event: FocusEvent;
    },
  ];
  onFocusChangeWithinUI: [
    ctx: {
      editor: BlockNoteEditor<BSchema, I, S>;
      focused: boolean;
      event: FocusEvent;
    },
  ];
  onMount: [ctx: { editor: BlockNoteEditor<BSchema, I, S> }];
  onUnmount: [ctx: { editor: BlockNoteEditor<BSchema, I, S> }];
}> {
  constructor(private editor: BlockNoteEditor<BSchema, I, S>) {
    super();
    // We register tiptap events only once the editor is finished initializing
    // otherwise we would be trying to register events on a tiptap editor which does not exist yet
    editor.on("create", () => {
      editor._tiptapEditor.on(
        "update",
        ({ transaction, appendedTransactions }) => {
          this.emit("onChange", { editor, transaction, appendedTransactions });
        },
      );
      editor._tiptapEditor.on("selectionUpdate", ({ transaction }) => {
        this.emit("onSelectionChange", { editor, transaction });
      });
      editor._tiptapEditor.on("focus", ({ event }) => {
        this.emit("onFocusChange", { editor, focused: true, event });
      });
      editor._tiptapEditor.on("blur", ({ event }) => {
        this.emit("onFocusChange", { editor, focused: false, event });
      });
      editor._tiptapEditor.on("mount", () => {
        this.emit("onMount", { editor });
      });
      editor._tiptapEditor.on("unmount", () => {
        this.emit("onUnmount", { editor });
      });

      let unsubscribeUIFocusTracker: Unsubscribe | undefined;
      this.onMount(() => {
        unsubscribeUIFocusTracker = this.attachUIFocusTracker();
      });
      this.onUnmount(() => {
        if (unsubscribeUIFocusTracker) {
          unsubscribeUIFocusTracker();
        }
      });
    });
  }

  /**
   * Settled focus-within-UI tracking. Document-level listeners (attached on
   * editor mount, detached on unmount — a no-op per focus event is too
   * cheap to be worth gating on subscribers) cover the case tiptap events
   * can't: focus moving from the editor's own UI (which lives in
   * `editor.portalElement`, outside the content area) to somewhere else
   * entirely. Blur-side changes are re-checked a frame later because
   * `document.activeElement` transiently becomes `<body>` during focus
   * handoffs (and `relatedTarget` is unreliable on mobile).
   */
  private attachUIFocusTracker(): Unsubscribe {
    if (typeof document === "undefined") {
      return () => {};
    }
    let wasLastFocused = this.editor.isFocused({ includeEditorUI: true });
    // The settled `document.activeElement` while focused, so moves *between*
    // parts of the editor's UI (content area → a popover input → a nested
    // comment editor) also emit — subscribers like the mobile toolbar need
    // to re-evaluate which part of the UI holds focus, not just whether
    // focus stayed inside.
    let wasLastActiveElement = wasLastFocused ? document.activeElement : null;
    let settleUiFocusedTimeout: ReturnType<typeof setTimeout> | undefined;

    const settleUIFocus = (event: FocusEvent) => {
      const focused = this.editor.isFocused({ includeEditorUI: true });
      const active = focused ? document.activeElement : null;
      if (focused !== wasLastFocused || active !== wasLastActiveElement) {
        wasLastFocused = focused;
        wasLastActiveElement = active;
        this.emit("onFocusChangeWithinUI", {
          editor: this.editor,
          focused,
          event,
        });
      }
    };
    // On focusin the new element already holds focus, so the state can be
    // read immediately.
    const onFocusIn = (event: FocusEvent) => settleUIFocus(event);

    // On focusout it can't: `document.activeElement` is still the outgoing
    // element (and passes through `<body>` mid-handoff), and some UI
    // libraries restore focus asynchronously — the ariakit and shadcn link
    // popovers both do. The check therefore has to wait for the current task
    // to finish. A microtask is too early (verified: those popover tests go
    // red), and a frame would work but doesn't run in a background tab.
    const onFocusOut = (event: FocusEvent) => {
      clearTimeout(settleUiFocusedTimeout);
      settleUiFocusedTimeout = setTimeout(() => settleUIFocus(event));
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      clearTimeout(settleUiFocusedTimeout);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }

  /**
   * Register a callback that will be called when the editor changes.
   */
  public onChange(
    callback: (
      editor: BlockNoteEditor<BSchema, I, S>,
      ctx: {
        getChanges(): BlocksChanged<BSchema, I, S>;
      },
    ) => void,
    /**
     * If true, the callback will be triggered when the changes are caused by a remote user
     * @default true
     */
    includeUpdatesFromRemote = true,
  ): Unsubscribe {
    return this.on("onChange", ({ transaction, appendedTransactions }) => {
      if (!includeUpdatesFromRemote && isRemoteTransaction(transaction)) {
        // don't trigger the callback if the changes are caused by a remote user
        return;
      }
      callback(this.editor, {
        getChanges() {
          return getBlocksChangedByTransaction<BSchema, I, S>(
            transaction,
            appendedTransactions,
          );
        },
      });
    });
  }

  /**
   * Register a callback that will be called when the selection changes.
   */
  public onSelectionChange(
    callback: (editor: BlockNoteEditor<BSchema, I, S>) => void,
    /**
     * If true, the callback will be triggered when the selection changes due to a yjs sync (i.e.: other user was typing)
     */
    includeSelectionChangedByRemote = false,
  ): Unsubscribe {
    return this.on("onSelectionChange", ({ transaction }) => {
      if (
        !includeSelectionChangedByRemote &&
        isRemoteTransaction(transaction)
      ) {
        // don't trigger the callback if the selection changed because of a remote user
        return;
      }
      callback(this.editor);
    });
  }

  /**
   * Register a callback that will be called when the editor's content area
   * gains or loses DOM focus.
   *
   * Note that `focused: false` only means the content area itself blurred —
   * focus may have moved into the editor's own UI (e.g. a toolbar
   * popover's input). Consumers that need to distinguish should check where
   * `document.activeElement` ended up.
   */
  public onFocusChange(
    callback: (
      editor: BlockNoteEditor<BSchema, I, S>,
      ctx: { focused: boolean; event: FocusEvent },
    ) => void,
    options?: EditorFocusOptions,
  ): Unsubscribe {
    return this.on(
      options?.includeEditorUI ? "onFocusChangeWithinUI" : "onFocusChange",
      ({ focused, event }) => callback(this.editor, { focused, event }),
    );
  }

  /**
   * Register a callback that will be called when the editor is mounted.
   */
  public onMount(
    callback: (ctx: { editor: BlockNoteEditor<BSchema, I, S> }) => void,
  ): Unsubscribe {
    return this.on("onMount", callback);
  }

  /**
   * Register a callback that will be called when the editor is unmounted.
   */
  public onUnmount(
    callback: (ctx: { editor: BlockNoteEditor<BSchema, I, S> }) => void,
  ): Unsubscribe {
    return this.on("onUnmount", callback);
  }
}

function isRemoteTransaction(transaction: Transaction): boolean {
  return !!transaction.getMeta("y-sync$");
}
