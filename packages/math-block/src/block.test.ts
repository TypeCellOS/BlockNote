import {
  BlockNoteEditor,
  BlockNoteSchema,
  createInlineContentSpec,
  defaultInlineContentSpecs,
  FormattingToolbarExtension,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { createMathBlockSpec } from "./block.js";

/**
 * @vitest-environment jsdom
 */

// The math block isn't a default block, so register it in a custom schema.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: { math: createMathBlockSpec() },
});

function pressKey(editor: BlockNoteEditor<any, any, any>, key: string) {
  const view = editor.prosemirrorView;
  const event = new KeyboardEvent("keydown", { key });
  return view.someProp("handleKeyDown", (f) => f(view, event)) === true;
}

/** Selects a block's content node as a NodeSelection (e.g. an image, math). */
function selectBlockNode(
  editor: BlockNoteEditor<any, any, any>,
  blockId: string,
) {
  const view = editor.prosemirrorView;
  let nodePos: number | undefined;
  view.state.doc.descendants((node, pos) => {
    if (node.attrs.id === blockId) {
      // The blockContent node sits just inside the blockContainer.
      nodePos = pos + 1;
      return false;
    }
    return true;
  });
  view.dispatch(
    view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos!)),
  );
}

/** Asserts the whole math node is selected (a NodeSelection on it). */
function expectMathNodeSelected(editor: BlockNoteEditor<any, any, any>) {
  const { selection } = editor.prosemirrorView.state;
  expect("node" in selection).toBe(true);
  expect((selection as NodeSelection).node.type.name).toBe("math");
}

