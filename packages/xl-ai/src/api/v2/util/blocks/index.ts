/**
 * Functions on blocks of the model (`model.ts`): flat lists, IDs, JSON
 * equality, text, the index of a document, the update between two blocks,
 * the schema rules, and the grid of a table. All stages use them.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { flattenBlocks, withoutChildren } from "./flatten.js";
export { assertBlockIds, duplicateId } from "./ids.js";
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
export { BlockIndex, type Parent, TOP_LEVEL } from "./blockIndex.js";
export { diffBlock } from "./update.js";
