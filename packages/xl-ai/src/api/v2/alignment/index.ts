/**
 * The identity of blocks: the alignment of two flat block lists (stage 2),
 * and the links of the view to the parts of the source blocks (stage 1).
 *
 * The API of this folder for the other folders: they import only this
 * file. The other files export more only for their unit tests.
 */
export {
  alignBlocks,
  alignmentKey,
  type BlockPair,
  linkBlocks,
} from "./alignBlocks.js";
