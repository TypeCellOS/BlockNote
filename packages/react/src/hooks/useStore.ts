// Vendored from https://github.com/TanStack/store/blob/main/packages/react-store/src/index.ts (MIT)
//
// See `packages/core/src/util/Store.ts` for why the store itself is vendored. This is the
// matching React binding, kept behaviourally identical to `@tanstack/react-store@0.7.7` —
// in particular the `shallow` default comparator, which `useCommentUsers` and
// `useVersionUsers` rely on to avoid re-rendering when an unrelated user resolves.

import type { Store } from "@blocknote/core";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";

/**
 * Subscribe to a {@link Store}, optionally selecting a slice of its state.
 *
 * The component re-renders only when the selected value changes under a
 * {@link shallow} comparison, so selectors are free to build a fresh object,
 * `Map` or `Set` on each call.
 */
export function useStore<TState, TSelected = NoInfer<TState>>(
  store: Store<TState>,
  selector: (state: TState) => TSelected = (d) => d as unknown as TSelected,
): TSelected {
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    () => store.state,
    () => store.state,
    selector,
    shallow,
  );
}

/**
 * Compares two values one level deep, with special handling for `Map`, `Set` and `Date`.
 */
export function shallow<T>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  if (objA instanceof Map && objB instanceof Map) {
    if (objA.size !== objB.size) {
      return false;
    }
    for (const [k, v] of objA) {
      if (!objB.has(k) || !Object.is(v, objB.get(k))) {
        return false;
      }
    }
    return true;
  }

  if (objA instanceof Set && objB instanceof Set) {
    if (objA.size !== objB.size) {
      return false;
    }
    for (const v of objA) {
      if (!objB.has(v)) {
        return false;
      }
    }
    return true;
  }

  if (objA instanceof Date && objB instanceof Date) {
    return objA.getTime() === objB.getTime();
  }

  const keysA = getOwnKeys(objA);
  if (keysA.length !== getOwnKeys(objB).length) {
    return false;
  }

  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(objB, key) &&
      Object.is(objA[key as keyof T], objB[key as keyof T]),
  );
}

function getOwnKeys<T extends object>(obj: T): Array<string | symbol> {
  return (Object.keys(obj) as Array<string | symbol>).concat(
    Object.getOwnPropertySymbols(obj),
  );
}
