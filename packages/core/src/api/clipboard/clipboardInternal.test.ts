import { Node } from "prosemirror-model";
import { NodeSelection, Selection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { initializeESMDependencies } from "../../util/esmDependencies.js";
import { doPaste } from "../testUtil/paste.js";
import { schema } from "./testUtil.js";
import { selectedFragmentToHTML } from "./toClipboard/copyExtension.js";

type SelectionTestCase = {
  testName: string;
  createCopySelection: (doc: Node) => Selection;
  createPasteSelection?: (doc: Node) => Selection;
};

// These tests are meant to test the copying of user selections in the editor.
// The test cases used for the other HTML conversion tests are not suitable here
// as they are represented in the BlockNote API, whereas here we want to test
// ProseMirror/TipTap selections directly.
describe("Test ProseMirror selection clipboard HTML", () => {
  const initialContent: PartialBlock<typeof schema.blockSchema>[] = [
    {
      type: "heading",
      props: {
        level: 2,
        textColor: "red",
      },
      content: "Heading 1",
      children: [
        {
          type: "paragraph",
          content: "Nested Paragraph 1",
        },
        {
          type: "paragraph",
          content: "Nested Paragraph 2",
        },
        {
          type: "paragraph",
          content: "Nested Paragraph 3",
        },
      ],
    },
    {
      type: "heading",
      props: {
        level: 2,
        textColor: "red",
      },
      content: "Heading 2",
      children: [
        {
          type: "paragraph",
          content: "Nested Paragraph 1",
        },
        {
          type: "paragraph",
          content: "Nested Paragraph 2",
        },
        {
          type: "paragraph",
          content: "Nested Paragraph 3",
        },
      ],
    },
    {
      type: "heading",
      props: {
        level: 2,
        textColor: "red",
      },
      content: [
        {
          type: "text",
          text: "Bold",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: "Italic",
          styles: {
            italic: true,
          },
        },
        {
          type: "text",
          text: "Regular",
          styles: {},
        },
      ],
      children: [
        {
          type: "image",
          props: {
            url: "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg",
          },
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph",
            },
          ],
        },
      ],
    },
    {
      type: "table",
      content: {
        type: "tableContent",
        rows: [
          {
            cells: ["Table Cell", "Table Cell"],
          },
          {
            cells: ["Table Cell", "Table Cell"],
          },
        ],
      },
      // Not needed as selections starting in table cells will get snapped to
      // the table boundaries.
      // children: [
      //   {
      //     type: "table",
      //     content: {
      //       type: "tableContent",
      //       rows: [
      //         {
      //           cells: ["Table Cell", "Table Cell"],
      //         },
      //         {
      //           cells: ["Table Cell", "Table Cell"],
      //         },
      //       ],
      //     },
      //   },
      // ],
    },
    {
      type: "paragraph",
      content: "Paragraph",
    },
    {
      type: "customParagraph",
      content: "Paragraph",
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
      type: "numberedListItem",
      content: "Numbered List Item",
    },
    {
      type: "bulletListItem",
      content: "Bullet List Item",
    },
    {
      type: "checkListItem",
      content: "Check List Item",
    },
    {
      type: "codeBlock",
      content: 'console.log("Hello World");',
    },
    {
      type: "table",
      content: {
        type: "tableContent",
        rows: [
          {
            cells: [["Table Cell"], ["Table Cell"], ["Table Cell"]],
          },
          {
            cells: [["Table Cell"], ["Table Cell"], ["Table Cell"]],
          },
          {
            cells: [["Table Cell"], ["Table Cell"], ["Table Cell"]],
          },
        ],
      },
    },
    {
      type: "image",
    },
    {
      type: "paragraph",
      props: {
        textColor: "red",
      },
      content: "Paragraph",
    },
    {
      type: "heading",
      props: {
        level: 2,
      },
      content: "Heading",
    },
    {
      type: "numberedListItem",
      props: {
        start: 2,
      },
      content: "Numbered List Item",
    },
    {
      type: "bulletListItem",
      props: {
        backgroundColor: "red",
      },
      content: "Bullet List Item",
    },
    {
      type: "checkListItem",
      props: {
        checked: true,
      },
      content: "Check List Item",
    },
    {
      type: "codeBlock",
      props: {
        language: "typescript",
      },
      content: 'console.log("Hello World");',
    },
    {
      type: "table",
      content: {
        type: "tableContent",
        rows: [
          {
            cells: [["Table Cell"], ["Table Cell"], ["Table Cell"]],
          },
          {
            cells: [["Table Cell"], ["Table Cell"], ["Table Cell"]],
          },
          {
            cells: [["Table Cell"], ["Table Cell"], ["Table Cell"]],
          },
        ],
      },
    },
    {
      type: "image",
      props: {
        name: "1280px-Placeholder_view_vector.svg.png",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/1280px-Placeholder_view_vector.svg.png",
        caption: "Placeholder",
        showPreview: true,
        previewWidth: 256,
      },
    },
    {
      type: "paragraph",
    },
  ];

  let editor: BlockNoteEditor<typeof schema.blockSchema>;
  const div = document.createElement("div");

  beforeEach(() => {
    editor.replaceBlocks(editor.document, initialContent);
  });

  beforeAll(async () => {
    (window as any).__TEST_OPTIONS = (window as any).__TEST_OPTIONS || {};

    editor = BlockNoteEditor.create({ schema });
    editor.mount(div);

    await initializeESMDependencies();
  });

  afterAll(() => {
    editor.mount(undefined);
    editor._tiptapEditor.destroy();
    editor = undefined as any;

    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  // Sets the editor selection to the given start and end positions, then
  // exports the selected content to HTML and compares it to a snapshot.
  async function testSelection(testCase: SelectionTestCase) {
    if (!editor.prosemirrorView) {
      throw new Error("Editor view not initialized.");
    }

    editor.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        testCase.createCopySelection(editor.prosemirrorView.state.doc)
      )
    );

    const { clipboardHTML, externalHTML } = selectedFragmentToHTML(
      editor.prosemirrorView,
      editor
    );

    expect(externalHTML).toMatchFileSnapshot(
      `./__snapshots__/internal/${testCase.testName}.html`
    );

    if (testCase.createPasteSelection) {
      editor.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          testCase.createPasteSelection(editor.prosemirrorView.state.doc)
        )
      );
    }

    const originalDocument = editor.document;
    doPaste(
      editor.prosemirrorView,
      "text",
      clipboardHTML,
      false,
      new ClipboardEvent("paste")
    );
    const newDocument = editor.document;

    expect(newDocument).toStrictEqual(originalDocument);
  }

  const testCases: SelectionTestCase[] = [
    // TODO: Consider adding test cases for nested blocks & double nested blocks.
    // Copy/paste all of first heading's children.
    {
      testName: "multipleChildren",
      createCopySelection: (doc) => TextSelection.create(doc, 16, 78),
    },
    // Copy/paste from start of first heading to end of its first child.
    {
      testName: "childToParent",
      createCopySelection: (doc) => TextSelection.create(doc, 3, 34),
    },
    // Copy/paste from middle of first heading to the middle of its first child.
    {
      testName: "partialChildToParent",
      createCopySelection: (doc) => TextSelection.create(doc, 6, 23),
    },
    // Copy/paste from start of first heading's first child to end of second
    // heading's content (does not include second heading's children).
    {
      testName: "childrenToNextParent",
      createCopySelection: (doc) => TextSelection.create(doc, 16, 93),
    },
    // Copy/paste from start of first heading's first child to end of second
    // heading's last child.
    {
      testName: "childrenToNextParentsChildren",
      createCopySelection: (doc) => TextSelection.create(doc, 16, 159),
    },
    // Copy/paste "Regular" text inside third heading.
    {
      testName: "unstyledText",
      createCopySelection: (doc) => TextSelection.create(doc, 175, 182),
    },
    // Copy/paste "Italic" text inside third heading.
    {
      testName: "styledText",
      createCopySelection: (doc) => TextSelection.create(doc, 169, 175),
    },
    // Copy/paste third heading's content (does not include third heading's
    // children).
    {
      testName: "multipleStyledText",
      createCopySelection: (doc) => TextSelection.create(doc, 165, 182),
    },
    // Copy/paste the image block content.
    {
      testName: "image",
      createCopySelection: (doc) => NodeSelection.create(doc, 185),
    },
    // Copy/paste from start of third heading to end of it's last descendant.
    {
      testName: "nestedImage",
      createCopySelection: (doc) => TextSelection.create(doc, 165, 205),
    },
    // Copy/paste text in first cell of the table.
    {
      testName: "tableCellText",
      createCopySelection: (doc) => TextSelection.create(doc, 216, 226),
    },
    // Copy/paste first cell of the table.
    // TODO: External HTML is wrapped in unnecessary `tr` element.
    {
      testName: "tableCell",
      createCopySelection: (doc) => CellSelection.create(doc, 214),
    },
    // Copy/paste first row of the table.
    {
      testName: "tableRow",
      createCopySelection: (doc) => CellSelection.create(doc, 214, 228),
    },
    // Copy/paste all cells of the table.
    {
      testName: "tableAllCells",
      createCopySelection: (doc) => CellSelection.create(doc, 214, 258),
    },
    // Copy regular paragraph content and paste over custom block content.
    {
      testName: "paragraphInCustomBlock",
      createCopySelection: (doc) => TextSelection.create(doc, 277, 286),
      createPasteSelection: (doc) => TextSelection.create(doc, 290, 299),
    },
    // Copy/paste basic blocks.
    {
      testName: "basicBlocks",
      createCopySelection: (doc) => TextSelection.create(doc, 303, 558),
    },
    // Copy/paste basic blocks with props.
    {
      testName: "basicBlocksWithProps",
      createCopySelection: (doc) => TextSelection.create(doc, 558, 813),
    },
  ];

  for (const testCase of testCases) {
    it(`${testCase.testName}`, async () => {
      await testSelection(testCase);
    });
  }
});
