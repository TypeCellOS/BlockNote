import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { AttributionTooltipProps } from "./AttributionTooltipProps.js";

/**
 * The default attribution tooltip shown when hovering a suggestion mark. Renders
 * the author label (and, for modification marks, the localized formatting-change
 * label) via the themeable `AttributionTooltip` component slot.
 *
 * When `className` is set (from a `getAttributionMarkClassName` callback), it's
 * forwarded so the app's CSS controls the color and the per-user `color` is
 * dropped; otherwise the author color is applied inline.
 */
export const AttributionTooltip = (props: AttributionTooltipProps) => {
  const Components = useComponentsContext()!;

  return (
    <Components.AttributionTooltip.Root
      className={"bn-suggestion-tooltip"}
      markClassName={props.className}
      backgroundColor={props.className ? undefined : props.color}
    >
      {props.text}
    </Components.AttributionTooltip.Root>
  );
};
