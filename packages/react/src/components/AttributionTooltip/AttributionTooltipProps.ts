/**
 * Props for the suggestion-marks attribution tooltip component. Mirrors the
 * `AttributionTooltipState` emitted by the core `AttributionExtension`
 * (minus the anchor element, which the controller uses for positioning).
 */
export type AttributionTooltipProps = {
  /**
   * Resolved display text (the localized format label, for modification marks,
   * followed by the usernames). Composed by the controller from `users` and the
   * configurable `formatChangeLabel`; a custom tooltip can render this directly
   * or rebuild its own from `users` / `formatLabel`.
   */
  text: string;
  /** Per-user author color; ignored by the default component when `className` is set. */
  color: string;
  /** App-supplied class from `getAttributionMarkClassName`, when configured. */
  className?: string;
  /** The kind of change — `format` is the modification mark. */
  modificationType: "insert" | "delete" | "format";
  /** Whether the mark wraps inline content or a whole block. */
  contentType: "inline-content" | "block";
  /** Resolved usernames (falls back to raw ids). */
  users: string[];
  /**
   * The changed format keys (e.g. `["bold", "italic"]`), present only for
   * `format` marks — the raw change context, for custom categorization.
   */
  format?: string[];
  /**
   * Localized formatting-change label (via `formatChangeLabel`), present only
   * for `format` marks.
   */
  formatLabel?: string;
};
