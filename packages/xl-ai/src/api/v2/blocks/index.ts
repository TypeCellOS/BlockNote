/**
 * The block JSON of the lens and the functions on it. All stages use them.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { flattenBlocks, withoutChildren } from "./flatten.js";
export { distinctId, withDistinctIds } from "./ids.js";
export { blockKey, deepEqual, stableStringify } from "./json.js";
export { propsFit } from "./props.js";
export { type LayoutRule, type SchemaRules, schemaRulesOf } from "./schema.js";
export {
  cellRows,
  emptyCell,
  gridOf,
  hasMergedCells,
  withoutMergedCells,
} from "./tableGrid.js";
export { blockToText, inlineContentToText } from "./text.js";
export { BlockTree } from "./tree.js";
export {
  type BlockFields,
  type BlockWithoutChildren,
  type ContentKind,
  type ContentShape,
  contentShape,
  type FlatBlock,
  isLink,
  isStyledText,
  isTableContent,
  type LensBlock,
  type LensBlockContent,
  type LensInlineContent,
  type LensLink,
  type LensPartialBlock,
  type LensStyledText,
  type LensStyles,
  type LensTableCell,
  type LensTableContent,
} from "./types.js";
export { diffBlock } from "./update.js";
