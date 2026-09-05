import { RefObject, useEffect, useRef } from "react";

/**
 * BlockNote's autofocus for form inputs: focuses the element when
 * `autoFocus` is true, without scrolling.
 *
 * Why not the native `autofocus` attribute (or React's `autoFocus` prop,
 * which is a bare `.focus()` at commit): these inputs live in popovers that
 * floating-ui positions *after* mount, so the browser's scroll-into-view
 * would run while the popover is still at its pre-positioned spot and yank
 * the page (on mobile, right out from under the block being edited).
 *
 * The shape matches the official popover-autofocus implementations
 * (Mantine: setTimeout + preventScroll; floating-ui: microtask + rAF +
 * preventScroll), minus their deferral layers: there is nothing here to
 * wait for, and added hops erode the user-gesture window in which iOS
 * Safari lets a programmatic focus open the keyboard (validated on real
 * iOS). `preventScroll` also makes the timing not load-bearing: no
 * ordering relative to floating-ui's positioning can scroll the page.
 *
 * A skin sets `data-autofocus` on the same element only when its UI
 * library both reads the attribute AND focuses safely: Mantine's trap
 * does (`focus({ preventScroll: true })`). Ariakit reads it but
 * bare-focuses, so that skin disables its `autoFocusOnShow` instead (see
 * its Popover); Base UI has no attribute convention.
 *
 * Returns the ref to attach; merge it with a forwarded ref via
 * `useMergeRefs`.
 */
export function useAutoFocus<T extends HTMLElement>(
  autoFocus: boolean | undefined,
): RefObject<T | null> {
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    if (autoFocus) {
      elementRef.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  return elementRef;
}
