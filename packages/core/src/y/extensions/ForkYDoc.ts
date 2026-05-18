import * as Y from "@y/y";
import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./index.js";
import { YCursorExtension } from "./YCursorPlugin.js";
import { YSyncExtension } from "./YSync.js";

// TODO rewrite

/**
 * To find a fragment in another ydoc, we need to search for it.
 */
export function findTypeInOtherYdoc<T extends Y.Type<any>>(
  ytype: T,
  otherYdoc: Y.Doc,
): T {
  const ydoc = ytype.doc;
  if (!ydoc) {
    throw new Error("type does not have a ydoc");
  }
  if (ytype._item === null) {
    /**
     * If is a root type, we need to find the root key in the original ydoc
     * and use it to get the type in the other ydoc.
     */
    const rootKey = Array.from(ydoc.share.keys()).find(
      (key) => ydoc.share.get(key) === ytype,
    );
    if (rootKey == null) {
      throw new Error("type does not exist in other ydoc");
    }
    return otherYdoc.get(rootKey as string, ytype.constructor as any) as T;
  } else {
    /**
     * If it is a sub type, we use the item id to find the history type.
     */
    const ytypeItem = ytype._item;
    const otherStructs = otherYdoc.store.clients.get(ytypeItem.id.client) ?? [];
    const itemIndex = Y.findIndexSS(otherStructs, ytypeItem.id.clock);
    const otherItem = otherStructs[itemIndex] as Y.Item | undefined;
    if (!otherItem) {
      throw new Error("type does not exist in other ydoc");
    }
    const otherContent = otherItem.content as Y.ContentType | undefined;
    if (!otherContent) {
      throw new Error("type does not exist in other ydoc");
    }
    return otherContent.type as T;
  }
}

export const ForkYDocExtension = createExtension(
  ({ editor, options }: ExtensionOptions<CollaborationOptions>) => {
    let forkedState:
      | {
          originalFragment: Y.Type;
          forkedFragment: Y.Type;
        }
      | undefined = undefined;

    const store = createStore({ isForked: false });

    return {
      key: "yForkDoc",
      store,
      /**
       * Fork the Y.js document from syncing to the remote,
       * allowing modifications to the document without affecting the remote.
       * These changes can later be rolled back or applied to the remote.
       */
      fork({
        /**
         * The initial update to apply to the forked document.
         */
        initialUpdate,
      }: {
        initialUpdate?: Uint8Array;
      } = {}) {
        if (forkedState) {
          return;
        }

        const originalFragment = options.fragment;

        if (!originalFragment) {
          throw new Error("No fragment to fork from");
        }

        const doc = new Y.Doc();
        // Copy the original document to a new Yjs document
        Y.applyUpdateV2(
          doc,
          initialUpdate ?? Y.encodeStateAsUpdateV2(originalFragment.doc!),
        );

        // Find the forked fragment in the new Yjs document
        const forkedFragment = findTypeInOtherYdoc(originalFragment, doc);

        forkedState = {
          originalFragment,
          forkedFragment,
        };

        // Need to reset all the yjs plugins
        editor.unregisterExtension([YCursorExtension, YSyncExtension]);
        const newOptions = {
          ...options,
          fragment: forkedFragment,
        };
        // Register them again, based on the new forked fragment
        editor.registerExtension([YSyncExtension(newOptions)]);

        // Tell the store that the editor is now forked
        store.setState({ isForked: true });
      },

      /**
       * Resume syncing the Y.js document to the remote
       * If `keepChanges` is true, any changes that have been made to the forked document will be applied to the original document.
       * Otherwise, the original document will be restored and the changes will be discarded.
       */
      merge({ keepChanges }: { keepChanges: boolean }) {
        if (!forkedState) {
          return;
        }
        // Remove the forked fragment's plugins
        editor.unregisterExtension(["ySync", "yCursor"]);

        const { originalFragment, forkedFragment } = forkedState;
        // Register the plugins again, based on the original fragment (which is still in the original options)
        editor.registerExtension([
          YSyncExtension(options),
          YCursorExtension(options),
        ]);

        if (keepChanges) {
          // Apply any changes that have been made to the fork, onto the original doc
          const update = Y.encodeStateAsUpdate(
            forkedFragment.doc!,
            Y.encodeStateVector(originalFragment.doc!),
          );
          // Applying this change will add to the undo stack, allowing it to be undone normally
          Y.applyUpdate(originalFragment.doc!, update, editor);
        }
        // Reset the forked state
        forkedState = undefined;
        // Tell the store that the editor is no longer forked
        store.setState({ isForked: false });
      },
    } as const;
  },
);
