import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { blocksToYDoc } from "@blocknote/core/y";
import * as Y from "@y/y";

const FRAGMENT = "doc";

// A headless editor, used only for its (default) schema when building Y.Docs
// from blocks — `blocksToYDoc` needs an editor to resolve the schema. Created
// lazily on first use so importing this module has no side effects.
let schemaEditor: ReturnType<typeof BlockNoteEditor.create> | undefined;
const getSchemaEditor = () => (schemaEditor ??= BlockNoteEditor.create());

/**
 * Build a fully-seeded Y.Doc from blocks, **synchronously**. No editor is bound,
 * so an editor later created on this doc ADOPTS the content instead of writing a
 * competing initial blockGroup. This is the gate — but as the default path, which
 * lets the views skip the seed-then-poll-then-sync dance entirely.
 */
export function docFromBlocks(blocks: PartialBlock[]): Y.Doc {
  return blocksToYDoc(getSchemaEditor(), blocks, FRAGMENT);
}

/**
 * Clone a Y.Doc into a fresh one. Preserves the source's Y ids (so a later diff
 * shows only the real changes, not a full replace) and keeps a single root (the
 * fresh doc has no init blockGroup to collide with).
 */
export function cloneDoc(
  source: Y.Doc,
  opts?: { isSuggestionDoc?: boolean },
): Y.Doc {
  const doc = opts?.isSuggestionDoc
    ? new Y.Doc({ isSuggestionDoc: true })
    : new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(source));
  return doc;
}

/**
 * The docs + managers for a suggestion scenario, built against a snapshot clone
 * of `sourceBase` — so the caller can keep an editable "live" base and rebuild
 * these on every base edit. One suggestion doc + manager per author
 * (`authorIds`), whose tracked edits are attributed to their id — so each mark
 * carries a non-empty `data-user-ids` and the hover tooltip shows. With more than
 * one author a `merged` viewer doc is added that replays every author's
 * suggestions, tagged by the Yjs transaction origin. Client ids are pinned so the
 * merge tiebreak is stable.
 */
export function buildSuggestionScenarioDocs(
  sourceBase: Y.Doc,
  authorIds: string[],
) {
  const baseDoc = cloneDoc(sourceBase);
  baseDoc.clientID = 1;

  const authors = authorIds.map((id, i) => {
    const suggestionDoc = cloneDoc(baseDoc, { isSuggestionDoc: true });
    suggestionDoc.clientID = i + 2;
    const manager = Y.createAttributionManagerFromDiff(baseDoc, suggestionDoc, {
      attrs: createAttributionStore(suggestionDoc, (tr) =>
        tr.local ? id : null,
      ),
    });
    manager.suggestionMode = true;
    return { id, suggestionDoc, manager };
  });

  const merged =
    authorIds.length > 1
      ? (() => {
          const doc = cloneDoc(baseDoc, { isSuggestionDoc: true });
          doc.clientID = authorIds.length + 2;
          const manager = Y.createAttributionManagerFromDiff(baseDoc, doc, {
            attrs: createAttributionStore(doc, (tr) =>
              authorIds.includes(String(tr.origin)) ? String(tr.origin) : null,
            ),
          });
          manager.suggestionMode = false;
          return { doc, manager };
        })()
      : undefined;

  return { baseDoc, authors, merged };
}

/**
 * In-memory attribution store — records the author of each transaction into a
 * mutable `Y.Attributions` so suggestion marks render in their author's color.
 * `resolveUserId` returns the author id, or null to leave a change unattributed
 * (the base seed and the manager's own base→suggestion flow carry no author).
 * Mirrors the store in `concurrentSuggestionFixture.tsx`.
 */
export function createAttributionStore(
  doc: Y.Doc,
  resolveUserId: (tr: any) => string | null,
): Y.Attributions {
  const attrs = new Y.Attributions();
  doc.on("beforeObserverCalls", (tr: any) => {
    const userId = resolveUserId(tr);
    if (userId == null) {
      return;
    }
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

// (single- and multi-author suggestion docs are built by
// `buildSuggestionScenarioDocs` above.)
