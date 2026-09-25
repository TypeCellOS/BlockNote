import type {
  AttributionChange,
  AttributionProvenance,
} from "@blocknote/core/y";
import { FormatChangeLabel } from "./formatChangeLabel.js";

/**
 * Props for the suggestion-marks attribution tooltip component. Mirrors the
 * `AttributionTooltipState` emitted by the core `AttributionExtension`
 * (minus the anchor element, which the controller uses for positioning).
 *
 * This is the raw change context: the component composes its own display text
 * from it, so a custom tooltip can categorize or phrase changes differently
 * rather than parsing a pre-built string.
 */
export type AttributionTooltipProps = AttributionChange & {
  /** Per-user author color; ignored by the default component when `className` is set. */
  color: string;
  /** App-supplied class from `getAttributionMarkClassName`, when configured. */
  className?: string;
  /** Whether the mark wraps inline content or a whole block. */
  contentType: "inline-content" | "block";
  /** Resolved usernames (falls back to raw ids). */
  users: string[];
  /** Whether labels identify authors or a version. Defaults to `"author"`. */
  provenance?: AttributionProvenance;
  /**
   * Turns a modification mark's changed formats into its label (e.g.
   * `"Bold, Italic"`). Defaults to {@link defaultFormatChangeLabel} when the
   * controller isn't given one.
   */
  formatChangeLabel?: FormatChangeLabel;
};
