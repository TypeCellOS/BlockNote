import {
  detectOverflow,
  Middleware,
  offset,
  Placement,
  shift,
  size,
} from "@floating-ui/react";

/** The gap (px) between the menu and its trigger character. */
const OFFSET = 10;

/** The space (px) kept between the menu and the edge of the screen. */
const PADDING = 10;

/**
 * The most height (px) the menu takes, even with more room: a longer list
 * scrolls, or the user filters it.
 */
const MAX_HEIGHT = 400;

/**
 * The least room (px) the menu needs below its trigger. With less room, the
 * menu goes above instead, if there is more room there.
 */
const MIN_HEIGHT = 200;

/**
 * Places the menu below its trigger, unless there is less than `MIN_HEIGHT`
 * of room there and more room above.
 *
 * The side is chosen when the menu opens, and again only when the trigger
 * moves (e.g. the page scrolls). While the user filters the items, the menu
 * keeps its side: it shrinks towards the trigger, or scrolls, but does not
 * jump to the other side.
 *
 * The decision uses a fixed height, not the menu's own: `size` caps the menu
 * to the room on its side (so a capped menu always fits where it is), and
 * the items load asynchronously (so a menu that just opened can still be
 * nearly empty).
 */
function placeBelowUnlessCramped(): Middleware {
  // The trigger position the side was last chosen for, and that side.
  let chosen: { x: number; y: number; placement: Placement } | undefined;

  return {
    name: "placeBelowUnlessCramped",
    async fn(state) {
      const { rects, placement } = state;
      const x = Math.round(rects.reference.x);
      const y = Math.round(rects.reference.y);

      if (chosen?.x !== x || chosen.y !== y) {
        const floating = { ...rects.floating, height: MIN_HEIGHT };

        // The overflow of a menu of `MIN_HEIGHT`, below and above.
        const below = await detectOverflow(
          {
            ...state,
            rects: { ...rects, floating },
            y: rects.reference.y + rects.reference.height + OFFSET,
          },
          { padding: PADDING },
        );
        const above = await detectOverflow(
          {
            ...state,
            rects: { ...rects, floating },
            y: rects.reference.y - OFFSET - MIN_HEIGHT,
          },
          { padding: PADDING },
        );
        chosen = {
          x,
          y,
          placement:
            below.bottom <= 0 || below.bottom <= above.top
              ? "bottom-start"
              : "top-start",
        };
      }

      return chosen.placement === placement
        ? {}
        : { reset: { placement: chosen.placement } };
    },
  };
}

/**
 * Creates the Floating UI middleware of a suggestion menu: below the trigger
 * unless that is too cramped, within the screen, and no taller than the room
 * on its side or `MAX_HEIGHT` (the menu scrolls). Create it once per menu, as it remembers
 * the side the menu is on.
 */
export function createSuggestionMenuMiddleware(): Middleware[] {
  return [
    placeBelowUnlessCramped(),
    offset(OFFSET),
    shift(),
    size({
      apply({ elements, availableHeight }) {
        elements.floating.style.maxHeight = `${Math.max(0, Math.min(availableHeight, MAX_HEIGHT))}px`;
      },
      padding: PADDING,
    }),
  ];
}
