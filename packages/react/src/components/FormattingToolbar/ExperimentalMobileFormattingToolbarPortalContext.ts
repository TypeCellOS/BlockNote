import { createContext } from "react";

/**
 * Holds the mobile formatting toolbar controller's root element — the
 * non-scrolling wrapper that sits *outside* the toolbar's horizontally
 * scrolling container.
 *
 * Formatting toolbar buttons read this and portal their menus/popovers into it,
 * so the dropdowns escape the toolbar's `overflow-x: auto` clip (which mobile
 * WebKit/Blink apply to DOM descendants regardless of their containing block)
 * while staying inside BlockNote's themed DOM subtree.
 *
 * `null` when not inside the mobile toolbar (e.g. the desktop toolbar), in which
 * case buttons render their dropdowns inline as usual.
 */
export const ExperimentalMobileFormattingToolbarPortalContext =
  createContext<HTMLElement | null>(null);
