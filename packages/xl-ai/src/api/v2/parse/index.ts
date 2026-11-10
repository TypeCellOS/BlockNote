/**
 * Stage 2 (Parse): the blocks of a text or of the JSON of a client.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { parseJSON, replaceDisallowedIds } from "./parseJSON.js";
export { parseText, withoutByteOrderMark } from "./parseText.js";
