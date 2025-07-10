import type { BlockNoteEditor } from "../BlockNoteEditor.js";
import {
  getBlocksChangedByTransaction,
  type BlocksChanged,
} from "../../api/nodeUtil.js";
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
    callback: (ctx: { editor: Editor; get changes(): BlocksChanged }) => void,
  ): Unsubscribe {
    if (this.editor.headless) {
      // Note: would be nice if this is possible in headless mode as well
      return () => {
        // noop
      };
    }

    const cb = ({
      transaction,
      appendedTransactions,
    }: {
      transaction: Transaction;
      appendedTransactions: Transaction[];
    }) => {
      callback({
        editor: this.editor,
        get changes(): BlocksChanged {
          return getBlocksChangedByTransaction(
            transaction,
            appendedTransactions,
          );
        },
      });
    };

    this.editor._tiptapEditor.on("v3-update", cb);

    return () => {
      this.editor._tiptapEditor.off("v3-update", cb);
    };
  }

  /**
   * Register a callback that will be called when the selection changes.
   */
  public onSelectionChange(
    callback: (ctx: {
      editor: Editor;
      // get selection(): Location;
    }) => void,
    /**
     * If true, the callback will be triggered when the selection changes due to a yjs sync (i.e.: other user was typing)
     */
    includeSelectionChangedByRemote = false,
  ): Unsubscribe {
    if (this.editor.headless) {
      // Note: would be nice if this is possible in headless mode as well
      return () => {
        // noop
      };
    }

    const cb = (e: { transaction: Transaction }) => {
      if (
        e.transaction.getMeta("$y-sync") &&
        !includeSelectionChangedByRemote
      ) {
        // selection changed because of a yjs sync (i.e.: other user was typing)
        // we don't want to trigger the callback in this case
        return;
      }
      callback({ editor: this.editor });
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
    if (this.editor.headless) {
      // Note: would be nice if this is possible in headless mode as well
      return () => {
        // noop
      };
    }

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
    if (this.editor.headless) {
      // Note: would be nice if this is possible in headless mode as well
      return () => {
        // noop
      };
    }

    const cb = () => {
      callback({ editor: this.editor });
    };

    this.editor._tiptapEditor.on("unmount", cb);

    return () => {
      this.editor._tiptapEditor.off("unmount", cb);
    };
  }
}
