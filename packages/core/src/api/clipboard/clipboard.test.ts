import { Node } from "prosemirror-model";
import { NodeSelection, Selection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { initializeESMDependencies } from "../../util/esmDependencies.js";
import { doPaste } from "../testUtil/paste.js";
import { selectedFragmentToHTML } from "./toClipboard/copyExtension.js";

type SelectionTestCase = {
  testName: string;
  createSelection: (doc: Node) => Selection;
};

// These tests are meant to test the copying of user selections in the editor.
// The test cases used for the other HTML conversion tests are not suitable here
// as they are represented in the BlockNote API, whereas here we want to test
// ProseMirror/TipTap selections directly.
describe("Test ProseMirror selection clipboard HTML", () => {
  const initialContent: PartialBlock[] = [
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
  ];

  let editor: BlockNoteEditor;
  const div = document.createElement("div");

  beforeEach(() => {
    editor.replaceBlocks(editor.document, initialContent);
  });

  beforeAll(async () => {
    (window as any).__TEST_OPTIONS = (window as any).__TEST_OPTIONS || {};

    editor = BlockNoteEditor.create();
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
    editor.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        testCase.createSelection(editor._tiptapEditor.view.state.doc)
      )
    );

    const { clipboardHTML, externalHTML } = await selectedFragmentToHTML(
      editor._tiptapEditor.view,
      editor
    );

    expect(externalHTML).toMatchFileSnapshot(
      `./__snapshots__/${testCase.testName}.html`
    );

    const originalDocument = editor.document;
    doPaste(
      editor._tiptapEditor.view,
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
    // Selection spans all of first heading's children.
    {
      testName: "multipleChildren",
      createSelection: (doc) => TextSelection.create(doc, 16, 78),
    },
    // Selection spans from start of first heading to end of its first child.
    {
      testName: "childToParent",
      createSelection: (doc) => TextSelection.create(doc, 3, 34),
    },
    // Selection spans from middle of first heading to the middle of its first
    // child.
    {
      testName: "partialChildToParent",
      createSelection: (doc) => TextSelection.create(doc, 6, 23),
    },
    // Selection spans from start of first heading's first child to end of
    // second heading's content (does not include second heading's children).
    {
      testName: "childrenToNextParent",
      createSelection: (doc) => TextSelection.create(doc, 16, 93),
    },
    // Selection spans from start of first heading's first child to end of
    // second heading's last child.
    {
      testName: "childrenToNextParentsChildren",
      createSelection: (doc) => TextSelection.create(doc, 16, 159),
    },
    // Selection spans "Regular" text inside third heading.
    {
      testName: "unstyledText",
      createSelection: (doc) => TextSelection.create(doc, 175, 182),
    },
    // Selection spans "Italic" text inside third heading.
    {
      testName: "styledText",
      createSelection: (doc) => TextSelection.create(doc, 169, 175),
    },
    // Selection spans third heading's content (does not include third heading's
    // children).
    {
      testName: "multipleStyledText",
      createSelection: (doc) => TextSelection.create(doc, 165, 182),
    },
    // Selection spans the image block content.
    {
      testName: "image",
      createSelection: (doc) => NodeSelection.create(doc, 185),
    },
    // Selection spans from start of third heading to end of it's last
    // descendant.
    {
      testName: "nestedImage",
      createSelection: (doc) => TextSelection.create(doc, 165, 205),
    },
    // Selection spans text in first cell of the table.
    {
      testName: "tableCellText",
      createSelection: (doc) => TextSelection.create(doc, 216, 226),
    },
    // Selection spans first cell of the table.
    // TODO: External HTML is wrapped in unnecessary `tr` element.
    {
      testName: "tableCell",
      createSelection: (doc) => CellSelection.create(doc, 214),
    },
    // Selection spans first row of the table.
    {
      testName: "tableRow",
      createSelection: (doc) => CellSelection.create(doc, 214, 228),
    },
    // Selection spans all cells of the table.
    {
      testName: "tableAllCells",
      createSelection: (doc) => CellSelection.create(doc, 214, 258),
    },
  ];

  for (const testCase of testCases) {
    it(`${testCase.testName}`, async () => {
      await testSelection(testCase);
    });
  }
});