describe("Math block keyboard navigation", () => {
  let editor: BlockNoteEditor<any, any, any>;
  const div = document.createElement("div");

  beforeEach(() => {
    editor = BlockNoteEditor.create({ schema });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  function setup(blocks: any[]) {
    editor.replaceBlocks(editor.document, blocks);
  }

  describe("from an inline content block (paragraph)", () => {
    beforeEach(() => {
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
        { id: "after", type: "paragraph", content: "after" },
      ]);
    });

    it.each(["ArrowRight", "ArrowDown"])(
      "%s at the end of the previous block selects the whole math node",
      (key) => {
        editor.setTextCursorPosition("before", "end");
        // jsdom can't compute layout, so endOfTextblock is stubbed (single-line
        // block => on the last visual line).
        editor.prosemirrorView.endOfTextblock = () => true;

        expect(pressKey(editor, key)).toBe(true);
        expectMathNodeSelected(editor);
      },
    );

    it.each(["ArrowLeft", "ArrowUp"])(
      "%s at the start of the next block selects the whole math node",
      (key) => {
        editor.setTextCursorPosition("after", "start");
        editor.prosemirrorView.endOfTextblock = () => true;

        expect(pressKey(editor, key)).toBe(true);
        expectMathNodeSelected(editor);
      },
    );

    it("ArrowDown selects the math node from anywhere on the previous block's last line", () => {
      // Cursor in the *middle* of a single-line paragraph - down should still
      // reach the math block, not just from the very end.
      editor.setTextCursorPosition("before", "start");
      editor.prosemirrorView.endOfTextblock = () => true;

      expect(pressKey(editor, "ArrowDown")).toBe(true);
      expectMathNodeSelected(editor);
    });

    it("ArrowDown does not select the math node from an earlier line of the previous block", () => {
      editor.setTextCursorPosition("before", "start");
      // Not on the last visual line yet.
      editor.prosemirrorView.endOfTextblock = () => false;

      expect(pressKey(editor, "ArrowDown")).toBe(false);
      expect(editor.getTextCursorPosition().block.type).toBe("paragraph");
    });

    it("ArrowDown with a non-empty selection ending on the last line selects the math node", () => {
      // A ranged (non-empty) selection only collapses for horizontal arrows;
      // a vertical arrow from its last line still moves to the next block, which
      // would otherwise skip the hidden math source.
      const view = editor.prosemirrorView;
      editor.setTextCursorPosition("before", "start");
      const from = view.state.selection.from;
      editor.setTextCursorPosition("before", "end");
      const to = view.state.selection.from;
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to),
        ),
      );
      view.endOfTextblock = () => true;

      expect(pressKey(editor, "ArrowDown")).toBe(true);
      expectMathNodeSelected(editor);
    });

    it("ArrowRight with a non-empty selection defers to the default (collapses)", () => {
      const view = editor.prosemirrorView;
      editor.setTextCursorPosition("before", "start");
      const from = view.state.selection.from;
      editor.setTextCursorPosition("before", "end");
      const to = view.state.selection.from;
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to),
        ),
      );

      expect(pressKey(editor, "ArrowRight")).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("before");
    });

    it("does not hijack navigation away from the block boundary", () => {
      editor.setTextCursorPosition("before", "start");

      expect(pressKey(editor, "ArrowRight")).toBe(false);
      expect(editor.getTextCursorPosition().block.type).toBe("paragraph");
    });

    it("defers to the default when leaving a selected math node for a non-math block", () => {
      selectBlockNode(editor, "math");

      // The next block is a normal, visible paragraph, so leaving is the default
      // behaviour - the extension doesn't handle it.
      expect(pressKey(editor, "ArrowRight")).toBe(false);
    });
  });

  describe("state transitions", () => {
    beforeEach(() => {
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
        { id: "after", type: "paragraph", content: "after" },
      ]);
    });

    it("Enter on the selected math node starts editing at its content start", () => {
      selectBlockNode(editor, "math");

      expect(pressKey(editor, "Enter")).toBe(true);

      const { selection } = editor.prosemirrorView.state;
      expect("node" in selection).toBe(false);
      expect(editor.getTextCursorPosition().block.type).toBe("math");
      expect(selection.$from.parentOffset).toBe(0);
    });

    it.each(["Enter", "Escape"])(
      "%s while editing the content selects the whole math node",
      (key) => {
        editor.setTextCursorPosition("math", "start");

        expect(pressKey(editor, key)).toBe(true);
        expectMathNodeSelected(editor);
      },
    );

    it("ArrowRight at the end of the content defers to the default for a non-math next block", () => {
      editor.setTextCursorPosition("math", "end");

      // The next block is a normal, visible paragraph, so leaving is the default
      // behaviour - the extension doesn't handle it.
      expect(pressKey(editor, "ArrowRight")).toBe(false);
    });

    it("ArrowLeft at the start of the content defers to the default for a non-math previous block", () => {
      editor.setTextCursorPosition("math", "start");

      expect(pressKey(editor, "ArrowLeft")).toBe(false);
    });

    it("ArrowDown at the bottom of the content moves to the start of the next block", () => {
      // Vertical leaving is handled explicitly (default navigation out of the
      // source popup is unreliable), landing where ArrowRight would.
      editor.setTextCursorPosition("math", "end");
      editor.prosemirrorView.endOfTextblock = () => true;

      expect(pressKey(editor, "ArrowDown")).toBe(true);
      const { block } = editor.getTextCursorPosition();
      expect(block.id).toBe("after");
      expect(editor.prosemirrorView.state.selection.$from.parentOffset).toBe(0);
    });

    it("ArrowUp at the top of the content moves to the end of the previous block", () => {
      editor.setTextCursorPosition("math", "start");
      editor.prosemirrorView.endOfTextblock = () => true;

      expect(pressKey(editor, "ArrowUp")).toBe(true);
      const { block } = editor.getTextCursorPosition();
      expect(block.id).toBe("before");
      const { $from } = editor.prosemirrorView.state.selection;
      expect($from.parentOffset).toBe($from.parent.content.size);
    });

    it("ArrowRight in the middle of the content stays in the math block", () => {
      editor.setTextCursorPosition("math", "start");

      expect(pressKey(editor, "ArrowRight")).toBe(false);
      expect(editor.getTextCursorPosition().block.type).toBe("math");
    });
  });

  describe("between adjacent math blocks", () => {
    beforeEach(() => {
      setup([
        { id: "m1", type: "math", content: "a^2" },
        { id: "m2", type: "math", content: "b^2" },
      ]);
    });

    /** The id of the math block whose node is currently selected. */
    function selectedMathId() {
      const { selection } = editor.prosemirrorView.state;
      expect("node" in selection).toBe(true);
      return editor.getTextCursorPosition().block.id;
    }

    it.each(["ArrowDown", "ArrowRight"])(
      "%s from the selected first math node selects the second as a whole node",
      (key) => {
        selectBlockNode(editor, "m1");

        expect(pressKey(editor, key)).toBe(true);
        expect(selectedMathId()).toBe("m2");
      },
    );

    it.each(["ArrowUp", "ArrowLeft"])(
      "%s from the selected second math node selects the first as a whole node",
      (key) => {
        selectBlockNode(editor, "m2");

        expect(pressKey(editor, key)).toBe(true);
        expect(selectedMathId()).toBe("m1");
      },
    );

    it.each(["ArrowDown", "ArrowRight"])(
      "%s from the end of the first block's content selects the second as a whole node",
      (key) => {
        editor.setTextCursorPosition("m1", "end");
        // jsdom can't compute layout, so stub the vertical edge check (a
        // single-line content => at the bottom visual line). Horizontal edges
        // are derived from the model and don't need it.
        editor.prosemirrorView.endOfTextblock = () => true;

        expect(pressKey(editor, key)).toBe(true);
        expect(selectedMathId()).toBe("m2");
      },
    );

    it.each(["ArrowUp", "ArrowLeft"])(
      "%s from the start of the second block's content selects the first as a whole node",
      (key) => {
        editor.setTextCursorPosition("m2", "start");
        editor.prosemirrorView.endOfTextblock = () => true;

        expect(pressKey(editor, key)).toBe(true);
        expect(selectedMathId()).toBe("m1");
      },
    );

    it("an arrow in the middle of the content stays in the block (no edge)", () => {
      editor.setTextCursorPosition("m1", "start");
      // Not at the bottom visual line, and not at the right edge of the content.
      editor.prosemirrorView.endOfTextblock = () => false;

      expect(pressKey(editor, "ArrowDown")).toBe(false);
      expect(editor.getTextCursorPosition().block.id).toBe("m1");
    });
  });

  describe("from a no-content block (image)", () => {
    it("forward keys from a selected image before the math block select it", () => {
      setup([
        { id: "img", type: "image" },
        { id: "math", type: "math", content: "a^2" },
      ]);
      selectBlockNode(editor, "img");

      expect(pressKey(editor, "ArrowRight")).toBe(true);
      expectMathNodeSelected(editor);
    });

    it("does not skip a no-content block to reach a math block beyond it", () => {
      // With an image between the paragraph and the math block, ArrowRight from
      // the paragraph should fall through to the default (selecting the image),
      // not jump over the image into the math block.
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "img", type: "image" },
        { id: "math", type: "math", content: "a^2" },
      ]);
      editor.setTextCursorPosition("before", "end");

      expect(pressKey(editor, "ArrowRight")).toBe(false);
      expect(editor.getTextCursorPosition().block.type).not.toBe("math");
    });

    it("backward keys from a selected image after the math block select it", () => {
      setup([
        { id: "math", type: "math", content: "a^2" },
        { id: "img", type: "image" },
      ]);
      selectBlockNode(editor, "img");

      expect(pressKey(editor, "ArrowUp")).toBe(true);
      expectMathNodeSelected(editor);
    });
  });

  describe("from a table", () => {
    function makeTable(rows: number, cols: number) {
      return {
        type: "tableContent" as const,
        rows: Array.from({ length: rows }, () => ({
          cells: Array.from({ length: cols }, () => "x"),
        })),
      };
    }

    it("forward keys from the last cell select the following math block", () => {
      setup([
        { id: "table", type: "table", content: makeTable(2, 2) },
        { id: "math", type: "math", content: "a^2" },
      ]);
      // Place the cursor in the last cell (bottom-right).
      const view = editor.prosemirrorView;
      let lastCellEnd = 0;
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === "tableParagraph") {
          lastCellEnd = pos + node.nodeSize - 1;
        }
        return true;
      });
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, lastCellEnd),
        ),
      );

      expect(pressKey(editor, "ArrowRight")).toBe(true);
      expectMathNodeSelected(editor);
    });

    it("ArrowDown from a bottom-row, non-corner cell selects the following math block", () => {
      setup([
        { id: "table", type: "table", content: makeTable(2, 2) },
        { id: "math", type: "math", content: "a^2" },
      ]);
      // Cursor in the bottom-LEFT cell (bottom row, but not the document-order
      // corner), so only the table vertical-edge path can catch it.
      const view = editor.prosemirrorView;
      const cellStarts: number[] = [];
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === "tableParagraph") {
          cellStarts.push(pos + 1);
        }
        return true;
      });
      // 2x2 table: cells are [TL, TR, BL, BR]; bottom-left is index 2.
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, cellStarts[2]),
        ),
      );
      // jsdom can't compute layout, so endOfTextblock is stubbed (single-line
      // cell => at the bottom visual line).
      view.endOfTextblock = () => true;

      expect(pressKey(editor, "ArrowDown")).toBe(true);
      expectMathNodeSelected(editor);
    });

    it("backward keys from the first cell select the preceding math block", () => {
      setup([
        { id: "math", type: "math", content: "a^2" },
        { id: "table", type: "table", content: makeTable(2, 2) },
      ]);
      const view = editor.prosemirrorView;
      let firstCellStart: number | undefined;
      view.state.doc.descendants((node, pos) => {
        if (
          node.type.name === "tableParagraph" &&
          firstCellStart === undefined
        ) {
          firstCellStart = pos + 1;
        }
        return true;
      });
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, firstCellStart!),
        ),
      );

      expect(pressKey(editor, "ArrowLeft")).toBe(true);
      expectMathNodeSelected(editor);
    });

    it("ArrowDown from a non-bottom row stays in the table", () => {
      setup([
        { id: "table", type: "table", content: makeTable(2, 2) },
        { id: "math", type: "math", content: "a^2" },
      ]);
      const view = editor.prosemirrorView;
      const cellStarts: number[] = [];
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === "tableParagraph") {
          cellStarts.push(pos + 1);
        }
        return true;
      });
      // Top-left cell (index 0) - a single-line cell reports endOfTextblock,
      // but it isn't the bottom row, so it must not exit the table (the table's
      // own handling moves to the row below instead).
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, cellStarts[0]),
        ),
      );
      view.endOfTextblock = () => true;

      pressKey(editor, "ArrowDown");
      expect(editor.getTextCursorPosition().block.type).toBe("table");
    });

    it("ArrowRight from a non-last cell stays in the table", () => {
      setup([
        { id: "table", type: "table", content: makeTable(2, 2) },
        { id: "math", type: "math", content: "a^2" },
      ]);
      const view = editor.prosemirrorView;
      // End of the top-left cell: at the cell's right edge, but not the
      // document-order last cell, so it must not exit the table.
      let firstCellEnd: number | undefined;
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === "tableParagraph" && firstCellEnd === undefined) {
          firstCellEnd = pos + node.nodeSize - 1;
        }
        return true;
      });
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, firstCellEnd!),
        ),
      );

      pressKey(editor, "ArrowRight");
      expect(editor.getTextCursorPosition().block.type).toBe("table");
    });
  });

  describe("selection decoration", () => {
    /** The element carrying the standard "selected node" class, if any. */
    function selectedPreviewEl() {
      return div.querySelector(".ProseMirror-selectednode");
    }

    beforeEach(() => {
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
      ]);
    });

    it("adds the class to the block while editing its content", () => {
      editor.setTextCursorPosition("math", "start");

      const el = selectedPreviewEl();
      expect(el).not.toBeNull();
      // The class lands on the block content wrapper, with the preview inside.
      expect(el!.querySelector(".bn-code-block-preview")).not.toBeNull();
    });

    it("keeps the class when moving from the whole node into editing its content", () => {
      // Reproduces the regression where ProseMirror's `deselectNode` strips the
      // class on the node-selection -> text-selection transition: select the
      // whole node, then Enter to start editing.
      selectBlockNode(editor, "math");
      expect(selectedPreviewEl()).not.toBeNull();

      expect(pressKey(editor, "Enter")).toBe(true);
      expect(selectedPreviewEl()).not.toBeNull();
    });

    it("does not add the class while the selection is in another block", () => {
      editor.setTextCursorPosition("before", "end");

      expect(selectedPreviewEl()).toBeNull();
    });

    it("removes the class when the selection leaves the block", () => {
      editor.setTextCursorPosition("math", "start");
      expect(selectedPreviewEl()).not.toBeNull();

      editor.setTextCursorPosition("before", "end");
      expect(selectedPreviewEl()).toBeNull();
    });
  });

  describe("formatting toolbar suppression", () => {
    const toolbarShown = () =>
      editor.getExtension(FormattingToolbarExtension)!.store.state;

    beforeEach(() => {
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2+b^2" },
      ]);
    });

    it("shows for a non-empty selection in a normal block", () => {
      const view = editor.prosemirrorView;
      view.dispatch(
        view.state.tr.setSelection(TextSelection.create(view.state.doc, 2, 5)),
      );

      expect(toolbarShown()).toBe(true);
    });

    it("stays hidden while the whole math node is selected", () => {
      selectBlockNode(editor, "math");

      expect(toolbarShown()).toBe(false);
    });

    it("stays hidden while text is selected inside the math content", () => {
      const view = editor.prosemirrorView;
      let start: number | undefined;
      let end: number | undefined;
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === "math") {
          start = pos + 1;
          end = pos + node.nodeSize - 1;
          return false;
        }
        return true;
      });
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, start!, end!),
        ),
      );

      expect(toolbarShown()).toBe(false);
    });
  });
});

