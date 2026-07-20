import {
  AttributionExtension,
  getReferenceClientRects,
  getReferenceRect,
} from "@blocknote/core/y";
import { flip, offset, shift, inline } from "@floating-ui/react";
import { FC, useMemo } from "react";

import { useExtensionState } from "../../hooks/useExtension.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import {
  GenericPopover,
  GenericPopoverReference,
} from "../Popovers/GenericPopover.js";
import { AttributionTooltip } from "./AttributionTooltip.js";
import { AttributionTooltipProps } from "./AttributionTooltipProps.js";
import { FormatChangeLabel } from "./formatChangeLabel.js";

/**
 * Renders the attribution tooltip for suggestion marks. The core
 * `AttributionExtension` owns the mark logic (which mark is hovered, nested-mark
 * resolution, username resolution, optional styling class) and emits the raw
 * change context; this controller subscribes to its store and positions the
 * tooltip with floating-ui. Composing the change context into localized text is
 * left to the tooltip component itself.
 */
export const AttributionTooltipController = (props: {
  attributionTooltip?: FC<AttributionTooltipProps>;
  /**
   * Turns a modification mark's changed formats into its tooltip label (e.g.
   * `"Bold, Italic"`). Forwarded to the tooltip component, which falls back to
   * localizing each format via the formatting toolbar strings.
   */
  formatChangeLabel?: FormatChangeLabel;
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
            // Required by the `inline()` middleware — a virtual reference has no
            // default `getClientRects`, and `inline()` reads per-line rects.
            getClientRects: () => getReferenceClientRects(state.anchor),
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
        middleware: [inline(), offset(4), flip(), shift({ padding: 4 })],
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

  // The raw change context is handed to the component as-is; composing it into
  // display text (and localizing it) is the component's job.
  const tooltipProps = useMemo<AttributionTooltipProps | undefined>(
    () =>
      state
        ? {
            color: state.color,
            className: state.className,
            modificationType: state.modificationType,
            contentType: state.contentType,
            users: state.users,
            format: state.format,
            formatChangeLabel: props.formatChangeLabel,
          }
        : undefined,
    [state, props.formatChangeLabel],
  );

  return (
    <GenericPopover
      reference={reference}
      portalElement={props.portalElement}
      {...floatingUIOptions}
    >
      {tooltipProps && <Component {...tooltipProps} />}
    </GenericPopover>
  );
};
