import { Plugin, type PluginKey, type Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorProps } from "prosemirror-view";

import { getBlockInfoWithManualOffset } from "../../api/getBlockInfoFromPos.js";
import { getChangedRange } from "../../api/getChangedRange.js";

/** A `blockContainer`, as resolved during the walk below. */
export type BlockContainerInfo = Extract<
  ReturnType<typeof getBlockInfoWithManualOffset>,
  { isBlockContainer: true }
>;

/**
 * The decorations one block needs right now, or none. Every decoration must
 * carry a `blockId` spec, so the stale ones can be found again.
 *
 * `previous` holds the block's decorations from before this transaction, mapped
 * to their current positions. A decorator that needs to compare against the last
 * time it ran can keep that state in a decoration's spec and read it back here,
 * rather than in a side table it would have to prune itself — ProseMirror drops
 * a decoration when its block goes away.
 */
export type BlockDecorator = (
  info: BlockContainerInfo,
  pos: number,
  id: string,
  previous: readonly Decoration[],
) => Decoration[];

function nextDecorationSet(
  tr: Transaction,
  oldSet: DecorationSet,
  rescanAll: boolean,
  decorate: BlockDecorator,
): DecorationSet {
  const mapped = oldSet.map(tr.mapping, tr.doc);
  // What a block is decorated with depends on its own props and on how many
  // children it has, both of which live inside it, so only blocks overlapping
  // the changed range need rescanning — `nodesBetween` visits those plus every
  // ancestor spanning them. `getChangedRange` rather than `tr.changedRange()`,
  // because a prop-only update is an `AttrStep`, which the latter misses.
  const range = (rescanAll ? null : getChangedRange(tr)) ?? {
    from: 0,
    to: tr.doc.content.size,
  };

  const rescanned = new Set<string>();
  const added: Decoration[] = [];

  tr.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (node.type.name !== "blockContainer") {
      // `blockGroup`, `column` and `columnList` hold blocks; block and inline
      // content do not, so this walks blocks rather than document content.
      return node.type.isInGroup("childContainer");
    }

    const info = getBlockInfoWithManualOffset(node, pos);
    const id = node.attrs.id;

    if (info.isBlockContainer && id) {
      // Recorded even when `decorate` returns nothing, so that a block which
      // stopped wanting decorations has its old ones dropped.
      rescanned.add(id);
      added.push(
        ...decorate(
          info,
          pos,
          id,
          mapped.find(pos, pos + node.nodeSize, (spec) => spec.blockId === id),
        ),
      );
    }

    return true;
  });

  const stale = mapped.find(undefined, undefined, (spec) =>
    rescanned.has(spec.blockId),
  );

  return mapped.remove(stale).add(tr.doc, added);
}

/**
 * Transaction meta that makes every block-decoration plugin rescan the whole
 * document, for state the document itself doesn't hold.
 */
export const INVALIDATE_BLOCK_DECORATIONS = "bn-invalidate-block-decorations";

/**
 * A plugin that decorates blocks, rebuilding only what changed: decorations are
 * mapped through each transaction and `decorate` re-runs for the blocks that
 * transaction touched. See {@link INVALIDATE_BLOCK_DECORATIONS} for the rest.
 */
export function createBlockDecorationPlugin(
  key: PluginKey<DecorationSet>,
  decorate: BlockDecorator,
  // `decorations` is this plugin's own: it serves the set built above. Excluded
  // rather than merged, since a caller wanting extra decorations should return
  // them from `decorate`. It's also spread ahead of `decorations` below, so an
  // untyped caller can't replace the set and take the collapse controls with it.
  props?: Omit<EditorProps, "decorations">,
) {
  return new Plugin<DecorationSet>({
    key,
    state: {
      init: (_config, state) =>
        nextDecorationSet(state.tr, DecorationSet.empty, true, decorate),
      apply: (tr, oldSet) => {
        const invalidated = !!tr.getMeta(INVALIDATE_BLOCK_DECORATIONS);

        return tr.docChanged || invalidated
          ? nextDecorationSet(tr, oldSet, invalidated, decorate)
          : oldSet;
      },
    },
    props: { ...props, decorations: (state) => key.getState(state) },
  });
}
