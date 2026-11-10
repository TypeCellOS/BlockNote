/**
 * The matches of two sequences: the Myers match, the anchored match (the
 * patience method), the gaps between matched pairs, and the match of two
 * texts. This folder does not know blocks.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { anchoredMatch, uniquePairs } from "./anchored.js";
export { gaps, isChanged } from "./gaps.js";
export { myersMatch } from "./myers.js";
export { alignText, charKind, type TextUnit } from "./text.js";
export { type MatchedPair } from "./types.js";
