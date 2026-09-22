import { useMemo } from "react";

// https://github.com/gregberge/react-merge-refs/blob/main/src/index.tsx
export function mergeRefs<T = any>(
  refs: Array<
    React.MutableRefObject<T> | React.LegacyRef<T> | undefined | null
  >,
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

/**
 * {@link mergeRefs}, memoized on the refs themselves.
 *
 * `mergeRefs` returns a new callback on every call, and React detaches and
 * reattaches a ref whose identity changed - calling it with `null` and then
 * the element again on every render. Callers that keep their own ref
 * alongside a forwarded one want the stable version, so this is the one to
 * reach for from a component.
 *
 * Mirrors `react-merge-refs`' own `useMergeRefs`: the refs array is spread
 * into the dependency list, which assumes a caller passes the same number of
 * refs on every render - true of every use here, and of the upstream hook.
 */
export function useMergeRefs<T = any>(
  refs: Array<
    React.MutableRefObject<T> | React.LegacyRef<T> | undefined | null
  >,
): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  return useMemo(() => mergeRefs(refs), refs);
}
