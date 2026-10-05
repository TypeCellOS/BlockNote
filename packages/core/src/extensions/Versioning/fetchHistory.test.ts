/** @vitest-environment node */
import { describe, expect, it, vi } from "vite-plus/test";

import { Store } from "../../util/Store.js";
import { createListSession } from "./list.js";
import type { VersioningEndpoints, VersioningState } from "./types.js";

function setup() {
  const store = new Store<VersioningState>({
    list: { loaded: false },
    view: { mode: "live" },
    listing: false,
    restoring: false,
  });
  const endpoints = {
    list: vi.fn(async () => ({
      current: { id: "current", createdAt: 3 },
      snapshots: [{ id: "older", createdAt: 1 }],
    })),
    getContent: async () => [],
  } satisfies VersioningEndpoints;
  return { store, endpoints, ...createListSession({ store, endpoints }) };
}

describe("version history fetch results", () => {
  it("returns a fetch failure and clears loading when the endpoint rejects", async () => {
    const { store, endpoints, refresh } = setup();
    const cause = new Error("offline");
    endpoints.list.mockRejectedValueOnce(cause);

    const pending = refresh();
    expect(store.state.listing).toBe(true);
    await expect(pending).resolves.toEqual({
      error: { type: "fetch-failed", cause },
    });
    expect(store.state.listing).toBe(false);
    expect(store.state.list.loaded).toBe(false);
    expect(store.state.listError).toEqual({ type: "fetch-failed", cause });
  });

  it("handles a synchronous endpoint failure", async () => {
    const { store, endpoints, refresh } = setup();
    const cause = new Error("offline");
    endpoints.list.mockImplementationOnce(() => {
      throw cause;
    });
    await expect(refresh()).resolves.toEqual({
      error: { type: "fetch-failed", cause },
    });
    expect(store.state.listing).toBe(false);
  });

  it("preserves loaded history on failure and clears the error on success", async () => {
    const { store, endpoints, refresh } = setup();
    const loaded = await refresh();
    expect(loaded.value).toEqual(store.state.list);
    const previous = store.state.list;
    endpoints.list.mockRejectedValueOnce(new Error("offline"));

    await refresh();
    expect(store.state.list).toBe(previous);
    expect(store.state.listError?.type).toBe("fetch-failed");
    await refresh();
    expect(store.state.listError).toBeUndefined();
  });

  it("joins concurrent failed fetches and allows a subsequent fetch", async () => {
    const { endpoints, refresh } = setup();
    endpoints.list.mockRejectedValueOnce(new Error("offline"));
    const first = refresh();
    expect(refresh()).toBe(first);
    await first;
    expect(endpoints.list).toHaveBeenCalledOnce();
    const second = await refresh();
    expect(second.error).toBeUndefined();
    expect(endpoints.list).toHaveBeenCalledTimes(2);
  });

  it("does not convert a list processing bug into a fetch failure", async () => {
    const { store, endpoints, refresh } = setup();
    const cause = new Error("broken snapshot metadata");
    endpoints.list.mockResolvedValueOnce({
      current: { id: "current", createdAt: 3 },
      snapshots: [
        {
          id: "older",
          get createdAt(): number {
            throw cause;
          },
        },
        { id: "newer", createdAt: 2 },
      ],
    });

    await expect(refresh()).rejects.toBe(cause);
    expect(store.state.listing).toBe(false);
    expect(store.state.listError).toBeUndefined();
  });
});
