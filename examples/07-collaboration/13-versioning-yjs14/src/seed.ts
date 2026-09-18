import * as Y from "@y/y";
import { encodeAny } from "lib0/buffer";

import type { BuildEditHistoryResult } from "./snapshotBuilder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeedYHubDocumentOptions {
  /** Base URL of the YHub API (e.g. `"https://yhub.example.com"`), no trailing slash. */
  baseUrl: string;
  /** YHub organisation identifier. */
  org: string;
  /** Document identifier within the organisation. */
  docId: string;
  /** Optional headers to include in every request (e.g. auth tokens). */
  headers?: Record<string, string>;
}

/** A named version produced by seeding. */
export interface SeededVersion {
  /**
   * The version's server timestamp — the `to` of its last seeded edit, and so
   * the key its name is stored under in the live doc's `__bn_versions` array.
   */
  to: number;
  name: string;
}

/** The parts of a {@link BuildEditHistoryResult} that {@link seedYHubDocument} needs. */
export type SeedableBuild = Pick<
  BuildEditHistoryResult,
  "baseUpdate" | "steps"
>;

// ---------------------------------------------------------------------------
// seedYHubDocument
// ---------------------------------------------------------------------------

/** A single patch in a YHub bulk-`patches` PATCH body. */
type YHubPatch = {
  /** V1 Yjs update with this patch's novel content. */
  update: Uint8Array;
  /** Author to attribute the content to (YHub `userid`). */
  by?: string;
  /** Timestamp override (unix ms), so backfilled history stays ordered. */
  at?: number;
  /** Custom attributions riding this patch's content. */
  customAttributions?: Array<{ k: string; v: string }>;
};

/**
 * Pre-populate a YHub document with content **and** version history from a
 * {@link buildEditHistory} result, without a live editor / sync connection.
 *
 * Each step's captured transactions are PATCHed to `/api/ydoc/v1/{org}/{docId}`
 * as a single ordered `patches` bulk request: one content patch per captured
 * transaction, attributed via `by`. Nothing marks a version on the server —
 * YHub's history *is* the version list — so a version is simply a run of edits
 * separated from the next by a large gap, which is why **multiple users end up
 * attributed within one version**. The starting document state
 * ({@link BuildEditHistoryResult.baseUpdate}) is PATCHed first so the step
 * patches have their baseline to merge onto.
 *
 * Every patch carries the explicit `at` timestamp captured by
 * {@link buildEditHistory}, so the backfilled history stays deterministically
 * ordered (each version after the previous one).
 *
 * YHub speaks the V1 update format, so the V2 updates `buildEditHistory`
 * produces are converted.
 *
 * @returns each version's name and its last edit's timestamp, in order — the
 * caller writes those into the live doc's `__bn_versions` array to name them.
 *
 * @example
 * ```ts
 * const editor = BlockNoteEditor.create();
 * // NOTE: target the same fragment key the live editor reads (`doc.get()` => "")
 * const build = await buildEditHistory(editor, steps, { fragment: "" });
 * await seedYHubDocument(
 *   { baseUrl: "https://yhub.example.com", org: workspaceId, docId },
 *   build,
 * );
 * ```
 */
export async function seedYHubDocument(
  options: SeedYHubDocumentOptions,
  build: SeedableBuild,
): Promise<SeededVersion[]> {
  const { baseUrl, org, docId, headers = {} } = options;
  const url = `${baseUrl}/ydoc/v1/${org}/${docId}`;

  const send = async (body: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: encodeAny(body) as BufferSource,
    });
    if (!res.ok) {
      throw new Error(
        `YHub seed request failed: ${res.status} ${res.statusText} (${url})`,
      );
    }
  };

  // 1. Starting document state. Timestamp it just before the first captured
  //    transaction so it sorts first.
  await send({
    update: Y.convertUpdateFormatV2ToV1(build.baseUpdate),
    at: build.steps[0]?.patches[0]?.at ?? Date.now(),
    customAttributions: [],
  });

  // 2. Each step: one content patch per captured transaction. The step's last
  //    edit ends its group (the next version is days away, well past the
  //    example's `groupMaxGap`), so `step.at` is the timestamp the version's
  //    name attaches to.
  const versions: SeededVersion[] = [];
  for (const step of build.steps) {
    const patches: YHubPatch[] = step.patches.map((p) => ({
      update: Y.convertUpdateFormatV2ToV1(p.update),
      by: p.by,
      at: p.at,
      customAttributions: [],
    }));

    await send({ patches });
    versions.push({ to: step.at, name: step.name });
  }

  return versions;
}
