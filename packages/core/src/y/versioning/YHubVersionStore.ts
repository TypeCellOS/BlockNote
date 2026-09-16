import type * as Y from "@y/y";
import * as schema from "lib0/schema";
import { assert } from "lib0/error";

// An array avoids map-key tombstones. The last entry for each timestamp wins.
const VERSIONS_ARRAY = "__bn_versions";

const $versionEntry = schema.$object({
  id: schema.$number,
  name: schema.$string.optional,
  restoredFrom: schema.$number.optional,
});

export type YHubVersionEntry = schema.Unwrap<typeof $versionEntry> &
  Record<string, unknown>;

/** Metadata stored in the live document, resolved fresh for each operation. */
export class YHubVersionStore {
  constructor(private readonly getDoc: () => Y.Doc | undefined) {}

  getArray(): Y.Node {
    const array = this.getDoc()?.get(VERSIONS_ARRAY);
    assert(array != null);
    return array!;
  }

  readEntries(): Map<number, YHubVersionEntry> {
    const entries = new Map<number, YHubVersionEntry>();
    const elements: unknown[] =
      this.getDoc()?.get(VERSIONS_ARRAY).toArray() ?? [];
    for (const element of elements) {
      if ($versionEntry.check(element)) {
        entries.set(element.id, element);
      }
    }
    return entries;
  }

  private deleteEntryElements(array: Y.Node, id: number): void {
    const elements: unknown[] = array.toArray();
    // Back to front so the indices of the not-yet-visited elements hold.
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if ($versionEntry.check(element) && element.id === id) {
        array.delete(i, 1);
      }
    }
  }

  upsertEntry(entry: YHubVersionEntry) {
    const array = this.getArray();
    // One transaction, so peers observe the delete and the push as a single
    // change rather than a beat in which the entry is nowhere at all.
    array.doc!.transact(() => {
      this.deleteEntryElements(array, entry.id);
      array.push([entry] as never);
    });
  }

  setName(id: number, name: string | undefined) {
    const next: YHubVersionEntry = { ...this.readEntries().get(id), id };
    if (name) {
      next.name = name;
    } else {
      delete next.name;
    }
    if (Object.keys(next).length === 1) {
      this.deleteEntryElements(this.getArray(), id);
      return;
    }
    this.upsertEntry(next);
  }
}
