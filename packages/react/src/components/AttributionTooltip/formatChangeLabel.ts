import { Dictionary } from "@blocknote/core";

/**
 * The change context a {@link FormatChangeLabel} receives: the changed format
 * keys (e.g. `["bold", "italic"]`) from a `y-attributed-format` modification
 * mark, plus the active dictionary for localization. This mirrors the info the
 * core `AttributionExtension` hands to `getAttributionMarkClassName` — raw
 * change context the app categorizes — but for the tooltip's *text* rather than
 * its styling.
 */
export type FormatChangeInfo = {
  /** The changed format keys, e.g. `["bold", "italic"]`. May be empty. */
  format: string[];
  /** The active editor dictionary, for localizing the label. */
  dictionary: Dictionary;
};

/**
 * Turns a modification mark's changed formats into the label shown in the
 * attribution tooltip (e.g. `"Bold, Italic"`). Pass a custom implementation to
 * `AttributionTooltipController` to categorize changes differently — e.g. group
 * text-color changes under a single `"Color"` label, or localize beyond the
 * built-in toolbar strings.
 */
export type FormatChangeLabel = (info: FormatChangeInfo) => string;

/**
 * The default {@link FormatChangeLabel}: localizes each changed format key via
 * its `formatting_toolbar` tooltip (e.g. `bold` → `"Bold"`) and joins them with
 * `", "`. Falls back to the generic `"Formatting Change"` string when there are
 * no keys or any key is missing a toolbar translation.
 */
export const defaultFormatChangeLabel: FormatChangeLabel = ({
  format,
  dictionary,
}) => {
  const fallback = dictionary.suggestion_changes.formatting_change;
  if (format.length === 0) {
    return fallback;
  }
  const toolbar = dictionary.formatting_toolbar as Record<string, unknown>;
  const names: string[] = [];
  for (const key of format) {
    const entry = toolbar[key];
    const tooltip =
      entry && typeof entry === "object" && "tooltip" in entry
        ? (entry as { tooltip: unknown }).tooltip
        : undefined;
    if (typeof tooltip !== "string") {
      return fallback;
    }
    names.push(tooltip);
  }
  return names.join(", ");
};
