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
      editor._tiptapEditor.on("destroy", () => {
        // Subscribers normally detach the tracker when the last one
        // unsubscribes; this covers subscribers that outlive the editor.
        this.detachUIFocusTracker?.();
      });
    });
  }

  /**
   * Settled focus-within-UI tracking. Document-level listeners (attached only
   * while someone subscribes with `includeEditorUI`) cover the case tiptap
   * events can't: focus moving from the editor's own UI (which lives in
   * `editor.portalElement`, outside the content area) to somewhere else
   * entirely. Blur-side changes are re-checked a frame later because
   * `document.activeElement` transiently becomes `<body>` during focus
   * handoffs (and `relatedTarget` is unreliable on mobile).
   */
  private uiFocused = false;

  private uiFocusSubscriberCount = 0;

  private uiFocusSettleHandle: ReturnType<typeof setTimeout> | undefined;

  private detachUIFocusTracker: (() => void) | undefined;

  private computeUIFocused(): boolean {
    const active =
      typeof document !== "undefined" ? document.activeElement : null;
    return (
      this.editor.isFocused() ||
      (!!active && this.editor.isWithinEditor(active))
    );
  }

  private settleUIFocus(event: FocusEvent) {
    const focused = this.computeUIFocused();
    if (focused !== this.uiFocused) {
      this.uiFocused = focused;
      this.emit("onFocusChangeWithinUI", {
        editor: this.editor,
        focused,
        event,
      });
    }
  }

  private attachUIFocusTracker() {
    if (typeof document === "undefined") {
      return;
    }
    this.uiFocused = this.computeUIFocused();
    // On focusin the new element already holds focus, so the state can be
    // read immediately.
    const onFocusIn = (event: FocusEvent) => this.settleUIFocus(event);

    // On focusout it can't: `document.activeElement` is still the outgoing
    // element (and passes through `<body>` mid-handoff), and some UI
    // libraries restore focus asynchronously — the ariakit and shadcn link
    // popovers both do. The check therefore has to wait for the current task
    // to finish. A microtask is too early (verified: those popover tests go
    // red), and a frame would work but doesn't run in a background tab.
    const onFocusOut = (event: FocusEvent) => {
      clearTimeout(this.uiFocusSettleHandle);
      this.uiFocusSettleHandle = setTimeout(() => this.settleUIFocus(event));
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    this.detachUIFocusTracker = () => {
      clearTimeout(this.uiFocusSettleHandle);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      this.detachUIFocusTracker = undefined;
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
    const cb = ({
      transaction,
      appendedTransactions,
    }: {
      transaction: Transaction;
      appendedTransactions: Transaction[];
    }) => {
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
    };
    this.on("onChange", cb);

    return () => {
      this.off("onChange", cb);
    };
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
    const cb = (e: { transaction: Transaction }) => {
      if (
        !includeSelectionChangedByRemote &&
        isRemoteTransaction(e.transaction)
      ) {
        // don't trigger the callback if the selection changed because of a remote user
        return;
      }
      callback(this.editor);
    };

    this.on("onSelectionChange", cb);

    return () => {
      this.off("onSelectionChange", cb);
    };
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
    options?: {
      /**
       * When true, the editor's own UI (toolbars, menus, popovers —
       * everything portalled into `editor.portalElement`) counts as focused,
       * and events fire only when that combined focus state actually changes,
       * after focus movement has settled. Use this to know whether the user
       * is still interacting with the editor; the default reports raw
       * content-area focus/blur.
       */
      includeEditorUI?: boolean;
    },
  ): Unsubscribe {
    const cb = ({
      focused,
      event,
    }: {
      focused: boolean;
      event: FocusEvent;
    }) => {
      callback(this.editor, { focused, event });
    };

    if (options?.includeEditorUI) {
      this.uiFocusSubscriberCount++;
      if (this.uiFocusSubscriberCount === 1) {
        this.attachUIFocusTracker();
      }
      this.on("onFocusChangeWithinUI", cb);
      return () => {
        this.off("onFocusChangeWithinUI", cb);
        this.uiFocusSubscriberCount--;
        if (this.uiFocusSubscriberCount === 0) {
          this.detachUIFocusTracker?.();
        }
      };
    }

    this.on("onFocusChange", cb);

    return () => {
      this.off("onFocusChange", cb);
    };
  }

  /**
   * Register a callback that will be called when the editor is mounted.
   */
  public onMount(
    callback: (ctx: { editor: BlockNoteEditor<BSchema, I, S> }) => void,
  ): Unsubscribe {
    this.on("onMount", callback);

    return () => {
      this.off("onMount", callback);
    };
  }

  /**
   * Register a callback that will be called when the editor is unmounted.
   */
  public onUnmount(
    callback: (ctx: { editor: BlockNoteEditor<BSchema, I, S> }) => void,
  ): Unsubscribe {
    this.on("onUnmount", callback);

    return () => {
      this.off("onUnmount", callback);
    };
  }
}

function isRemoteTransaction(transaction: Transaction): boolean {
  return !!transaction.getMeta("y-sync$");
}
