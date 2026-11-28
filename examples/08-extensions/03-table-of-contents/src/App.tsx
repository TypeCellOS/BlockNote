import "@blocknote/core/fonts/inter.css";
import { TableOfContentsExtension } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import { content } from "./content";
import { TableOfContents } from "./TableOfContents";
import "./style.css";

export default function App() {
  // The extension lists the headings and scrolls to them. It ships no UI:
  // `TableOfContents` is this example's own outline.
  const editor = useCreateBlockNote({
    initialContent: content,
    extensions: [TableOfContentsExtension()],
  });

  return (
    <div className="layout">
      <aside className="toc-sidebar">
        <TableOfContents editor={editor} />
      </aside>
      <BlockNoteView editor={editor} />
    </div>
  );
}
