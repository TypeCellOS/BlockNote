import { docToDelta } from "@y/prosemirror";
import * as Y from "@y/y";

import type { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import type { User } from "../../user/index.js";
import {
  _blocksToProsemirrorNode,
  docDiffToDelta,
  findTypeInOtherYdoc,
  getProseMirrorTrFromYFragment,
} from "../utils.js";
import { AttributionExtension } from "./AttributionExtension.js";
import type { GetAttributionMarkClassName } from "./YAttributionMarks.js";

/**
 * Default author identity used when a diff is rendered without an explicit
 * author. In the in-memory / non-collaborative case there is no real author, so
 * we attribute the whole baseline → snapshot change to a single synthetic user.
 * The two ids (`a` / `b`) give distinct colors when alternating between diffs.
 */
export const DEFAULT_DIFF_USERS: User[] = [
  { id: "a", username: "User A", avatarUrl: "", color: "#e6194b" },
  { id: "b", username: "User B", avatarUrl: "", color: "#3cb44b" },
];

export type DiffVersioningExtensionOptions = {
  /**
   * The users a diff's changes can be attributed to. Resolved to names/colors
   * in the diff marks' hover tooltips. Defaults to {@link DEFAULT_DIFF_USERS}
   * (User A / User B).
   */
  users?: User[];
  /**
   * See {@link GetAttributionMarkClassName}. Forwarded to the underlying
   * {@link AttributionExtension} to override mark styling by change type.
   */
  getAttributionMarkClassName?: GetAttributionMarkClassName;
};

/**
 * Records the author of each transaction on `doc` into a mutable
 * {@link Y.Attributions}, so the resulting attribution marks carry a non-empty
 * `userIds` (and therefore resolve to a color/name). The listener must be
 * attached *before* the attributed transaction runs. Mirrors the store used by
 * the suggestion gallery example (`createAttributionStore`).
 */
function attributeTransactionsTo(doc: Y.Doc, userId: string): Y.Attributions {
  const attrs = new Y.Attributions();
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
 * the {@link renderDiff} / {@link clearDiff} capability.
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
    const users = options?.users ?? DEFAULT_DIFF_USERS;
    const resolveUsers = async (ids: string[]): Promise<User[]> =>
      users.filter((u) => ids.includes(u.id));

    /**
     * Render a read-only diff of `baselineBlocks` → `snapshotBlocks` into the
     * editor, attributing the whole change to `authorId` (defaults to the first
     * configured user). Uses the "two-doc fork" recipe so the two Y.Docs share
     * history — a hard requirement for `createAttributionManagerFromDiff`, which
     * diffs by Yjs client/clock ids.
     */
    const renderDiff = (
      snapshotBlocks: Block<any, any, any>[],
      baselineBlocks: Block<any, any, any>[],
      authorId: string = users[0]?.id ?? "a",
    ) => {
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
      const attrs = attributeTransactionsTo(nextDoc, authorId);

      const delta = docDiffToDelta(baselineNode, snapshotNode);
      nextDoc.transact(() => {
        nextType.applyDelta(delta as any);
      }, authorId);

      const attributionManager = Y.createAttributionManagerFromDiff(
        prevDoc,
        nextDoc,
        { attrs },
      );

      // Clear the live doc first so ProseMirror rebuilds node views from
      // scratch (BlockNote node views resolve their block eagerly via getPos()
      // and throw on a moved node). The diff then inserts the attributed content
      // against an empty doc.
      editor.replaceBlocks(editor.document, []);

      editor.exec((state, dispatch) => {
        const tr = getProseMirrorTrFromYFragment({
          tr: state.tr,
          fragment: nextType,
          attributionManager,
        });
        if (dispatch) {
          dispatch(tr);
        }
        return true;
      });

      prevDoc.destroy();
      nextDoc.destroy();
    };

    /**
     * Leave diff view: clear the (mark-carrying) document and restore the given
     * blocks. Clears first so stale node views for block-level marks are torn
     * down instead of reused.
     */
    const clearDiff = (restore: Block<any, any, any>[]) => {
      editor.replaceBlocks(editor.document, []);
      editor.replaceBlocks(editor.document, restore);
    };

    return {
      key: "diffVersioning",
      // Compose AttributionExtension: registers the y-attributed-* marks and
      // drives their colors + hover-tooltip names from the (static) user store.
      blockNoteExtensions: [
        AttributionExtension({
          resolveUsers,
          getAttributionMarkClassName: options?.getAttributionMarkClassName,
        }),
      ],
      renderDiff,
      clearDiff,
    };
  },
);
