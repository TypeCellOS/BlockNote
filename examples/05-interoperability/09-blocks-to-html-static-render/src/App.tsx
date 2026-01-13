import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote, usePrefersColorScheme } from "@blocknote/react";
import { useCallback, useEffect, useRef } from "react";

import "./styles.css";

export default function App() {
  // Creates a new editor instance with some initial content.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Blocks:",
            styles: { bold: true },
          },
        ],
      },
      {
        type: "paragraph",
        content: "Paragraph",
      },
      {
        type: "heading",
        content: "Heading",
      },
      {
        id: "toggle-heading",
        type: "heading",
        props: { isToggleable: true },
        content: "Toggle Heading",
      },
      {
        type: "quote",
        content: "Quote",
      },
      {
        type: "bulletListItem",
        content: "Bullet List Item",
      },
      {
        type: "numberedListItem",
        content: "Numbered List Item",
      },
      {
        type: "checkListItem",
        content: "Check List Item",
      },
      {
        id: "toggle-list-item",
        type: "toggleListItem",
        content: "Toggle List Item",
      },
      {
        type: "codeBlock",
        props: { language: "javascript" },
        content: "console.log('Hello, world!');",
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell", "Table Cell", "Table Cell"],
            },
            {
              cells: ["Table Cell", "Table Cell", "Table Cell"],
            },
            {
              cells: ["Table Cell", "Table Cell", "Table Cell"],
            },
          ],
        },
      },
      {
        type: "file",
      },
      {
        type: "image",
        props: {
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
          caption:
            "From https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        },
      },
      {
        type: "video",
        props: {
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
          caption:
            "From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        },
      },
      {
        type: "audio",
        props: {
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
          caption:
            "From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        },
      },
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Inline Content:",
            styles: { bold: true },
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Styled Text",
            styles: {
              bold: true,
              italic: true,
              textColor: "red",
              backgroundColor: "blue",
            },
          },
          {
            type: "text",
            text: " ",
            styles: {},
          },
          {
            type: "link",
            content: "Link",
            href: "https://www.blocknotejs.org",
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  const ref = useRef<HTMLDivElement>(null);
  const systemColorScheme = usePrefersColorScheme();
  const theme =
    systemColorScheme === "no-preference" ? "light" : systemColorScheme;

  // Function to update the rendered static HTML.
  const updateRenderedHTML = useCallback(async () => {
    if (ref.current) {
      ref.current.innerHTML = editor.blocksToFullHTML(editor.document);
    }
  }, []);
  // Updates rendered static HTML with initial editor content.
  useEffect(() => {
    updateRenderedHTML();
  }, []);

  // Renders the editor instance and HTML output.
  return (
    <div className="views">
      <div className="view-wrapper">
        <div className="view-label">Editor Input</div>
        <div className="view">
          <BlockNoteView editor={editor} onChange={updateRenderedHTML} />
        </div>
      </div>
      <div className="view-wrapper">
        <div className="view-label">Rendered Static HTML Output</div>
        <div className="view">
          {/* To make the static HTML look identical to the editor, we need to 
          add these two wrapping divs to the exported blocks. These mock the 
          wrapping elements of a BlockNote editor, and are needed as the 
          exported HTML only holds the contents of the editor. You need will 
          need to add additional class names/attributes depend on the UI 
          library you're using, whether you want to show light or dark mode, 
          etc. It's easiest to just copy the class names and HTML attributes 
          from an actual BlockNote editor. */}
          <div
            className="bn-container bn-mantine"
            data-color-scheme={theme}
            data-mantine-color-scheme={theme}
          >
            <div
              className="ProseMirror bn-editor bn-default-styles"
              ref={ref}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
