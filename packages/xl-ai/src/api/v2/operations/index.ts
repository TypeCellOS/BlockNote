/**
 * The operations, and the stages 6 to 8: Diff, Apply and Dispatch.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { applyOperations } from "./applyOperations.js";
export { applyToBlocks } from "./applyToBlocks.js";
export { diffDocuments } from "./diffDocuments.js";
export { dispatchUpdate, stepGroupEnds } from "./dispatch.js";
export { newIdsForLayoutChanges } from "./layoutChanges.js";
export type {
  BlockOperation,
  BlockPosition,
  StructureOperation,
} from "./types.js";
