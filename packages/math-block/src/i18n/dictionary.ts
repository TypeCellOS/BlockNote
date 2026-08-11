import { BlockNoteEditor } from "@blocknote/core";

import { en } from "./locales/en.js";

export type MathDictionary = typeof en;

/**
 * Returns the Math dictionary for the editor. The Math block/inline content are
 * localized by merging a `math` dictionary into the editor's dictionary (see
 * the exported `locales`); when the host hasn't provided one, the bundled
 * English strings are used, so the blocks work without extra setup.
 */
export function getMathDictionary(
  editor: BlockNoteEditor<any, any, any>,
): MathDictionary {
  return ((editor.dictionary as any).math as MathDictionary | undefined) ?? en;
}
