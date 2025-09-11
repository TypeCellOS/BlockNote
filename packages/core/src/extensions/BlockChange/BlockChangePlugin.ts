import { Plugin, PluginKey, Transaction } from "prosemirror-state";
import {
  BlocksChanged,
  getBlocksChangedByTransaction,
} from "../../api/getBlocksChangedByTransaction.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

/**
 * This plugin can filter transactions before they are applied to the editor, but with a higher-level API than `filterTransaction` from prosemirror.
 */
export class BlockChangePlugin extends BlockNoteExtension {
  public static key() {
    return "blockChange";
  }

  private beforeChangeCallbacks: ((context: {
    getChanges: () => BlocksChanged<any, any, any>;
    tr: Transaction;
  }) => boolean | void)[] = [];

  constructor() {
    super();

    this.addProsemirrorPlugin(
      new Plugin({
        key: new PluginKey("blockChange"),
        filterTransaction: (tr) => {
          let changes:
            | ReturnType<typeof getBlocksChangedByTransaction>
            | undefined = undefined;

          return this.beforeChangeCallbacks.reduce((acc, cb) => {
            if (acc === false) {
              // We only care that we hit a `false` result, so we can stop iterating.
              return acc;
            }
            return (
              cb({
                getChanges() {
                  if (changes) {
                    return changes;
                  }
                  changes = getBlocksChangedByTransaction(tr);
                  return changes;
                },
                tr,
              }) !== false
            );
          }, true);
        },
      }),
    );
  }

  public subscribe(
    callback: (context: {
      getChanges: () => BlocksChanged<any, any, any>;
      tr: Transaction;
    }) => boolean | void,
  ) {
    this.beforeChangeCallbacks.push(callback);

    return () => {
      this.beforeChangeCallbacks = this.beforeChangeCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }
}
