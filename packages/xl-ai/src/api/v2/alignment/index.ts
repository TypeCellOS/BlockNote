/**
 * The identity of blocks: the alignment of two flat block lists (stage 2),
 * and the key of a block for that alignment (also used in stage 1).
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export { alignBlocks, alignmentKey, type BlockPair } from "./alignBlocks.js";
