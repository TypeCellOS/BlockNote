/**
 * The suffix the y-prosemirror binding appends to a node name when it renders
 * that node under its "attributed variant" (suggestion mode / version diffs).
 * It is a *reserved* suffix and must match the binding's `ATTRIBUTED_SUFFIX`.
 *
 * A `{name}--attributed` node is a render-only sibling of the canonical `{name}`
 * node: same content / attrs / allowed marks, plus a binding-only `y-attributed`
 * attribute, and it additionally lives in the `attributed` group so container
 * content expressions can admit it next to the canonical block. The Y document
 * only ever stores the canonical name.
 */
export const ATTRIBUTED_NODE_SUFFIX = "--attributed";

/**
 * The schema group every `--attributed` variant node is placed in (in addition
 * to the canonical node's own group). Container `content` expressions reference
 * this group to allow transient attributed siblings (e.g. a deleted
 * `paragraph--attributed` next to an inserted `heading--attributed`).
 */
export const ATTRIBUTED_GROUP = "attributed";

/**
 * Strip the {@link ATTRIBUTED_NODE_SUFFIX} so a (possibly variant) PM node name
 * maps back to the canonical block type. Identity for canonical names.
 *
 * During suggestion mode / diff rendering the live ProseMirror document can
 * contain `paragraph--attributed`, `heading--attributed`, etc. Anything that
 * reads `node.type.name` to identify a BlockNote block type must canonicalize
 * first, otherwise it will fail to recognize attributed blocks.
 */
export function canonicalBlockName(name: string): string {
  return name.endsWith(ATTRIBUTED_NODE_SUFFIX)
    ? name.slice(0, -ATTRIBUTED_NODE_SUFFIX.length)
    : name;
}

/**
 * Whether a node name is an attributed variant.
 */
export function isAttributedNodeName(name: string): boolean {
  return name.endsWith(ATTRIBUTED_NODE_SUFFIX);
}

/** The mark name carried by content the binding renders as a (pending) deletion. */
export const ATTRIBUTED_DELETE_MARK = "y-attributed-delete";

/**
 * Whether a node is rendered as a (pending) attributed deletion - i.e. it
 * carries the `y-attributed-delete` node mark. Such content is part of a
 * suggestion/diff and is not the block's live content.
 */
export function isDeletedNode(node: import("prosemirror-model").Node): boolean {
  return node.marks.some((m) => m.type.name === ATTRIBUTED_DELETE_MARK);
}

/**
 * Resolve the "real" block content node of a `blockContainer` - the one that
 * represents the block's CURRENT (non-deleted) content.
 *
 * Historically a blockContainer had exactly one `blockContent` child, so callers
 * used `blockContainer.firstChild`. With attribution that invariant relaxes: a
 * suggested block-type flip transiently holds a deleted `*--attributed` variant
 * next to the inserted one, so a container can have several blockContent
 * children. This helper hides that:
 *   - prefers the first non-deleted blockContent (the live block),
 *   - falls back to the first blockContent if every candidate is a deletion
 *     (i.e. the whole block is being deleted),
 * and returns `undefined` if the node has no blockContent child at all.
 *
 * Pair it with {@link canonicalBlockName} when you need the block's type name.
 */
export function getBlockNode(
  blockContainer: import("prosemirror-model").Node,
): import("prosemirror-model").Node | undefined {
  let firstContent: import("prosemirror-model").Node | undefined;
  let firstLive: import("prosemirror-model").Node | undefined;
  blockContainer.forEach((child) => {
    if (child.type.isInGroup("blockContent")) {
      firstContent = firstContent ?? child;
      if (!isDeletedNode(child)) {
        firstLive = firstLive ?? child;
      }
    }
  });
  return firstLive ?? firstContent;
}
