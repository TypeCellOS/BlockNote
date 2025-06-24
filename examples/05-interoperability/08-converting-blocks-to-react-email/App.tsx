import {
  BlockNoteSchema,
  combineByGroup,
  filterSuggestionItems,
  withPageBreak,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  ReactEmailExporter,
  reactEmailDefaultSchemaMappings,
} from "@blocknote/xl-email-exporter";
import { useEffect, useMemo, useState } from "react";

import "./styles.css";

export default function App() {
  // Stores the editor's contents as HTML.
  const [emailDocument, setEmailDocument] = useState<any>();

  // Creates a new editor instance with some initial content.
  const editor = useCreateBlockNote({
    schema: withPageBreak(BlockNoteSchema.create()),
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
    initialContent: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Welcome to this ",
            styles: {
              italic: true,
            },
          },
          {
            type: "text",
            text: "demo!",
            styles: {
              italic: true,
              bold: true,
            },
          },
        ],
        children: [
          {
            type: "paragraph",
            content: "Hello World nested",
            children: [
              {
                type: "paragraph",
                content: "Hello World double nested",
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This paragraph has a background color",
            styles: { bold: true },
          },
        ],
        props: {
          backgroundColor: "red",
        },
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This one too, but it's blue",
            styles: { italic: true },
          },
        ],
        props: {
          backgroundColor: "blue",
        },
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
        type: "heading",
        content: "Heading right",
        props: {
          textAlignment: "right",
        },
      },
      {
        type: "paragraph",
        content:
          "justified paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",

        props: {
          textAlignment: "justify",
        },
      },
      {
        type: "bulletListItem",
        content:
          "Bullet List Item.  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        children: [
          {
            type: "bulletListItem",
            content:
              "Bullet List Item.  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          },
          {
            type: "bulletListItem",
            content:
              "Bullet List Item.  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
            props: {
              textAlignment: "right",
            },
          },
          {
            type: "numberedListItem",
            content: "Numbered List Item 1",
          },
          {
            type: "numberedListItem",
            content: "Numbered List Item 2",
            children: [
              {
                type: "numberedListItem",
                content: "Numbered List Item Nested 1",
              },
              {
                type: "numberedListItem",
                content: "Numbered List Item Nested 2",
              },
              {
                type: "numberedListItem",
                content: "Numbered List Item Nested funky right",
                props: {
                  textAlignment: "right",
                  backgroundColor: "red",
                  textColor: "blue",
                },
              },
              {
                type: "numberedListItem",
                content: "Numbered List Item Nested funky center",
                props: {
                  textAlignment: "center",
                  backgroundColor: "red",
                  textColor: "blue",
                },
              },
            ],
          },
        ],
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
        type: "pageBreak",
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
        type: "image",
        props: {
          previewWidth: 200,
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
          textAlignment: "right",
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
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell 1", "Table Cell 2", "Table Cell 3"],
            },
            {
              cells: [
                "Table Cell 4",
                [
                  {
                    type: "text",
                    text: "Table Cell Bold 5",
                    styles: {
                      bold: true,
                    },
                  },
                ],
                "Table Cell 6",
              ],
            },
            {
              cells: ["Table Cell 7", "Table Cell 8", "Table Cell 9"],
            },
          ],
        },
      },
      {
        type: "codeBlock",
        props: {
          language: "javascript",
        },
        content: `const helloWorld = (message) => {
  console.log("Hello World", message);
};`,
      },
    ],
  });

  const onChange = async () => {
    if (!editor || !editor.document) {
      return;
    }
    const exporter = new ReactEmailExporter(
      editor.schema,
      reactEmailDefaultSchemaMappings,
    );
    const emailHtml = await exporter.toReactEmailDocument(editor.document);

    setEmailDocument(emailHtml);
  };

  useEffect(() => {
    onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slashMenuItems = useMemo(() => {
    return combineByGroup(getDefaultReactSlashMenuItems(editor));
  }, [editor]);

  // Renders the editor instance, and its contents as HTML below.
  return (
    <div className="wrapper">
      <div className="editor">
        <BlockNoteView editor={editor} slashMenu={false} onChange={onChange}>
          <SuggestionMenuController
            triggerCharacter={"/"}
            getItems={async (query) =>
              filterSuggestionItems(slashMenuItems, query)
            }
          />
        </BlockNoteView>
      </div>
      <div
        className="email"
        dangerouslySetInnerHTML={{ __html: emailDocument }}
      />
    </div>
  );
}
