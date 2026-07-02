import { AttributionExtension, getReferenceRect } from "@blocknote/core/y";
import { flip, offset, shift } from "@floating-ui/react";
import { FC, useMemo } from "react";

import { useExtensionState } from "../../hooks/useExtension.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import {
  GenericPopover,
  GenericPopoverReference,
} from "../Popovers/GenericPopover.js";
import { AttributionTooltip } from "./AttributionTooltip.js";
import { AttributionTooltipProps } from "./AttributionTooltipProps.js";

/**
 * Renders the attribution tooltip for suggestion marks. All the logic (which
 * mark is hovered, nested-mark resolution, username resolution, optional
 * styling class) lives in the core `AttributionExtension`; this controller
 * just subscribes to its store and positions the tooltip with floating-ui.
 */
export const AttributionTooltipController = (props: {
  attributionTooltip?: FC<AttributionTooltipProps>;
  floatingUIOptions?: FloatingUIOptions;
  /**
   * Override the DOM node this floating element portals into. Falls back to
   * `editor.portalElement` when omitted.
   */
  portalElement?: HTMLElement | null;
}) => {
  const state = useExtensionState(AttributionExtension, {
    selector: (state) => state,
  });

  // Position off the hovered mark. Block-level marks are `display: contents`, so
  // a live `getBoundingClientRect` (via `getReferenceRect`) is provided rather
  // than relying on the wrapper's own (zero-sized) box.
  const reference = useMemo<GenericPopoverReference | undefined>(
    () =>
      state
        ? {
            element: state.anchor,
            getBoundingClientRect: () => getReferenceRect(state.anchor),
          }
        : undefined,
    [state],
  );

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      ...props.floatingUIOptions,
      useFloatingOptions: {
        open: !!state,
        placement: "top-start",
        middleware: [offset(4), flip(), shift({ padding: 4 })],
        ...props.floatingUIOptions?.useFloatingOptions,
      },
      // Non-interactive tooltip: no focus trapping and no pointer capture (so it
      // never interferes with the hover that drives it).
      focusManagerProps: {
        disabled: true,
        ...props.floatingUIOptions?.focusManagerProps,
      },
      elementProps: {
        style: {
          zIndex: 10000,
          pointerEvents: "none",
        },
        ...props.floatingUIOptions?.elementProps,
      },
    }),
    [props.floatingUIOptions, state],
  );

  const Component = props.attributionTooltip || AttributionTooltip;

  return (
    <GenericPopover
      reference={reference}
      portalElement={props.portalElement}
      {...floatingUIOptions}
    >
      {state && (
        <Component
          text={state.text}
          color={state.color}
          className={state.className}
          modificationType={state.modificationType}
          contentType={state.contentType}
          users={state.users}
          formatLabel={state.formatLabel}
        />
      )}
    </GenericPopover>
  );
};
