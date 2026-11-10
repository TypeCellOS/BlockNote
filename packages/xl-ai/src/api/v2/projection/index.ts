/**
 * Stage 1 (Project): the view of a document and its links to the source
 * blocks, and the check that the format shows the blocks of a parse.
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { assertBlocksRoundTrip } from "./assertBlocksRoundTrip.js";
export { documentText } from "./cache.js";
export type { Projection } from "./projectDocument.js";
export { shadowsOf } from "./shadows.js";
