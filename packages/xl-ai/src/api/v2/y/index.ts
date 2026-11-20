/** The public API of the text lens for a Y.Doc (`@blocknote/xl-ai/text-lens/yjs`). See `../index.ts`. */
export { updateYDoc, type YDocChangeResult } from "./yDocText.js";
export {
  experimental_updateYDocWithYjsMerge,
  updateYDocWithMerge,
  type YDocMergedChangeResult,
} from "./yDocTextWithMerge.js";
