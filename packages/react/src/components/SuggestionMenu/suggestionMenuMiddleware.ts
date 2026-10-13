import { Middleware, offset, Placement, shift, size } from "@floating-ui/react";

/** The gap (px) between the menu and its trigger character. */
const OFFSET = 10;

/** The space (px) kept between the menu and the edge of the screen. */
const PADDING = 10;

/**
 * The most height (px) the menu takes, even with more room: a longer list
 * scrolls, or the user filters it.
 */
const MAX_HEIGHT = 600;

/**
 * The least room (px) the menu needs below its trigger. With less room, the
 * menu goes above instead, if there is more room there.
 */
const MIN_HEIGHT = 200;

/**
 * Places the menu below its trigger, unless there is less than `MIN_HEIGHT`
 * of room there and more room above. Replaces Floating UI's `autoPlacement`.
 *
 * The decision uses a fixed height, not the menu's own (as `autoPlacement`
 * does): `size` caps the menu
 * to the room on its side (so a capped menu always fits where it is), and
 * the items load asynchronously (so a menu that just opened can still be
 * nearly empty). Thus the decision depends only on the trigger and the
 * visible area: while the user filters the items, the menu keeps its side.
 * When the trigger moves (e.g. the page scrolls) or the window is resized,
 * Floating UI runs the middleware again and the side can change.
 */
const placeBelowUnlessCramped: Middleware = {
  name: "placeBelowUnlessCramped",
  async fn(state) {
    const { rects, placement, platform } = state;
    // A menu of `MIN_HEIGHT`, at the position of each side.
    const floating = { ...rects.floating, height: MIN_HEIGHT };
    const below = await platform.detectOverflow(
      {
        ...state,
        rects: { ...rects, floating },
        y: rects.reference.y + rects.reference.height + OFFSET,
      },
      { padding: PADDING },
    );

    let wanted: Placement = "bottom-start";
    if (below.bottom > 0) {
      // The menu does not fit below: it goes above if there is more room
      // there.
      const above = await platform.detectOverflow(
        {
          ...state,
          rects: { ...rects, floating },
          y: rects.reference.y - OFFSET - MIN_HEIGHT,
        },
        { padding: PADDING },
      );
      if (above.top < below.bottom) {
        wanted = "top-start";
      }
    }

    // The menu is already on that side: nothing to change.
    if (wanted === placement) {
      return {};
    }
    // Floating UI runs the middleware again with the menu on that side.
    return { reset: { placement: wanted } };
  },
};

/**
 * The Floating UI middleware of the suggestion menus: below the trigger
 * unless that is too cramped, within the screen, and no taller than the room
 * on its side or `MAX_HEIGHT` (the menu scrolls).
 */
export const suggestionMenuMiddleware: Middleware[] = [
  placeBelowUnlessCramped,
  offset(OFFSET),
  shift(),
  size({
    apply({ elements, availableHeight }) {
      elements.floating.style.maxHeight = `${Math.max(0, Math.min(availableHeight, MAX_HEIGHT))}px`;
    },
    padding: PADDING,
  }),
];
