import { TextSelection } from "prosemirror-state";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

// These tests are meant to test the copying of user selections in the editor.
// The test cases used for the other HTML conversion tests are not suitable here
// as they are represented in the BlockNote API, whereas here we want to test
// ProseMirror/TipTap selections directly.
describe("Test ProseMirror selection HTML conversion", () => {
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

  beforeAll(async () => {
    (window as any).__TEST_OPTIONS = (window as any).__TEST_OPTIONS || {};
    editor = BlockNoteEditor.create({ initialContent });
    editor.mount(div);
  });

  afterAll(() => {
    editor.mount(undefined);
    editor._tiptapEditor.destroy();
    editor = undefined as any;

    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  // Sets the editor selection to the given start and end positions, then
  // exports the selected content to HTML and compares it to a snapshot.
  function testSelection(testName: string, startPos: number, endPos: number) {
    editor.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        TextSelection.create(editor._tiptapEditor.state.doc, startPos, endPos)
      )
    );

    // const slice = editor._tiptapEditor.state.selection.content();

    const blockNoteSelection = editor.getSelection2();

    expect(
      JSON.stringify(blockNoteSelection, undefined, 2)
    ).toMatchFileSnapshot(`./__snapshots_selection_json__/${testName}.json`);
  }

  const testCases: { testName: string; startPos: number; endPos: number }[] = [
    // Selection spans all of first heading's children.
    {
      testName: "multipleChildren",
      startPos: 16,
      endPos: 78,
    },
    // Selection spans from start of first heading to end of its first child.
    {
      testName: "childToParent",
      startPos: 3,
      endPos: 34,
    },
    // Selection spans from middle of first heading to the middle of its first
    // child.
    {
      testName: "partialChildToParent",
      startPos: 6,
      endPos: 23,
    },
    // Selection spans from start of first heading's first child to end of
    // second heading's content (does not include second heading's children).
    {
      testName: "childrenToNextParent",
      startPos: 16,
      endPos: 93,
    },
    // Selection spans from start of first heading's first child to end of
    // second heading's last child.
    {
      testName: "childrenToNextParentsChildren",
      startPos: 16,
      endPos: 159,
    },
    // Selection spans "Regular" text inside third heading.
    {
      testName: "unstyledText",
      startPos: 175,
      endPos: 182,
    },
    // Selection spans "Italic" text inside third heading.
    {
      testName: "styledText",
      startPos: 169,
      endPos: 175,
    },
    // Selection spans third heading's content (does not include third heading's
    // children).
    {
      testName: "multipleStyledText",
      startPos: 165,
      endPos: 182,
    },
    // Selection spans the image block content.
    {
      testName: "image",
      startPos: 185,
      endPos: 186,
    },
    // Selection spans from start of third heading to end of it's last
    // descendant.
    {
      testName: "nestedImage",
      startPos: 165,
      endPos: 205,
    },
    // Selection spans text in first cell of the table.
    {
      testName: "tableCellText",
      startPos: 216,
      endPos: 226,
    },
    // Selection spans first cell of the table.
    {
      testName: "tableCell",
      startPos: 215,
      endPos: 227,
    },
    // Selection spans first row of the table.
    {
      testName: "tableRow",
      startPos: 229,
      endPos: 241,
    },
    // Selection spans all cells of the table.
    {
      testName: "tableAllCells",
      startPos: 259,
      endPos: 271,
    },
  ];

  for (const testCase of testCases) {
    // (TODO?)
    // eslint-disable-next-line jest/valid-title
    it(testCase.testName, () => {
      testSelection(testCase.testName, testCase.startPos, testCase.endPos);
    });
  }

  it("move end", () => {
    const size = editor._tiptapEditor.state.doc.content.size;

    let ret = "";

    for (let i = 0; i < size; i++) {
      editor.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          TextSelection.create(editor._tiptapEditor.state.doc, 0, i)
        )
      );
      const blockNoteSelection = editor.getSelection2();
      const JSONString = JSON.stringify(blockNoteSelection);
      ret += JSONString + "\n";
    }

    expect(ret).toMatchFileSnapshot(
      `./__snapshots_selection_json__/move_end.txt`
    );
  });

  it("move start", () => {
    const size = editor._tiptapEditor.state.doc.content.size;

    let ret = "";

    for (let i = 0; i < size; i++) {
      editor.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          TextSelection.create(editor._tiptapEditor.state.doc, i, size - 1)
        )
      );

      const blockNoteSelection = editor.getSelection2();
      const JSONString = JSON.stringify(blockNoteSelection);
      ret += JSONString + "\n";
    }

    expect(ret).toMatchFileSnapshot(
      `./__snapshots_selection_json__/move_start.txt`
    );
  });
});

/**
 *
 * Insert $#$ markers around the selection
 *
 * respond with regular update / remove add blocks
 *
 * just apply updates
 * (possibly: check if updates only affect selection)
 *
 *
 * post partial "slice" blocks that are selected
 * respond with similar slice
 */