describe("Math block nested navigation", () => {
  // Columns aren't a core block, so register them alongside the math block.
  const nestedSchema = BlockNoteSchema.create().extend({
    blockSpecs: {
      math: createMathBlockSpec(),
      column: ColumnBlock,
      columnList: ColumnListBlock,
    },
  });

  let editor: BlockNoteEditor<any, any, any>;
  const div = document.createElement("div");

  beforeEach(() => {
    editor = BlockNoteEditor.create({ schema: nestedSchema });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  it.each(["ArrowDown", "ArrowRight"])(
    "%s into a column selects a math block nested as its first block",
    (key) => {
      editor.replaceBlocks(editor.document, [
        { id: "before", type: "paragraph", content: "before" },
        {
          type: "columnList",
          children: [
            {
              type: "column",
              children: [
                { id: "nested-math", type: "math", content: "a^2" },
                { type: "paragraph", content: "x" },
              ],
            },
            { type: "column", children: [{ type: "paragraph", content: "y" }] },
          ],
        },
      ] as any);
      editor.setTextCursorPosition("before", "end");
      // jsdom can't compute layout (needed for the vertical edge check).
      editor.prosemirrorView.endOfTextblock = () => true;

      expect(pressKey(editor, key)).toBe(true);
      const { selection } = editor.prosemirrorView.state;
      expect("node" in selection).toBe(true);
      expect((selection as NodeSelection).node.type.name).toBe("math");
      expect(editor.getTextCursorPosition().block.id).toBe("nested-math");
    },
  );
});

describe("Math block navigation from selected inline content", () => {
  // A no-content inline node (like a mention) can be selected as a node, which
  // is distinct from selecting the whole block.
  const mention = createInlineContentSpec(
    { type: "mention", propSchema: { user: { default: "" } }, content: "none" },
    {
      render: (ic) => {
        const dom = document.createElement("span");
        dom.textContent = `@${ic.props.user}`;
        return { dom };
      },
    },
  );
  const inlineSchema = BlockNoteSchema.create({
    inlineContentSpecs: { mention, ...defaultInlineContentSpecs },
  }).extend({ blockSpecs: { math: createMathBlockSpec() } });

  let editor: BlockNoteEditor<any, any, any>;
  const div = document.createElement("div");

  beforeEach(() => {
    editor = BlockNoteEditor.create({ schema: inlineSchema });
    editor.mount(div);
    editor.replaceBlocks(editor.document, [
      {
        id: "p",
        type: "paragraph",
        content: [
          "hi ",
          { type: "mention", props: { user: "M" }, content: undefined } as any,
        ],
      },
      { id: "math", type: "math", content: "a^2" },
    ]);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  /** Selects the inline mention node (distinct from selecting the block). */
  function selectMention() {
    const view = editor.prosemirrorView;
    let pos: number | undefined;
    view.state.doc.descendants((node, p) => {
      if (node.type.name === "mention") {
        pos = p;
        return false;
      }
      return true;
    });
    view.dispatch(
      view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos!)),
    );
  }

  it("ArrowDown from a node-selected inline node on the last line selects the next math block", () => {
    selectMention();
    editor.prosemirrorView.endOfTextblock = () => true;

    expect(pressKey(editor, "ArrowDown")).toBe(true);
    const { selection } = editor.prosemirrorView.state;
    expect("node" in selection).toBe(true);
    expect((selection as NodeSelection).node.type.name).toBe("math");
  });

  it("ArrowRight from a node-selected inline node defers to the default (stays in the block)", () => {
    selectMention();

    // A node selection isn't the whole block, so horizontal arrows must not jump
    // to the math block - they move within the block by default.
    expect(pressKey(editor, "ArrowRight")).toBe(false);
    expect(editor.getTextCursorPosition().block.id).toBe("p");
  });
});

describe("Math block MathML interchange", () => {
  let editor: BlockNoteEditor<any, any, any>;
  const div = document.createElement("div");

  beforeEach(() => {
    editor = BlockNoteEditor.create({ schema });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  // Parses HTML and returns the LaTeX source of the first math block.
  const parseMathLatex = (html: string) => {
    const blocks = editor.tryParseHTMLToBlocks(html);
    const mathBlock = blocks.find((block) => block.type === "math");
    if (!mathBlock) {
      throw new Error(`No math block parsed from: ${html}`);
    }
    return (mathBlock.content as any[]).map((node) => node.text ?? "").join("");
  };

  it("exports a math block to a <math> (MathML) element", () => {
    expect(
      editor.blocksToHTMLLossy([
        { type: "math", content: "a^2 + b^2 = c^2" } as any,
      ]),
    ).toMatchInlineSnapshot(
      `"<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><semantics><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msup><mi>b</mi><mn>2</mn></msup><mo>=</mo><msup><mi>c</mi><mn>2</mn></msup></mrow><annotation encoding="application/x-tex">a^2 + b^2 = c^2</annotation></semantics></math>"`,
    );
  });

  it("parses a plain <math> element into LaTeX", () => {
    expect(
      parseMathLatex("<math><msup><mi>a</mi><mn>2</mn></msup></math>"),
    ).toMatchInlineSnapshot(`"a^{2}"`);
  });

  it("parses a <math> element using its LaTeX annotation when present", () => {
    expect(
      parseMathLatex(
        '<math><semantics><mrow><mi>a</mi></mrow><annotation encoding="application/x-tex">\\frac{a}{b}</annotation></semantics></math>',
      ),
    ).toMatchInlineSnapshot(`"\\frac{a}{b}"`);
  });

  it("round-trips LaTeX through MathML export and back", () => {
    const latex = "a^2 + b^2 = c^2";

    const html = editor.blocksToHTMLLossy([
      { type: "math", content: latex } as any,
    ]);

    // The exported MathML is annotated with the original TeX, so it round-trips
    // back to exactly the same LaTeX.
    expect(parseMathLatex(html)).toBe(latex);
  });
});
