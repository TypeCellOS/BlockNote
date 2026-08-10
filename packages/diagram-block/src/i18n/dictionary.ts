import { BlockNoteEditor } from "@blocknote/core";

import { en } from "./locales/en.js";

export type DiagramDictionary = typeof en;

/**
 * Returns the Diagram dictionary for the editor. The Diagram block is localized
 * by merging a `diagram` dictionary into the editor's dictionary (see the
 * exported `locales`); when the host hasn't provided one, the bundled English
 * strings are used, so the block works without extra setup.
 */
export function getDiagramDictionary(
  editor: BlockNoteEditor<any, any, any>,
): DiagramDictionary {
  return (
    ((editor.dictionary as any).diagram as DiagramDictionary | undefined) ?? en
  );
}
