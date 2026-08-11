import { describe, expect, it, vi } from "vite-plus/test";
import { Store } from "./Store.js";

describe("Store", () => {
  it("updates state from a value", () => {
    const store = new Store({ count: 0 });

    store.setState({ count: 1 });

    expect(store.state).toEqual({ count: 1 });
  });

  it("updates state from an updater function", () => {
    const store = new Store({ count: 0 });

    store.setState((prev) => ({ count: prev.count + 1 }));

    expect(store.state).toEqual({ count: 1 });
  });

  it("exposes the previous state after an update", () => {
    const store = new Store({ count: 0 });

    store.setState({ count: 1 });
    expect(store.prevState).toEqual({ count: 0 });

    store.setState({ count: 2 });
    expect(store.prevState).toEqual({ count: 1 });
  });

  it("notifies listeners with the previous and current state", () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      prevVal: { count: 0 },
      currentVal: { count: 1 },
    });
  });

  it("stops notifying after unsubscribing", () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setState({ count: 1 });
    unsubscribe();
    store.setState({ count: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.state).toEqual({ count: 2 });
  });

  it("calls `onUpdate` after the write but before listeners", () => {
    const calls: string[] = [];
    const store: Store<{ count: number }> = new Store(
      { count: 0 },
      {
        onUpdate() {
          // The new state is already committed by the time `onUpdate` runs, which is
          // what the comments & ShowSelection extensions rely on to dispatch a
          // transaction reflecting it.
          calls.push(`onUpdate:${store.state.count}`);
        },
      },
    );
    store.subscribe(() => calls.push("listener"));

    store.setState({ count: 1 });

    expect(calls).toEqual(["onUpdate:1", "listener"]);
  });

  it("passes the new and previous state to `onUpdate`", () => {
    const onUpdate = vi.fn();
    const store = new Store({ count: 0 }, { onUpdate });

    store.setState({ count: 1 });

    expect(onUpdate).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  it("notifies once with the settled state when `onUpdate` writes back", () => {
    const seen: Array<{ prev: number; curr: number }> = [];
    let nested = false;
    const store: Store<{ count: number }> = new Store(
      { count: 0 },
      {
        onUpdate(state) {
          // A callback that writes back to its own store — e.g. one dispatching a
          // transaction that settles the state. The nested write must be coalesced
          // into the in-progress flush rather than draining on its own.
          if (!nested && state.count === 1) {
            nested = true;
            store.setState({ count: 2 });
          }
        },
      },
    );
    store.subscribe(({ prevVal, currentVal }) =>
      seen.push({ prev: prevVal.count, curr: currentVal.count }),
    );

    store.setState({ count: 1 });

    expect(seen).toEqual([{ prev: 1, curr: 2 }]);
    expect(store.state).toEqual({ count: 2 });
  });

  it("flattens re-entrant updates instead of recursing", () => {
    const store = new Store({ count: 0 });
    const seen: number[] = [];

    store.subscribe(({ currentVal }) => {
      seen.push(currentVal.count);
      // A listener writing back to the store — e.g. one that dispatches a transaction
      // which in turn updates state. This must terminate rather than recurse.
      if (currentVal.count < 3) {
        store.setState({ count: currentVal.count + 1 });
      }
    });

    store.setState({ count: 1 });

    expect(seen).toEqual([1, 2, 3]);
    expect(store.state).toEqual({ count: 3 });
  });
});
