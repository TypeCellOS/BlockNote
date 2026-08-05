import { BlockNoteEditor } from "@blocknote/core";

import { buildEditHistory } from "./snapshotBuilder";
import type { EditHistoryStep } from "./snapshotBuilder";
import { seedYHubDocument } from "./seed";
import { VERSIONS } from "./versions";

/**
 * The history of a real BlockNote project-status document, replayed as five
 * named versions — each one attributed to *several* users. Seeding it builds
 * real Yjs history and PATCHes it to YHub, so the editor opens with rich
 * content AND a populated version history where each version shows multiple
 * contributors.
 *
 * Each version of the document is stored fully (a tree of blocks with stable
 * ids) in `./versions`. {@link buildEditHistory} reconciles the editor towards
 * each version's target in turn via `applyVersionUnbatched`, which performs a
 * rough id+hash diff against the editor's current state and emits only the
 * minimal ops that get there:
 *
 *   - `insertBlocks` for genuinely-new blocks (whole subtrees at once),
 *   - `updateBlock`  for blocks whose type / props / content changed,
 *   - `removeBlocks` for blocks that disappeared,
 *   - a move (remove + re-insert, keeping the id) for blocks that were
 *     reparented or reordered.
 *
 * Each emitted op becomes its own captured transaction, attributed to one of
 * the version's authors at random, and `seedYHubDocument` lands them as
 * separate authored content before committing a single version marker — so the
 * one version is attributed to several authors.
 */

/** Each version's target tree plus the 2–3 users who collaborate on it. */
const VERSION_PLAN: EditHistoryStep[] = [
  // `authors` are user ids (see `userdata.ts`): 1 Alice, 2 Bob, 3 Carol,
  // 4 Dave, 5 Erin. They flow through to `attribution.by` and are resolved back
  // to usernames by the collaboration user store in the versioning UI.
  { name: "Initial budget skeleton", target: VERSIONS.v1, authors: ["1", "2"] },
  {
    name: "Flesh out the full project document",
    target: VERSIONS.v2,
    authors: ["2", "3", "4"],
  },
  {
    name: "Add estimates and next steps",
    target: VERSIONS.v3,
    authors: ["1", "3"],
  },
  {
    name: "Expand schema options and POC links",
    target: VERSIONS.v4,
    authors: ["2", "4", "5"],
  },
  {
    name: "Update budget numbers and trim",
    target: VERSIONS.v5,
    authors: ["3", "5"],
  },
];

/**
 * Build the sample document's history offline and seed it to YHub under the
 * given coordinates, so the live editor syncs the content and the version
 * sidebar shows one snapshot per step.
 *
 * The `fragment` must match the key the live editor reads (`doc.get(fragment)`).
 */
export async function seedSampleVersions(opts: {
  baseUrl: string;
  org: string;
  docId: string;
  fragment: string;
}): Promise<void> {
  const editor = BlockNoteEditor.create();
  const build = await buildEditHistory(editor, VERSION_PLAN, {
    fragment: opts.fragment,
  });
  await seedYHubDocument(opts, build);
}
