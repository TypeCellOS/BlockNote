import * as Y from "@y/y";

/**
 * Find the equivalent of a Y.Type in another Y.Doc.
 *
 * For root types this looks up the matching shared key; for sub-types it
 * locates the item by its client/clock ID in the target doc's store.
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
