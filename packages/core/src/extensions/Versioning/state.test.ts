/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vite-plus/test";

import {
  deriveStatus,
  findSnapshot,
  isReadOnly,
  resolveCompareTo,
} from "./state.js";
import type {
  LoadedVersioningList,
  VersioningState,
  VersionSnapshot,
} from "./types.js";

function snap(id: string, createdAt: number): VersionSnapshot {
  return { id, createdAt };
}

function loadedList(
  snapshots: VersionSnapshot[],
  current: VersionSnapshot = snap("current", 30),
): LoadedVersioningList {
  return { loaded: true, current, snapshots };
}

function state(overrides?: Partial<VersioningState>): VersioningState {
  return {
    list: { loaded: false },
    view: { mode: "live" },
    status: { type: "idle" },
    restoring: false,
    ...overrides,
  };
}

describe("isReadOnly", () => {
  it("is read-only while previewing any mode", () => {
    expect(
      isReadOnly(state({ view: { mode: "snapshot", snapshotId: "a" } })),
    ).toBe(true);
    expect(isReadOnly(state({ view: { mode: "current" } }))).toBe(true);
    expect(
      isReadOnly(state({ view: { mode: "current", compareToId: "a" } })),
    ).toBe(true);
  });

  it("is read-only while restoring, even when the view is live", () => {
    expect(isReadOnly(state({ restoring: true }))).toBe(true);
  });

  it("is editable when live and not restoring", () => {
    expect(isReadOnly(state())).toBe(false);
  });
});

describe("findSnapshot", () => {
  it("resolves the current row by id", () => {
    const current = snap("current", 30);
    expect(findSnapshot(loadedList([], current), "current")).toBe(current);
  });

  it("resolves a stored snapshot by id", () => {
    const stored = snap("a", 10);
    expect(findSnapshot(loadedList([stored]), "a")).toBe(stored);
  });

  it("accepts `{ id }` object identifiers", () => {
    const current = snap("current", 30);
    const stored = snap("a", 10);
    expect(findSnapshot(loadedList([stored], current), { id: "current" })).toBe(
      current,
    );
    expect(findSnapshot(loadedList([stored], current), { id: "a" })).toBe(
      stored,
    );
  });

  it("returns undefined for an unknown id", () => {
    expect(findSnapshot(loadedList([snap("a", 10)]), "nope")).toBeUndefined();
  });

  it("returns undefined when the list is not loaded", () => {
    expect(findSnapshot({ loaded: false }, "a")).toBeUndefined();
    expect(findSnapshot({ loaded: false }, { id: "a" })).toBeUndefined();
  });

  it("returns undefined when no id is given", () => {
    expect(
      findSnapshot(loadedList([snap("a", 10)]), undefined),
    ).toBeUndefined();
  });

  it("never reports the current row as a stored snapshot", () => {
    // `current` is resolved by id even though it is not among `snapshots`.
    const current = snap("current", 30);
    const list = loadedList([snap("a", 10)], current);
    expect(findSnapshot(list, "current")).toBe(current);
    expect(list.snapshots).not.toContain(current);
  });
});

describe("resolveCompareTo", () => {
  it("returns undefined when no baseline is given", () => {
    expect(
      resolveCompareTo(loadedList([snap("a", 10)]), undefined),
    ).toBeUndefined();
  });

  it("resolves a known id to its snapshot", () => {
    const stored = snap("a", 10);
    const current = snap("current", 30);
    expect(resolveCompareTo(loadedList([stored], current), "a")).toBe(stored);
    expect(resolveCompareTo(loadedList([stored], current), { id: "a" })).toBe(
      stored,
    );
    expect(resolveCompareTo(loadedList([stored], current), "current")).toBe(
      current,
    );
  });

  it("throws for unknown string ids", () => {
    expect(() => resolveCompareTo(loadedList([snap("a", 10)]), "nope")).toThrow(
      "Snapshot not found: nope",
    );
  });

  it("throws for unknown object ids", () => {
    expect(() =>
      resolveCompareTo(loadedList([snap("a", 10)]), { id: "nope" }),
    ).toThrow("Snapshot not found: nope");
  });
});

describe("deriveStatus", () => {
  it("is idle when neither operation is in flight", () => {
    expect(deriveStatus(false, undefined)).toEqual({ type: "idle" });
  });

  it("reports listing when only the list is fetching", () => {
    expect(deriveStatus(true, undefined)).toEqual({ type: "listing" });
  });

  it("reports loading-preview while a preview loads, outranking listing", () => {
    const view = { mode: "snapshot", snapshotId: "a" } as const;
    expect(deriveStatus(false, view)).toEqual({
      type: "loading-preview",
      view,
    });
    expect(deriveStatus(true, view)).toEqual({
      type: "loading-preview",
      view,
    });
  });
});
