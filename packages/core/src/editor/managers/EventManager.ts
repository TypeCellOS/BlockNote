import type { BlockNoteEditor } from "../BlockNoteEditor.js";
import {
  getBlocksChangedByTransaction,
  type BlocksChanged,
} from "../../api/getBlocksChangedByTransaction.js";
import { Transaction } from "prosemirror-state";

/**
 * A function that can be used to unsubscribe from an event.
 */
export type Unsubscribe = () => void;

/**
 * EventManager is a class which manages the events of the editor
 */
export class EventManager<Editor extends BlockNoteEditor> {
  constructor(private editor: Editor) {}

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
    const cb = ({
      transaction,
      appendedTransactions,
    }: {
      transaction: Transaction;
      appendedTransactions: Transaction[];
    }) => {
      callback(this.editor, {
        getChanges() {
          return getBlocksChangedByTransaction(
            transaction,
            appendedTransactions,
          );
        },
      });
    };

    this.editor._tiptapEditor.on("update", cb);

    return () => {
      this.editor._tiptapEditor.off("update", cb);
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

    this.editor._tiptapEditor.on("selectionUpdate", cb);

    return () => {
      this.editor._tiptapEditor.off("selectionUpdate", cb);
    };
  }

  /**
   * Register a callback that will be called when the editor is mounted.
   */
  public onMount(callback: (ctx: { editor: Editor }) => void): Unsubscribe {
    const cb = () => {
      callback({ editor: this.editor });
    };

    this.editor._tiptapEditor.on("mount", cb);

    return () => {
      this.editor._tiptapEditor.off("mount", cb);
    };
  }

  /**
   * Register a callback that will be called when the editor is unmounted.
   */
  public onUnmount(callback: (ctx: { editor: Editor }) => void): Unsubscribe {
    const cb = () => {
      callback({ editor: this.editor });
    };

    this.editor._tiptapEditor.on("unmount", cb);

    return () => {
      this.editor._tiptapEditor.off("unmount", cb);
    };
  }
}
