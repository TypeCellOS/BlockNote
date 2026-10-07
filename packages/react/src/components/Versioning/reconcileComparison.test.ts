// @vitest-environment node
import { expect, it, vi } from "vite-plus/test";
import type {
  VersioningState,
  VersionSnapshot,
} from "@blocknote/core/extensions";
import { createVersioning } from "../../../../core/src/extensions/Versioning/createVersioning.js";
import { getComparisonReconciliation } from "./reconcileComparison.js";
import {
  CURRENT_VERSION_ID,
  getPreviousVisibleVersion,
  getVersionList,
  getVersionSelection,
} from "./visibleHistory.js";

function history(): Extract<VersioningState, { mode: "versions" }> & {
  history: { status: "success"; data: VersionSnapshot[] };
} {
  return {
    mode: "versions",
    capturedAt: 4000,
    displayed: { type: "current" },
    compareTo: "latest",
    restoring: false,
    history: {
      status: "success",
      data: [
        { id: "latest", createdAt: 3000, name: "Marketing review" },
        { id: "automatic", createdAt: 2000 },
        { id: "old", createdAt: 1000, name: "First draft" },
      ],
    },
  };
}

it.each([false, true])(
  "reconciles fallback Current after deleting the displayed source (named-only: %s)",
  (namedOnly) => {
    const before = history();
    before.displayed = { type: "snapshot", id: "latest" };
    before.compareTo = namedOnly ? "old" : "automatic";
    const after = history();
    after.history.data = before.history.data.filter(
      (row) => row.id !== "latest",
    );
    after.compareTo = undefined;
    expect(
      getComparisonReconciliation(before, after, "latest", true, namedOnly)?.id,
    ).toBe(CURRENT_VERSION_ID);
  },
);

it.each([false, true])(
  "clears a hidden baseline after clearing its name (last named baseline: %s)",
  (lastNamed) => {
    const before = history();
    const after = history();
    after.history.data = before.history.data
      .filter((row) => !lastNamed || row.id !== "old")
      .map((row) => (row.id === "latest" ? { ...row, name: undefined } : row));
    expect(
      getComparisonReconciliation(before, after, "latest", true, true)?.id,
    ).toBe(CURRENT_VERSION_ID);
  },
);

it("preserves an explicit baseline when its name changes without changing visibility", () => {
  const before = history();
  before.compareTo = "old";
  const after = history();
  after.compareTo = "old";
  after.history.data = before.history.data.map((row) =>
    row.id === "old" ? { ...row, name: "Renamed" } : row,
  );
  expect(
    getComparisonReconciliation(before, after, "old", true, true),
  ).toBeUndefined();
});

it("preserves comparison when clearing a name in unfiltered history", () => {
  const before = history();
  before.compareTo = "old";
  const after = history();
  after.compareTo = "old";
  after.history.data = before.history.data.map((row) =>
    row.id === "old" ? { ...row, name: undefined } : row,
  );
  expect(
    getComparisonReconciliation(before, after, "old", true, false),
  ).toBeUndefined();
});

it("keeps a source selected when clearing its name hides it", () => {
  const before = history();
  before.displayed = { type: "snapshot", id: "latest" };
  before.compareTo = "old";
  const after = history();
  after.displayed = before.displayed;
  after.compareTo = "old";
  after.history.data = before.history.data.map((row) =>
    row.id === "latest" ? { ...row, name: undefined } : row,
  );
  expect(
    getComparisonReconciliation(before, after, "latest", true, true)?.id,
  ).toBe("latest");
});

it("does not reset an explicit baseline after an unrelated deletion", () => {
  const before = history();
  before.compareTo = "old";
  const after = history();
  after.compareTo = "old";
  after.history.data = before.history.data.filter(
    (row) => row.id !== "automatic",
  );
  expect(
    getComparisonReconciliation(before, after, "automatic", true, false),
  ).toBeUndefined();
});

it("does not reconcile when comparison is off or the sidebar has closed", () => {
  const before = history();
  const after = history();
  after.compareTo = undefined;
  expect(
    getComparisonReconciliation(before, after, "latest", false, true),
  ).toBeUndefined();
  expect(
    getComparisonReconciliation(before, { mode: "live" }, "latest", true, true),
  ).toBeUndefined();
});

it.each([
  { mutation: "remove", lastNamed: false, baseline: "old" },
  { mutation: "rename", lastNamed: false, baseline: "old" },
  { mutation: "rename", lastNamed: true, baseline: undefined },
] as const)(
  "renders the reconciled comparison after $mutation (last named: $lastNamed)",
  async ({ mutation, lastNamed, baseline }) => {
    let snapshots = history().history.data.filter(
      (row) => !lastNamed || row.id !== "old",
    );
    const show = vi.fn();
    const versioning = createVersioning({
      adapter: {
        supportsComparison: true,
        open() {
          return {
            current: { content: "frozen", capturedAt: 4000 },
            show,
            close() {},
          };
        },
      },
      storage: {
        async list() {
          return { ok: true, value: snapshots };
        },
        async getContent(id: string) {
          return { ok: true, value: id };
        },
        async remove(id: string) {
          snapshots = snapshots.filter((row) => row.id !== id);
          return { ok: true, value: undefined };
        },
        async rename(id: string, name?: string) {
          snapshots = snapshots.map((row) =>
            row.id === id ? { ...row, name } : row,
          );
          return { ok: true, value: undefined };
        },
      },
      setReadOnly() {},
    });
    versioning.open();
    await versioning.list();
    await versioning.select(
      mutation === "remove"
        ? { type: "snapshot", id: "latest" }
        : { type: "current" },
      { compareTo: mutation === "remove" ? "old" : "latest" },
    );
    const before = versioning.store.state;
    expect(await versioning[mutation]("latest")).toEqual({ status: "done" });
    const row = getComparisonReconciliation(
      before,
      versioning.store.state,
      "latest",
      true,
      true,
    );
    expect(row?.id).toBe(CURRENT_VERSION_ID);
    const list = getVersionList(versioning.store.state);
    if (!list.loaded || !row) {
      throw new Error("Expected a loaded reconciliation row");
    }
    await versioning.select(
      getVersionSelection(versioning.store.state, row, true),
      { compareTo: getPreviousVisibleVersion(list, row, true)?.id },
    );
    expect(versioning.store.state).toMatchObject({
      displayed: { type: "current" },
      compareTo: baseline,
    });
    expect(show).toHaveBeenLastCalledWith({
      content: "frozen",
      target: { type: "current" },
      ...(baseline === undefined ? {} : { comparison: { content: baseline } }),
    });
    versioning.close();
  },
);
