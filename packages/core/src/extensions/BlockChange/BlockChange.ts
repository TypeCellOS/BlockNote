import { Plugin, PluginKey, Transaction } from "prosemirror-state";
import {
  BlocksChanged,
  getBlocksChangedByTransaction,
} from "../../api/getBlocksChangedByTransaction.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";

/**
 * This plugin can filter transactions before they are applied to the editor, but with a higher-level API than `filterTransaction` from prosemirror.
 */
export const BlockChangeExtension = createExtension(() => {
  const beforeChangeCallbacks: ((context: {
    getChanges: () => BlocksChanged<any, any, any>;
    tr: Transaction;
  }) => boolean | void)[] = [];
  return {
    key: "blockChange",
    prosemirrorPlugins: [
      new Plugin({
        key: new PluginKey("blockChange"),
        filterTransaction: (tr) => {
          let changes:
            | ReturnType<typeof getBlocksChangedByTransaction<any, any, any>>
            | undefined = undefined;

          return beforeChangeCallbacks.reduce((acc, cb) => {
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
                  changes = getBlocksChangedByTransaction<any, any, any>(tr);
                  return changes;
                },
                tr,
              }) !== false
            );
          }, true);
        },
      }),
    ],

    /**
     * Subscribe to the block change events.
     */
    subscribe(
      callback: (context: {
        getChanges: () => BlocksChanged<any, any, any>;
        tr: Transaction;
      }) => boolean | void,
    ) {
      beforeChangeCallbacks.push(callback);

      return () => {
        beforeChangeCallbacks.splice(
          beforeChangeCallbacks.indexOf(callback),
          1,
        );
      };
    },
  } as const;
});
