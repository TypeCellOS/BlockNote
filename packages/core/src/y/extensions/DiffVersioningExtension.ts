import { docToDelta } from "@y/prosemirror";
import * as Y from "@y/y";

import type { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { createUserStore, type User } from "../../user/index.js";
import {
  _blocksToProsemirrorNode,
  docDiffToDelta,
  findTypeInOtherYdoc,
  yNodeToTransaction,
} from "../utils.js";
import { AttributionExtension } from "./AttributionExtension.js";
import type { GetAttributionMarkClassName } from "./YAttributionMarks.js";

/**
 * A version diff has no real authors, so all `y-attributed-*` marks carry one
 * synthetic id. Its user has an empty name: it only gives the marks their color,
 * and the tooltip names just the kind of change, because a diff can't tell which
 * intermediate version introduced it.
 */
const DIFF_AUTHOR_ID = "blocknote:version-diff";

/** Colors used for the version diff marks — the palette's blue. */
const DIFF_AUTHOR_COLOR = "#1e4fb0";
const DIFF_AUTHOR_COLOR_LIGHT = "#c9dcff";

export type DiffVersioningExtensionOptions = {
  /**
   * The color used for the diff's attribution marks. Defaults to a blue.
   */
  color?: string;
  /**
   * See {@link GetAttributionMarkClassName}. Forwarded to the underlying
   * {@link AttributionExtension} to override mark styling by change type.
   */
  getAttributionMarkClassName?: GetAttributionMarkClassName;
};

/**
 * Records the author of each transaction on `doc` into a mutable
 * {@link Y.ContentMap}, so the resulting attribution marks carry a non-empty
 * `userIds` (and therefore resolve to a color). The listener must be
 * attached *before* the attributed transaction runs. Mirrors the store used by
 * the suggestion gallery example (`createAttributionStore`).
 */
function attributeTransactionsTo(doc: Y.Doc, userId: string): Y.ContentMap {
  const attrs = Y.createContentMap();
  doc.on("beforeObserverCalls", (tr) => {
    if (!tr.insertSet.isEmpty()) {
      Y.insertIntoIdMap(
        attrs.inserts,
        Y.createIdMapFromIdSet(tr.insertSet, [
          Y.createContentAttribute("insert", userId),
        ]),
      );
    }
    if (!tr.deleteSet.isEmpty()) {
      Y.insertIntoIdMap(
        attrs.deletes,
        Y.createIdMapFromIdSet(tr.deleteSet, [
          Y.createContentAttribute("delete", userId),
        ]),
      );
    }
  });
  return attrs;
}

/**
 * An opt-in extension that renders a read-only diff between two BlockNote
 * documents (`Block[]`) directly in the editor, marking insertions/deletions
 * with the `y-attributed-*` suggestion marks — the same visual result the Yjs
 * collaboration adapter produces, but driven from two plain block arrays with
 * no server and no live Yjs sync.
 *
 * It composes {@link AttributionExtension} (which registers the attribution
 * marks and drives their colors + hover tooltips from a user store), and adds
 * the {@link renderDiff} capability.
 *
 * Registering this extension is what makes non-collaborative versioning
 * (`inMemoryVersioning`) capable of showing diffs: the in-memory preview
 * controller looks this up by key (`"diffVersioning"`) and delegates to
 * {@link renderDiff}, falling back to a static document swap when it's absent.
 *
 * `renderDiff` is also a standalone, directly-callable API — you can register
 * just this extension and call
 * `editor.getExtension(DiffVersioningExtension).renderDiff(target, baseline)`
 * to render a known diff (e.g. in tests).
 *
 * @example
 * ```ts
 * const editor = BlockNoteEditor.create({
 *   extensions: [DiffVersioningExtension()],
 * });
 * editor.getExtension(DiffVersioningExtension)!.renderDiff(target, baseline);
 * ```
 */
export const DiffVersioningExtension = createExtension(
  ({
    options,
    editor,
  }: {
    options: DiffVersioningExtensionOptions | undefined;
    editor: BlockNoteEditor<any, any, any>;
  }) => {
    const color = options?.color ?? DIFF_AUTHOR_COLOR;
    // Only the default pairs with a hand-tuned light tint; a caller-supplied
    // colour gets the derived one (see `userMarkColors`).
    const colorLight =
      options?.color === undefined ? DIFF_AUTHOR_COLOR_LIGHT : undefined;

    // Cached up front, so a hover never shows the raw id before it resolves.
    const userStore = createUserStore<User>(async () => []);
    userStore.setUser({
      id: DIFF_AUTHOR_ID,
      username: "",
      avatarUrl: "",
      color,
      colorLight,
    });

    return {
      key: "diffVersioning",
      // Compose AttributionExtension: registers the y-attributed-* marks and
      // drives their colors from the (static) user store.
      blockNoteExtensions: [
        AttributionExtension({
          resolveUsers: userStore,
          getAttributionMarkClassName: options?.getAttributionMarkClassName,
        }),
      ],
      /**
       * Render a read-only diff of `baselineBlocks` → `snapshotBlocks` into the
       * editor, marking insertions and deletions. Uses the "two-doc fork" recipe
       * so the two Y.Docs share history — a hard requirement for
       * `createDiffRenderer`, which diffs by Yjs client/clock ids.
       */
      renderDiff(
        snapshotBlocks: Block<any, any, any>[],
        baselineBlocks: Block<any, any, any>[],
      ) {
        if (!editor.pmSchema.marks["y-attributed-insert"]) {
          throw new Error(
            "DiffVersioningExtension: the y-attributed-* marks are missing from " +
              "the schema. This should not happen — the extension registers them " +
              "via AttributionExtension.",
          );
        }

        const baselineNode = _blocksToProsemirrorNode(editor, baselineBlocks);
        const snapshotNode = _blocksToProsemirrorNode(editor, snapshotBlocks);

        // gc must stay off so the attribution manager can read the full struct
        // store (including deleted items) when diffing.
        const prevDoc = new Y.Doc({ gc: false });
        const prevType = prevDoc.get("prosemirror");
        prevDoc.transact(() => {
          prevType.applyDelta(docToDelta(baselineNode) as any);
        });

        // Fork prevDoc into nextDoc so they share client/clock ids, then apply the
        // baseline → snapshot delta as a new transaction. New content gets ids
        // that prevDoc lacks (→ inserts); items retained-away become deletes.
        const nextDoc = new Y.Doc({ gc: false });
        Y.applyUpdateV2(nextDoc, Y.encodeStateAsUpdateV2(prevDoc));
        const nextType = findTypeInOtherYdoc(prevType, nextDoc);

        // Attach the author store BEFORE applying the delta so the diff
        // transaction's inserts/deletes are attributed.
        const attrs = attributeTransactionsTo(nextDoc, DIFF_AUTHOR_ID);

        const delta = docDiffToDelta(baselineNode, snapshotNode);
        nextDoc.transact(() => {
          nextType.applyDelta(delta as any);
        }, DIFF_AUTHOR_ID);

        const renderer = Y.createDiffRenderer(prevDoc, nextDoc, {
          attributions: attrs,
        });

        // The diff is applied on top of whatever is currently on screen: the
        // attributed content comes entirely from the baseline -> snapshot Y
        // diff above, not from the ProseMirror before-state, so emptying the
        // document first would only churn node views for no gain.
        editor.exec((state, dispatch) => {
          const tr = yNodeToTransaction(state.tr, nextType, { renderer });
          if (dispatch) {
            dispatch(tr);
          }
          return true;
        });

        prevDoc.destroy();
        nextDoc.destroy();
      },
    };
  },
);
