/**
 * The operations, and the stages 6 to 8: Diff, Apply and Dispatch.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { applyOperations } from "./applyOperations.js";
export { makeIdsDistinct } from "./blockIds.js";
export { diffDocuments } from "./diffDocuments.js";
export { dispatchUpdate } from "./dispatch.js";
export { type BlockOperation, type BlockPosition } from "./types.js";
