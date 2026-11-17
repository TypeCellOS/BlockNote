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
  computeOperations,
  type DocumentChange,
  type DocumentChangedError,
  getDocumentText,
  type InvalidDocumentError,
  type JSONChange,
  type TextChange,
  updateDocument,
  type WriteFromVersion,
} from "./api.js";
export {
  type ChangeWarning,
  computeOperationsWithMerge,
  type ConflictError,
  type DocumentMergeChange,
  type MergedChangeOperations,
  type MergedChangeResult,
  type MergeFromVersion,
  updateDocumentWithMerge,
} from "./apiWithMerge.js";
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
