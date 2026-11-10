// @vitest-environment node
import { expect, it } from "vite-plus/test";
import type { VersioningState } from "@blocknote/core/extensions";
import {
  CURRENT_VERSION_ID,
  getPreviousVisibleVersion,
  getShownVersionRow,
  getVersionList,
  getVisibleVersionRows,
} from "./visibleHistory.js";

function history(showCurrentVersion?: boolean): VersioningState {
  return {
    mode: "versions",
    capturedAt: 3000,
    showCurrentVersion,
    displayed: { type: "snapshot", id: "latest" },
    restoring: false,
    history: {
      status: "success",
      data: [
        { id: "latest", createdAt: 2000, by: ["alice"] },
        { id: "old", createdAt: 1000, name: "Draft" },
      ],
    },
  };
}

it.each([undefined, true])(
  "prepends frozen Current for snapshot storage, policy=%s",
  (policy) => {
    const list = getVersionList(history(policy));
    expect(list.loaded).toBe(true);
    if (!list.loaded) {
      throw new Error("History not loaded");
    }
    expect(
      getVisibleVersionRows(list, false).map((row) => row.snapshot.id),
    ).toEqual([CURRENT_VERSION_ID, "latest", "old"]);
  },
);

it("uses the newest checkpoint as Current and keeps it under the named-only filter", () => {
  const state = history(false);
  const list = getVersionList(state);
  if (!list.loaded) {
    throw new Error("History not loaded");
  }
  const rows = getVisibleVersionRows(list, true);
  expect(rows).toEqual([
    {
      snapshot: { id: "latest", createdAt: 2000, by: ["alice"] },
      isCurrent: true,
    },
    {
      snapshot: { id: "old", createdAt: 1000, name: "Draft" },
      isCurrent: false,
    },
  ]);
  expect(getShownVersionRow(list, state)).toEqual(rows[0]);
  expect(list.current).toBeDefined();
  if (!list.current) {
    throw new Error("Current not found");
  }
  expect(getPreviousVisibleVersion(list, list.current, true)?.id).toBe("old");
});

it("does not manufacture Current for empty continuous history", () => {
  const state = history(false);
  if (state.mode !== "versions") {
    throw new Error("History not open");
  }
  state.history = { status: "success", data: [] };
  const list = getVersionList(state);
  if (!list.loaded) {
    throw new Error("History not loaded");
  }
  expect(getVisibleVersionRows(list, false)).toEqual([]);
  expect(getShownVersionRow(list, state)).toBeUndefined();
});
