import type { BlockNoteEditor } from "@blocknote/core";
import {
  TableOfContentsExtension,
  type TableOfContentsEntry,
} from "@blocknote/core/extensions";

import { useExtension, useExtensionState } from "../../hooks/useExtension.js";

/**
 * The editor's table of contents, for building an outline UI of your own:
 * the entries, the one being read, and a function that scrolls to an entry.
 * The editor needs `TableOfContentsExtension`.
 */
export function useTableOfContents(editor?: BlockNoteEditor<any, any, any>): {
  entries: TableOfContentsEntry[];
  activeBlockId: string | undefined;
  scrollToEntry: (blockId: string) => void;
} {
  const { scrollToEntry } = useExtension(TableOfContentsExtension, { editor });
  const { entries, activeBlockId } = useExtensionState(
    TableOfContentsExtension,
    { editor },
  );
  return { entries, activeBlockId, scrollToEntry };
}
