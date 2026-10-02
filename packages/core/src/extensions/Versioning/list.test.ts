/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vite-plus/test";

import { Store } from "../../util/Store.js";
import { createListSession } from "./list.js";
import type {
  VersioningEndpoints,
  VersioningState,
  VersionSnapshot,
} from "./types.js";

function snap(id: string, createdAt: number): VersionSnapshot {
  return { id, createdAt };
}

/** Resolve or reject a request at an explicit point in a loading transition. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type ListResult = Awaited<ReturnType<VersioningEndpoints["list"]>>;

function setup(initialState?: VersioningState) {
  const store = new Store<VersioningState>(
    initialState ?? {
      list: { loaded: false },
      view: { mode: "live" },
      listing: false,
      restoring: false,
    },
  );
  const list = vi.fn<VersioningEndpoints["list"]>();
  const endpoints: VersioningEndpoints = {
    list,
    // `createListSession` only calls `list`; the other endpoints are stubs to
    // satisfy the interface.
    getContent: async () => undefined,
  };
  const session = createListSession({ store, endpoints });
  return { store, list, endpoints, session };
}

describe("createListSession", () => {
  it("starts idle and unloaded", () => {
    const { store } = setup();
    expect(store.state.listing).toBe(false);
    expect(store.state.list).toEqual({ loaded: false });
    expect(store.state.view).toEqual({ mode: "live" });
  });

  it("fetches, stores the list sorted newest-first, and returns it", async () => {
    const snapshots = [snap("a", 100), snap("b", 300), snap("c", 200)];
    const current = snap("current", 400);
    const { list, store, session } = setup();
    list.mockResolvedValue({ current, snapshots });

    const result = await session.refresh();

    expect(list).toHaveBeenCalledTimes(1);
    // The returned list is sorted newest-first...
    expect(result.snapshots.map((s) => s.id)).toEqual(["b", "c", "a"]);
    // ...without mutating the backend array...
    expect(snapshots.map((s) => s.id)).toEqual(["a", "b", "c"]);
    // ...and is what landed in the store.
    expect(store.state.list).toBe(result);
    expect(store.state.list).toEqual({
      loaded: true,
      current,
      snapshots: [snap("b", 300), snap("c", 200), snap("a", 100)],
    });
  });

  it("publishes listing on the idle→busy and busy→idle transitions", async () => {
    const request = deferred<ListResult>();
    const { list, store, session } = setup();
    list.mockReturnValue(request.promise);
    let listingTransitions = 0;
    store.subscribe(({ prevVal, currentVal }) => {
      if (prevVal.listing !== currentVal.listing) {
        listingTransitions++;
      }
    });

    const pending = session.refresh();
    expect(store.state.listing).toBe(true);
    expect(listingTransitions).toBe(1);

    request.resolve({ current: snap("current", 10), snapshots: [] });
    await pending;
    expect(store.state.listing).toBe(false);
    expect(listingTransitions).toBe(2);
  });

  it("is listing while pending and idle once settled", async () => {
    const request = deferred<ListResult>();
    const { list, store, session } = setup();
    list.mockReturnValue(request.promise);

    const pending = session.refresh();
    expect(store.state.listing).toBe(true);

    request.resolve({ current: snap("current", 10), snapshots: [] });
    await pending;
    expect(store.state.listing).toBe(false);
  });

  it("joins an in-flight fetch instead of re-listing", async () => {
    const request = deferred<ListResult>();
    const { list, store, session } = setup();
    list.mockReturnValue(request.promise);
    let listingTransitions = 0;
    store.subscribe(({ prevVal, currentVal }) => {
      if (prevVal.listing !== currentVal.listing) {
        listingTransitions++;
      }
    });

    const first = session.refresh();
    const second = session.refresh();
    expect(second).toBe(first);
    expect(list).toHaveBeenCalledTimes(1);
    // Only one busy transition despite two callers.
    expect(listingTransitions).toBe(1);

    request.resolve({ current: snap("current", 10), snapshots: [] });
    await Promise.all([first, second]);
    // Busy→idle fires once too.
    expect(listingTransitions).toBe(2);

    // Once settled, a new refresh fetches again.
    const third = session.refresh();
    expect(list).toHaveBeenCalledTimes(2);
    expect(third).not.toBe(first);
    await third;
  });

  it("keeps the previous list and reports idle when a fetch fails, then retries", async () => {
    const previousList = {
      loaded: true as const,
      current: snap("current", 30),
      snapshots: [snap("a", 10)],
    };
    const { store, list, session } = setup({
      list: previousList,
      view: { mode: "live" },
      listing: false,
      restoring: false,
    });

    const request = deferred<ListResult>();
    list.mockReturnValue(request.promise);

    const pending = session.refresh();
    expect(store.state.listing).toBe(true);

    const failure = expect(pending).rejects.toThrow("offline");
    request.reject(new Error("offline"));
    await failure;

    // The store keeps its previous list; the fetch is no longer in flight.
    expect(store.state.list).toBe(previousList);
    expect(store.state.listing).toBe(false);

    // A later refresh retries and succeeds.
    list.mockResolvedValue({
      current: snap("current", 40),
      snapshots: [snap("b", 20)],
    });
    const retried = await session.refresh();
    expect(list).toHaveBeenCalledTimes(2);
    expect(retried.snapshots.map((s) => s.id)).toEqual(["b"]);
    expect(store.state.list).toEqual(retried);
    expect(store.state.listing).toBe(false);
  });
});
