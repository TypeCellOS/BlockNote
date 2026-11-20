import type { TableOfContentsEntry } from "@blocknote/core/extensions";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { useTableOfContents } from "./useTableOfContents.js";

export type TableOfContentsProps = {
  /**
   * Called when an entry is clicked, after its heading starts scrolling into
   * view, e.g. to close the popover the outline is in.
   */
  onNavigate?: (entry: TableOfContentsEntry) => void;
};

/**
 * An outline of the document's headings. Clicking an entry scrolls to its
 * heading, and the entry of the section being read is highlighted. The
 * editor needs `TableOfContentsExtension`.
 *
 * Render it inside `BlockNoteView`, and use `RenderInPortalElement` to place
 * it elsewhere on the page, e.g. in a sidebar.
 */
export function TableOfContents(props: TableOfContentsProps) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const { entries, activeBlockId, scrollToEntry } = useTableOfContents();

  if (entries.length === 0) {
    return null;
  }

  return (
    <Components.TableOfContents.Root
      className="bn-table-of-contents"
      title={dict.table_of_contents.title}
    >
      <ul className="bn-table-of-contents-list">
        {entries.map((entry) => (
          <li key={entry.blockId}>
            <Components.TableOfContents.Item
              className="bn-table-of-contents-item"
              depth={entry.depth}
              isActive={activeBlockId === entry.blockId}
              onClick={() => {
                scrollToEntry(entry.blockId);
                props.onNavigate?.(entry);
              }}
            >
              {entry.title}
            </Components.TableOfContents.Item>
          </li>
        ))}
      </ul>
    </Components.TableOfContents.Root>
  );
}
