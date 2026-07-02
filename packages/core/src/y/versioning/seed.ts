import * as Y from "@y/y";
import { encodeAny } from "lib0/buffer";
import { uint32 } from "lib0/random";

import type { BuildSnapshotsResult } from "../extensions/snapshotBuilder.js";

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

/** A version marker created on the server while seeding. */
export interface SeededVersion {
  id: string;
  name: string;
}

/** The parts of a {@link BuildSnapshotsResult} that {@link seedYHubDocument} needs. */
export type SeedableBuild = Pick<
  BuildSnapshotsResult,
  "baseUpdate" | "snapshots"
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
  /** Custom attributions riding this patch's content (e.g. version markers). */
  customAttributions?: Array<{ k: string; v: string }>;
};

/** Build the throwaway novel content a version marker rides on (see yhub.ts `patchDoc`). */
function makeVersionMarkerUpdate(): Uint8Array {
  // YHub only records custom attributions when they attach to NEW content that
  // survives its server-side diff. The version's real content was already
  // PATCHed (attributed to individual users), so the marker needs its own scrap
  // of novel content: a single insert into a dedicated `__bn_version_markers`
  // fragment the editor never renders. A fresh Y.Doc guarantees a clientID the
  // server has never seen, so the diff is non-empty and the marker lands.
  const markerDoc = new Y.Doc();
  markerDoc.get("__bn_version_markers", "XmlFragment").insert(0, ["v"]);
  return Y.encodeStateAsUpdate(markerDoc);
}

/**
 * Pre-populate a YHub document with content **and** version history from a
 * {@link buildSnapshots} result, without a live editor / sync connection.
 *
 * Each step's contributions are PATCHed to `/ydoc/{org}/{docId}` as a single
 * ordered `patches` bulk request: one content patch per contributing user
 * (attributed via `by`, **no** version marker), followed by one marker patch
 * carrying a `type:version` custom attribution — the same marker
 * {@link createYHubVersioningEndpoints}'s `create` uses. Because the version's
 * attribution window spans all of its content patches, **multiple users are
 * attributed within the one version**. The starting document state
 * ({@link BuildSnapshotsResult.baseUpdate}) is PATCHed first, without a marker,
 * so the step updates have their baseline to merge onto.
 *
 * Every patch carries an explicit, monotonically increasing `at` timestamp so
 * the backfilled history stays deterministically ordered (content before its
 * marker, each version after the previous one).
 *
 * YHub speaks the V1 update format, so the V2 updates `buildSnapshots` produces
 * are converted; the synthetic marker update is already V1.
 *
 * @returns the version markers created, in order.
 *
 * @example
 * ```ts
 * const editor = BlockNoteEditor.create();
 * // NOTE: target the same fragment key the live editor reads (`doc.get()` => "")
 * const build = await buildSnapshots(editor, steps, { fragment: "" });
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
  const url = `${baseUrl}/ydoc/${org}/${docId}`;

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

  // Monotonic clock for the whole seed, so every patch is ordered and each
  // version's content lands strictly before its marker.
  let at = Date.now();

  // 1. Starting document state — content only, no version marker.
  await send({
    update: Y.convertUpdateFormatV2ToV1(build.baseUpdate),
    at: at++,
    customAttributions: [],
  });

  // 2. Each step: its per-user content patches, then a single `type:version`
  //    marker patch so it appears as one snapshot attributed to every author.
  const versions: SeededVersion[] = [];
  for (const snapshot of build.snapshots) {
    const id = String(uint32());

    const patches: YHubPatch[] = [];
    let lastAuthor: string | undefined;
    for (const contribution of snapshot.contributions) {
      const by = contribution.attribution?.by;
      const author = typeof by === "string" ? by : undefined;
      if (author) {
        lastAuthor = author;
      }
      patches.push({
        update: Y.convertUpdateFormatV2ToV1(contribution.update),
        by: author,
        at: at++,
        customAttributions: [],
      });
    }
    // The marker patch carries the version itself. YHub attributes an entry to a
    // single user, so credit the version to its most recent contributor (the
    // per-content attribution still records who authored each part).
    patches.push({
      update: makeVersionMarkerUpdate(),
      by: lastAuthor,
      at: at++,
      customAttributions: [
        { k: "type", v: "version" },
        { k: "id", v: id },
        { k: "name", v: snapshot.name },
      ],
    });

    await send({ patches });
    versions.push({ id, name: snapshot.name });
  }

  return versions;
}
