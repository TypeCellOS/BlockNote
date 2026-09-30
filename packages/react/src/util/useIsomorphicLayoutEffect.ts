import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` under SSR — where
 * `useLayoutEffect` cannot run and React warns.
 *
 * Used for latest-ref updates: the ref must be current before any layout
 * effect can trigger an editor event, or a subscription could still invoke
 * the previous render's callback.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
