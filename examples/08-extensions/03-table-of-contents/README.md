# Table of Contents

`TableOfContentsExtension` lists the document's headings, keeps the list up to date as the document changes, and scrolls to a heading on request. It is opt-in and ships no UI: this example builds an outline sidebar with Mantine, which you can copy or adapt.

**Try it out:** Click an entry to jump to its heading, or add, rename or remove a heading and see the outline follow.

## Usage

Add the extension when creating your editor, then read its state and call its methods from your own UI:

```tsx
import { TableOfContentsExtension } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import {
  useCreateBlockNote,
  useExtension,
  useExtensionState,
} from "@blocknote/react";

function Editor() {
  const editor = useCreateBlockNote({
    extensions: [TableOfContentsExtension()],
  });
  const { scrollToEntry } = useExtension(TableOfContentsExtension, { editor });
  const { entries } = useExtensionState(TableOfContentsExtension, { editor });

  return (
    <>
      <nav>
        {entries.map((entry) => (
          <button
            key={entry.blockId}
            onClick={() => scrollToEntry(entry.blockId)}
          >
            {entry.title}
          </button>
        ))}
      </nav>
      <BlockNoteView editor={editor} />
    </>
  );
}
```

Each entry has the heading's `blockId`, `title`, `level` and `depth`: how many levels it is below the shallowest heading level in the document, for indenting the outline. Every heading with text is listed, so filter the entries for a shorter outline, e.g. `entries.filter((entry) => entry.depth <= 1)`. `scrollToEntry(blockId)` scrolls the heading into view; to keep it clear of a sticky header, set `scroll-padding-top` on the element the editor scrolls in.

Entries are filled in once the editor is mounted. For a document without a mounted editor (e.g. server rendering or exports), call `getTableOfContentsEntries(editor.document)`.

For the example UI, copy `TableOfContents.tsx` and `style.css`, and render `<TableOfContents editor={editor} />` next to your `BlockNoteView` as shown in `App.tsx`.

**Relevant Docs:**

- [Editor Setup](/docs/getting-started/editor-setup)
- [Extensions](/docs/features/extensions)
