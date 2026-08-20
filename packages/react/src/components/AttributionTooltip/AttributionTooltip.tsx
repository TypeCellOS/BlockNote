import { useMemo } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { AttributionTooltipProps } from "./AttributionTooltipProps.js";
import { defaultFormatChangeLabel } from "./formatChangeLabel.js";

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
  const dictionary = useDictionary();

  // Compose the fully-localized text from the raw change context — e.g.
  // `"Inserted by: Alice"`, `"Deleted by: Alice"`, or
  // `"Formatting change (Bold, Italic) by: Alice"`. The outer sentence comes
  // from the `suggestion_changes` dictionary (translated per locale) and the
  // inner format list from the configurable `formatChangeLabel`.
  const text = useMemo(() => {
    const changes = dictionary.suggestion_changes;
    const formatChangeLabel =
      props.formatChangeLabel ?? defaultFormatChangeLabel;
    const users = props.users.join(", ");

    if (props.modificationType === "insert") {
      return changes.inserted_by(users);
    }
    if (props.modificationType === "delete") {
      return changes.deleted_by(users);
    }

    const formatLabel = props.format
      ? formatChangeLabel({ format: props.format, dictionary })
      : "";
    return changes.formatting_change_by(formatLabel, users);
  }, [
    dictionary,
    props.formatChangeLabel,
    props.users,
    props.modificationType,
    props.format,
  ]);

  return (
    <Components.AttributionTooltip.Root
      className={"bn-suggestion-tooltip"}
      markClassName={props.className}
      backgroundColor={props.className ? undefined : props.color}
    >
      {text}
    </Components.AttributionTooltip.Root>
  );
};
