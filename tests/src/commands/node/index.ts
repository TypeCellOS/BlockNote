// Baseline helpers run directly in Node and in browser tests.
export { compareDocuments } from "./compareDocuments.js";
export type { DocumentBlock } from "./compareDocuments.js";
export { selectText } from "./selectText.js";
export {
  addIdsToBlocks,
  partialBlockToBlockForTesting,
  partialBlocksToBlocksForTesting,
} from "./formatConversion.js";
export { isPdf } from "./isPdf.js";
export { testODTDocumentAgainstSnapshot } from "./testODTDocumentAgainstSnapshot.js";
export { testResolveFileUrl } from "./testResolveFileUrl.js";
