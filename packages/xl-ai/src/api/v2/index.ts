/**
 * The public API of the text lens (`@blocknote/xl-ai/text-lens`). Other
 * modules export more, for their unit tests. Only the exports of this file
 * (and of `yjs/index.ts`) are public.
 *
 * The API for a Y.Doc is in `yjs/index.ts` (`@blocknote/xl-ai/text-lens/yjs`),
 * a separate entry point. Thus, code without Yjs does not load Yjs.
 */
export {
  type ChangeOfOthers,
  type ChangeOperations,
  type ChangeResult,
  type ChangeWarning,
  computeOperations,
  computeOperationsWithMerge,
  type ConflictError,
  type DocumentChange,
  type DocumentMergeChange,
  getDocumentText,
  type InvalidDocumentError,
  type JSONChange,
  type MergedChangeOperations,
  type MergedChangeResult,
  type MergeFromVersion,
  type TextChange,
  updateDocument,
  updateDocumentWithMerge,
  type WriteFromVersion,
} from "./api.js";
export {
  assertBlockContract,
  type BlockContractText,
  type NamedFormat,
} from "./blockContract.js";
export {
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
} from "./formats/index.js";
export {
  applyOperations,
  type BlockOperation,
  type BlockPosition,
} from "./operations/index.js";
export type { LensBlock } from "./model.js";
export type { MergeWarning } from "./merge/index.js";
export type { TargetWarning } from "./target/index.js";
export type { FitWarning } from "./fit/index.js";
