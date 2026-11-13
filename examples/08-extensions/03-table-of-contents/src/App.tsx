import "@blocknote/core/fonts/inter.css";
import { TableOfContentsExtension } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  RenderInPortalElement,
  TableOfContents,
  useCreateBlockNote,
} from "@blocknote/react";
import { useState } from "react";

import { content } from "./content";
import "./style.css";

export default function App() {
  // The extension tracks the headings and the section being read. It finds
  // the element the editor scrolls in by itself: here, the editor's container.
  const editor = useCreateBlockNote({
    initialContent: content,
    extensions: [TableOfContentsExtension()],
  });
  const [outline, setOutline] = useState<HTMLElement | null>(null);

  return (
    <div className="layout">
      <aside className="outline" ref={setOutline} />
      <BlockNoteView editor={editor}>
        {/* `TableOfContents` needs the editor's context, so it's rendered
            inside `BlockNoteView`, and placed in the sidebar with
            `RenderInPortalElement`. */}
        {outline && (
          <RenderInPortalElement target={outline}>
            <TableOfContents />
          </RenderInPortalElement>
        )}
      </BlockNoteView>
    </div>
  );
}
