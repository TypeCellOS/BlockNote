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

/**
 * Pre-populate a YHub document with content **and** version history from a
 * {@link buildSnapshots} result, without a live editor / sync connection.
 *
 * Each step is PATCHed to `/ydoc/{org}/{docId}` as novel content carrying a
 * `type:version` custom attribution — the same marker {@link createYHubVersioningEndpoints}'s
 * `create` uses — so every step shows up as a separate snapshot in the version
 * history. The starting document state ({@link BuildSnapshotsResult.baseUpdate})
 * is PATCHed first, without a marker, so the step updates have their baseline
 * to merge onto.
 *
 * YHub speaks the V1 update format, so updates are converted from the V2 format
 * `buildSnapshots` produces.
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

  const patch = async (
    update: Uint8Array,
    customAttributions: Array<{ k: string; v: string }>,
  ) => {
    const body = {
      update: Y.convertUpdateFormatV2ToV1(update),
      customAttributions,
    };
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

  // 1. Starting document state — content only, no version marker.
  await patch(build.baseUpdate, []);

  // 2. Each step's content, carrying a `type:version` marker so it appears as a
  //    separate snapshot in the version history.
  const versions: SeededVersion[] = [];
  for (const snapshot of build.snapshots) {
    const id = String(uint32());
    const customAttributions: Array<{ k: string; v: string }> = [
      { k: "type", v: "version" },
      { k: "id", v: id },
      { k: "name", v: snapshot.name },
    ];
    const by = snapshot.attribution?.by;
    if (by !== undefined) {
      customAttributions.push({
        k: "by",
        v: typeof by === "string" ? by : JSON.stringify(by),
      });
    }

    await patch(snapshot.diff.update, customAttributions);
    versions.push({ id, name: snapshot.name });
    await new Promise((r) => setTimeout(r, 10));
  }

  return versions;
}
