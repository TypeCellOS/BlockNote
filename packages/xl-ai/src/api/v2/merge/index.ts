/**
 * The three-way merges: the fields of a block (stage 3) and the documents
 * (stage 4).
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { mergeBlock } from "./block.js";
export { mergeDocument, type MergeWarning } from "./document.js";
