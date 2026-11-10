/**
 * The public API of the text lens (`@blocknote/xl-ai/text-lens`). Other
 * modules export more, for their unit tests. Only the exports of this file
 * (and of `yjs/index.ts`) are public.
 *
 * The API for a Y.Doc is in `yjs/index.ts` (`@blocknote/xl-ai/text-lens/yjs`),
 * a separate entry point. Thus, code without Yjs does not load Yjs.
 */
export {
  type ChangeOperations,
  type ChangeResult,
  type ChangeWarning,
  computeOperations,
  type ConflictError,
  type DocumentChange,
  getDocumentText,
  type JSONChange,
  type TextChange,
  updateDocument,
  type WriteFromVersion,
} from "./api.js";
export { htmlFormat } from "./formats/html.js";
export { markdownFormat } from "./formats/markdown.js";
export { plainTextFormat } from "./formats/plainText.js";
export type { TextFormat } from "./formats/types.js";
export { applyOperations } from "./operations/applyOperations.js";
export type { LensBlock } from "./blocks/types.js";
export type { BlockOperation, BlockPosition } from "./operations/types.js";
export type { MergeWarning } from "./merge/tree.js";
export type { TargetWarning } from "./target/targetFromPairs.js";
export type { FitWarning } from "./fit/fitTable.js";
