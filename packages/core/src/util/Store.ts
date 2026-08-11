// Vendored from https://github.com/TanStack/store/blob/main/packages/store/src/store.ts (MIT)
//
// BlockNote only ever used `Store` — never the `Derived`/`Effect` reactive graph that
// makes up the rest of `@tanstack/store`, and that graph isn't tree-shakeable because
// `setState` reaches into the scheduler. Since the `Store` type is part of BlockNote's
// public API (every extension exposes one), owning these ~40 lines lets us keep that
// surface stable instead of tracking a 0.x dependency's breaking changes.
//
// Behaviour matches `@tanstack/store@0.7.7`, minus the dependency graph and the
// `updateFn`/`onSubscribe` options, which nothing used. `onUpdate` additionally receives
// the new and previous state rather than requiring callers to close over the store.

/**
 * The value a {@link Listener} is called with when a {@link Store} updates.
 */
export interface ListenerValue<T> {
  readonly prevVal: T;
  readonly currentVal: T;
}

/**
 * A callback invoked when a {@link Store}'s state changes.
 */
export type Listener<T> = (value: ListenerValue<T>) => void;

/**
 * A new state, or a function deriving it from the previous state.
 */
export type Updater<T> = T | ((prev: T) => T);

export interface StoreOptions<TState> {
  /**
   * Called after the state has been updated, before listeners are notified.
   */
  onUpdate?: (state: TState, prevState: TState) => void;
}

/**
 * A minimal observable state container.
 *
 * Extensions expose one of these as their `store` so that both React (via
 * `useExtensionState`) and vanilla consumers can read and subscribe to their state.
 */
export class Store<TState> {
  listeners = new Set<Listener<TState>>();
  state: TState;
  prevState: TState;
  options?: StoreOptions<TState>;

  constructor(initialState: TState, options?: StoreOptions<TState>) {
    this.prevState = initialState;
    this.state = initialState;
    this.options = options;
  }

  subscribe = (listener: Listener<TState>) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Update the store state, either with a new state or a function deriving it from the
   * previous one.
   */
  setState(updater: (prevState: TState) => TState): void;
  setState(updater: TState): void;
  setState(updater: Updater<TState>): void {
    this.prevState = this.state;
    this.state = isUpdaterFunction(updater) ? updater(this.prevState) : updater;

    flush(this);
  }

  /**
   * @internal Only to be called by {@link flush}.
   */
  _notify() {
    const value: ListenerValue<TState> = {
      prevVal: this.prevState,
      currentVal: this.state,
    };
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}

function isUpdaterFunction<T>(updater: Updater<T>): updater is (prev: T) => T {
  return typeof updater === "function";
}

// Both `onUpdate` and listener notification can synchronously trigger further `setState`
// calls — a callback that dispatches a ProseMirror transaction, for example. Rather than
// recursing, re-entrant writes are queued and drained by the outermost flush, so a write
// made during a callback still reaches every listener but the stack stays flat and
// subscribers see the settled state once.
//
// `onUpdate` therefore runs *inside* the flush transaction: the store is queued and the
// flush is marked in progress before the callback fires, so a nested write it makes is
// coalesced into this drain rather than starting its own.
let isFlushing = false;
const pendingUpdates = new Set<Store<any>>();

function flush(store: Store<any>) {
  pendingUpdates.add(store);

  const isOutermost = !isFlushing;
  isFlushing = true;

  try {
    store.options?.onUpdate?.(store.state, store.prevState);

    if (!isOutermost) {
      return;
    }

    while (pendingUpdates.size > 0) {
      const stores = Array.from(pendingUpdates);
      pendingUpdates.clear();
      for (const pendingStore of stores) {
        pendingStore._notify();
      }
    }
  } finally {
    if (isOutermost) {
      isFlushing = false;
      // A throwing callback would otherwise strand queued stores, letting them notify
      // during an unrelated store's next flush.
      pendingUpdates.clear();
    }
  }
}
