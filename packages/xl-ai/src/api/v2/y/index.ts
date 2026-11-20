/** The public API of the text lens for a Y.Doc of Yjs 14 (`@blocknote/xl-ai/text-lens/y`). See `../index.ts`. */
export {
  getYDocText,
  updateYDoc,
  type YDocChangeResult,
  type YDocWriteFromVersion,
} from "./yDocText.js";
export {
  experimental_updateYDocWithYjsMerge,
  updateYDocWithMerge,
  type YDocMergeFromVersion,
  type YDocMergedChangeResult,
} from "./yDocTextWithMerge.js";
