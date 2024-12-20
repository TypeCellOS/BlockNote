import { Node } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { initializeESMDependencies } from "../../util/esmDependencies.js";
import { doPaste } from "../testUtil/paste.js";
import { schema } from "./testUtil.js";

type SelectionTestCase = {
  testName: string;
  createSelection: (doc: Node) => Selection;
} & (
  | {
      html: string;
    }
  | {
      plainText: string;
    }
);

// These tests are meant to test the pasting of external HTML in the editor.
// Each test case has an HTML string to be pasted, and a selection in the editor
// to paste at.
describe("Test external clipboard HTML", () => {
  const initialContent: PartialBlock<typeof schema.blockSchema>[] = [
    {
      type: "paragraph",
      content: "Paragraph",
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
    },
    {
      type: "customParagraph",
      content: "Custom Paragraph",
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
  // pastes the HTML and compares it the document after to a snapshot.
  async function testPasteExternalHTML(testCase: SelectionTestCase) {
    if (!editor.prosemirrorView) {
      throw new Error("Editor view not initialized.");
    }

    editor.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        testCase.createSelection(editor.prosemirrorView.state.doc)
      )
    );

    doPaste(
      editor.prosemirrorView,
      "plainText" in testCase ? testCase.plainText : "",
      "html" in testCase ? testCase.html : "",
      "plainText" in testCase,
      new ClipboardEvent("paste")
    );

    expect(editor.document).toMatchFileSnapshot(
      `./__snapshots__/external/${testCase.testName}.html`
    );
  }

  const testCases: SelectionTestCase[] = [
    {
      testName: "pasteEndOfParagraph",
      createSelection: (doc) => TextSelection.create(doc, 12),
      html: `<p>Paragraph</p>`,
    },
    {
      testName: "pasteEndOfParagraphText",
      createSelection: (doc) => TextSelection.create(doc, 12),
      plainText: `Paragraph`,
    },
    {
      testName: "pasteImage",
      createSelection: (doc) => TextSelection.create(doc, 12),
      html: `<img src="exampleURL">`,
    },
    {
      testName: "pasteTable",
      createSelection: (doc) => TextSelection.create(doc, 12),
      html: `<table>
  <tr>
    <td>Cell 1</td>
    <td>Cell 2</td>
  </tr>
  <tr>
    <td>Cell 3</td>
    <td>Cell 4</td>
  </tr>
</table>`,
    },
    {
      testName: "pasteTableInExistingTable",
      createSelection: (doc) => TextSelection.create(doc, 73),
      html: `<table>
  <tr>
    <td>Cell 1</td>
    <td>Cell 2</td>
  </tr>
  <tr>
    <td>Cell 3</td>
    <td>Cell 4</td>
  </tr>
</table>`,
    },
    {
      testName: "pasteParagraphInCustomBlock",
      createSelection: (doc) => TextSelection.create(doc, 80, 96),
      html: `<p>Paragraph</p>`,
    },
  ];

  for (const testCase of testCases) {
    it(`${testCase.testName}`, async () => {
      await testPasteExternalHTML(testCase);
    });
  }
});
