/**
 * The public API of the text lens (`@blocknote/xl-ai/text-lens`). Other
 * modules export more, for their unit tests. Only the exports of this file
 * (and of `yjs/index.ts`) are public.
 *
 * The API for a Y.Doc is in `yjs/index.ts` (`@blocknote/xl-ai/text-lens/yjs`),
 * a separate entry point. Thus, code without Yjs does not load Yjs.
 */
export {
  computeJSONUpdate,
  computeTextUpdate,
  getDocumentText,
  type JSONUpdateOptions,
  type TextUpdate,
  type TextUpdateOptions,
  type TextUpdateWarning,
  type ValidTextUpdate,
  updateDocumentFromJSON,
  updateDocumentFromText,
} from "./api.js";
export { htmlFormat } from "./formats/html.js";
export { markdownFormat } from "./formats/markdown.js";
export { plainTextFormat } from "./formats/plainText.js";
export type { TextFormat } from "./formats/types.js";
export { applyBlockOperations } from "./operations/applyOperations.js";
export type { BlockOperation, BlockPosition } from "./operations/types.js";
export type { RebaseWarning } from "./rebase/rebaseOperations.js";
export type { PlanWarning } from "./target/planTarget.js";
