import type { Block } from "../../blocks/defaultBlocks.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";

/**
 * An opaque match handle for a searched document snapshot, without editor-internal
 * positions. Retained handles describe that snapshot, not subsequent edits.
 */
export type SearchAndReplaceMatch = {
  /**
   * Lazily convert the containing block from the searched snapshot, including
   * its props, content and children. Supports custom block schemas; no block
   * conversion occurs until this function is called. Treat the result as immutable.
   */
  readonly getBlock: () => Block<BlockSchema, InlineContentSchema, StyleSchema>;
};

/** Literal-search query understood by {@link defaultMatcher}. */
export type SearchAndReplaceQuery = {
  /** Literal text to find, not a regular expression. Empty text matches nothing. */
  readonly searchTerm: string;
  /** Whether matching distinguishes case. Defaults to false. */
  readonly caseSensitive?: boolean;
};

/**
 * A half-open range in the matcher's supplied text, measured in UTF-16 code units
 * (JavaScript string offsets), not document positions or Unicode code points.
 */
export type SearchAndReplaceRange = {
  /** Inclusive start offset. Must be an integer satisfying 0 <= start < end. */
  readonly start: number;
  /** Exclusive end offset. Must be an integer no greater than text.length. */
  readonly end: number;
};

/**
 * Find matches in one contiguous text run. Formatting marks do not split runs;
 * blocks, table cells, hard breaks and inline atoms do. Atom labels are not searched.
 *
 * Return sorted, non-overlapping, nonempty ranges, or [] for no matches. Invalid
 * ranges violate the programmer contract and throw; they are not query errors.
 *
 * Matchers must be pure: search inputs belong in query or the containing block.
 * Queries are immutable values; pass a new value to setQuery when changing one.
 */
export type SearchAndReplaceMatcher<Query> = (context: {
  /** The complete query supplied to setQuery, with the matcher's custom shape. */
  query: Query;
  /** Original text to search; returned offsets must refer to this exact string. */
  text: string;
  /**
   * Lazily read the containing block from the searched snapshot, including when
   * searching pending edits inside an outer transaction. Never reads the live
   * editor's block instead. Call only if matching depends on block context.
   */
  getBlock: SearchAndReplaceMatch["getBlock"];
}) => readonly SearchAndReplaceRange[];

/** Published search state supplied to the optional match-change callback. */
export type SearchAndReplaceMatchChange = {
  /** Active match in the published snapshot, or null when there are no matches. */
  readonly currentMatch: SearchAndReplaceMatch | null;
  /** Number of matches in the published snapshot. */
  readonly totalMatches: number;
  /**
   * "query": setQuery or clearSearch; "navigation": nextMatch or previousMatch;
   * "document": a mounted refresh of the installed document, including edits and undo/redo.
   * Pending or rejected document edits are never published by this callback.
   */
  readonly reason: "query" | "navigation" | "document";
  /**
   * Scroll to and briefly pulse the active match without focusing the editor.
   * Only reveals a changed active match, not mounting or unrelated document edits.
   * Reveals at most once, only after decorations render; does nothing once this
   * state is superseded. Calls inside an outer transaction may not reveal yet.
   * This only controls transient feedback, not persistent match decorations.
   */
  readonly highlightMatch: () => void;
};

/** Custom matching and optional transient feedback for the search extension. */
export type SearchAndReplaceOptions<Query> = {
  /** Determines the query shape accepted by setQuery and exposed in the store. */
  matcher: SearchAndReplaceMatcher<Query>;
  /**
   * React to published query, navigation or document changes. Defaults to
   * `({ highlightMatch }) => highlightMatch()`. Omit calling highlightMatch to
   * suppress scrolling and pulsing; persistent match decorations remain visible.
   */
  onMatchChange?: (context: SearchAndReplaceMatchChange) => void;
};

/** Reactive, read-only search state, independent of document undo history. */
export type SearchAndReplaceState<Query = SearchAndReplaceQuery> = {
  /** Complete current query; null initially and after clearSearch. */
  readonly query: Query | null;
  /** Opaque matches in document order for the installed document snapshot. */
  readonly matches: readonly SearchAndReplaceMatch[];
  /** Zero-based active match index, or null when there are no matches. */
  readonly currentIndex: number | null;
};
