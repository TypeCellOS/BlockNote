/** The public API of the text lens for a Y.Doc of Yjs 14 (`@blocknote/xl-ai/text-lens/y`). See `../index.ts`. */
export {
  applyYDocOperations,
  computeYDocOperations,
  getYDocText,
  type UnknownBaseError,
  updateYDoc,
  type YDocChangeResult,
  type YDocOperationsResult,
} from "./yjsApi.js";
export {
  computeYDocOperationsWithMerge,
  experimental_updateYDocWithYjsMerge,
  updateYDocWithMerge,
  type YDocMergedChangeResult,
  type YDocMergedOperationsResult,
} from "./yjsApiWithMerge.js";
