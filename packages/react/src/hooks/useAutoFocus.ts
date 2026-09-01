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
 * The shape follows the official implementations for this situation, which
 * all defer and/or prevent scrolling: Mantine's focus-on-open is
 * `setTimeout(() => el.focus({ preventScroll: true }))`; floating-ui's
 * FloatingFocusManager is layout effect → microtask → rAF →
 * `focus({ preventScroll })`. Ours is a plain effect with unconditional
 * `preventScroll` — stronger scroll-safety than floating-ui (which lets a
 * chosen initial element scroll), and deliberately *without* their extra
 * deferral layers: we have no tabIndex setters to wait for, and every added
 * hop erodes the user-gesture window inside which iOS Safari allows a
 * programmatic focus to open the on-screen keyboard (the real-device suite
 * validated the keyboard appears with this timing). `preventScroll` also
 * makes the timing not load-bearing for layout: no ordering relative to
 * floating-ui's positioning can scroll the page.
 *
 * Skins whose UI library reads `data-autofocus` should also set it (value
 * "true") on the same element: Mantine's focus trap and Ariakit's dialog
 * initial-focus both select `[data-autofocus]`, so the attribute makes any
 * trap that activates pick this same element instead of falling back to
 * "first focusable" — the two mechanisms can never fight over where focus
 * lands. Skins on libraries without that convention omit it as dead markup:
 * the shadcn skin's Base UI has no attribute-based initial focus at all —
 * its mechanism is the `initialFocus` prop on popups.
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
