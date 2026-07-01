import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { SuggestionMarksTooltipProps } from "./SuggestionMarksTooltipProps.js";

/**
 * The default attribution tooltip shown when hovering a suggestion mark. Renders
 * the author label (and, for modification marks, the localized formatting-change
 * label) via the themeable `SuggestionMarksTooltip` component slot.
 *
 * When `className` is set (from a `getSuggestionMarkClassName` callback), it's
 * forwarded so the app's CSS controls the color and the per-user `color` is
 * dropped; otherwise the author color is applied inline.
 */
export const SuggestionMarksTooltip = (props: SuggestionMarksTooltipProps) => {
  const Components = useComponentsContext()!;

  return (
    <Components.SuggestionMarksTooltip.Root
      className={"bn-suggestion-tooltip"}
      markClassName={props.className}
      backgroundColor={props.className ? undefined : props.color}
    >
      {props.text}
    </Components.SuggestionMarksTooltip.Root>
  );
};
