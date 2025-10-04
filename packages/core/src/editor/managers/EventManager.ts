import type { BlockNoteEditor } from "../BlockNoteEditor.js";
import {
  getBlocksChangedByTransaction,
  type BlocksChanged,
} from "../../api/getBlocksChangedByTransaction.js";
import { Transaction } from "prosemirror-state";
import { EventEmitter } from "../../util/EventEmitter.js";

/**
 * A function that can be used to unsubscribe from an event.
 */
export type Unsubscribe = () => void;

/**
 * EventManager is a class which manages the events of the editor
 */
export class EventManager<Editor extends BlockNoteEditor> extends EventEmitter<{
  onChange: [
    editor: Editor,
    ctx: {
      getChanges(): BlocksChanged<
        Editor["schema"]["blockSchema"],
        Editor["schema"]["inlineContentSchema"],
        Editor["schema"]["styleSchema"]
      >;
    },
  ];
  onSelectionChange: [ctx: { editor: Editor; transaction: Transaction }];
  onMount: [ctx: { editor: Editor }];
  onUnmount: [ctx: { editor: Editor }];
}> {
  constructor(private editor: Editor) {
    super();
    // We register tiptap events only once the editor is finished initializing
    // otherwise we would be trying to register events on a tiptap editor which does not exist yet
    editor.onCreate(() => {
      editor._tiptapEditor.on(
        "update",
        ({ transaction, appendedTransactions }) => {
          this.emit("onChange", editor, {
            getChanges() {
              return getBlocksChangedByTransaction(
                transaction,
                appendedTransactions,
              );
            },
          });
        },
      );
      editor._tiptapEditor.on("selectionUpdate", ({ transaction }) => {
        this.emit("onSelectionChange", { editor, transaction });
      });
      editor._tiptapEditor.on("mount", () => {
        this.emit("onMount", { editor });
      });
      editor._tiptapEditor.on("unmount", () => {
        this.emit("onUnmount", { editor });
      });
    });
  }

  /**
   * Register a callback that will be called when the editor changes.
   */
  public onChange(
    callback: (
      editor: Editor,
      ctx: {
        getChanges(): BlocksChanged<
          Editor["schema"]["blockSchema"],
          Editor["schema"]["inlineContentSchema"],
          Editor["schema"]["styleSchema"]
        >;
      },
    ) => void,
  ): Unsubscribe {
    this.on("onChange", callback);

    return () => {
      this.off("onChange", callback);
    };
  }

  /**
   * Register a callback that will be called when the selection changes.
   */
  public onSelectionChange(
    callback: (editor: Editor) => void,
    /**
     * If true, the callback will be triggered when the selection changes due to a yjs sync (i.e.: other user was typing)
     */
    includeSelectionChangedByRemote = false,
  ): Unsubscribe {
    const cb = (e: { transaction: Transaction }) => {
      if (
        e.transaction.getMeta("$y-sync") &&
        !includeSelectionChangedByRemote
      ) {
        // selection changed because of a yjs sync (i.e.: other user was typing)
        // we don't want to trigger the callback in this case
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
   * Register a callback that will be called when the editor is mounted.
   */
  public onMount(callback: (ctx: { editor: Editor }) => void): Unsubscribe {
    this.on("onMount", callback);

    return () => {
      this.off("onMount", callback);
    };
  }

  /**
   * Register a callback that will be called when the editor is unmounted.
   */
  public onUnmount(callback: (ctx: { editor: Editor }) => void): Unsubscribe {
    this.on("onUnmount", callback);

    return () => {
      this.off("onUnmount", callback);
    };
  }
}
