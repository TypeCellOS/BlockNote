import {
  BlockNoteEditor,
  BlockNoteSchema,
  PREVIEW_SOURCE_SELECTED_CLASS,
} from "@blocknote/core";
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

/** Selects a no-content block (e.g. an image) as a NodeSelection. */
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
      "%s at the end of the previous block enters the math block's start",
      (key) => {
        editor.setTextCursorPosition("before", "end");

        expect(pressKey(editor, key)).toBe(true);
        expect(editor.getTextCursorPosition().block.type).toBe("math");
        expect(editor.prosemirrorView.state.selection.$from.parentOffset).toBe(
          0,
        );
      },
    );

    it.each(["ArrowLeft", "ArrowUp"])(
      "%s at the start of the next block enters the math block's end",
      (key) => {
        editor.setTextCursorPosition("after", "start");

        expect(pressKey(editor, key)).toBe(true);
        expect(editor.getTextCursorPosition().block.type).toBe("math");
        const { $from } = editor.prosemirrorView.state.selection;
        expect($from.parentOffset).toBe($from.parent.content.size);
      },
    );

    it("does not hijack navigation away from the block boundary", () => {
      editor.setTextCursorPosition("before", "start");

      expect(pressKey(editor, "ArrowRight")).toBe(false);
      expect(editor.getTextCursorPosition().block.type).toBe("paragraph");
    });

    it("does not hijack navigation while already inside the math block", () => {
      editor.setTextCursorPosition("math", "start");

      expect(pressKey(editor, "ArrowRight")).toBe(false);
      expect(editor.getTextCursorPosition().block.type).toBe("math");
    });
  });

  describe("from a no-content block (image)", () => {
    it("forward keys from a selected image before the math block enter it", () => {
      setup([
        { id: "img", type: "image" },
        { id: "math", type: "math", content: "a^2" },
      ]);
      selectBlockNode(editor, "img");

      expect(pressKey(editor, "ArrowRight")).toBe(true);
      expect(editor.getTextCursorPosition().block.type).toBe("math");
      expect(editor.prosemirrorView.state.selection.$from.parentOffset).toBe(0);
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

    it("backward keys from a selected image after the math block enter it", () => {
      setup([
        { id: "math", type: "math", content: "a^2" },
        { id: "img", type: "image" },
      ]);
      selectBlockNode(editor, "img");

      expect(pressKey(editor, "ArrowUp")).toBe(true);
      expect(editor.getTextCursorPosition().block.type).toBe("math");
      const { $from } = editor.prosemirrorView.state.selection;
      expect($from.parentOffset).toBe($from.parent.content.size);
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

    it("forward keys from the last cell enter the following math block", () => {
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
      expect(editor.getTextCursorPosition().block.type).toBe("math");
      expect(editor.prosemirrorView.state.selection.$from.parentOffset).toBe(0);
    });

    it("ArrowDown from a bottom-row, non-corner cell enters the following math block", () => {
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
      expect(editor.getTextCursorPosition().block.type).toBe("math");
      expect(editor.prosemirrorView.state.selection.$from.parentOffset).toBe(0);
    });

    it("backward keys from the first cell enter the preceding math block", () => {
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
      expect(editor.getTextCursorPosition().block.type).toBe("math");
      const { $from } = editor.prosemirrorView.state.selection;
      expect($from.parentOffset).toBe($from.parent.content.size);
    });
  });

  describe("selection decoration", () => {
    /** The element carrying the "selected" class, if any. */
    function selectedPreviewEl() {
      return div.querySelector(`.${PREVIEW_SOURCE_SELECTED_CLASS}`);
    }

    beforeEach(() => {
      setup([
        { id: "before", type: "paragraph", content: "before" },
        { id: "math", type: "math", content: "a^2" },
      ]);
    });

    it("adds the class to the block while the selection is inside it", () => {
      editor.setTextCursorPosition("math", "start");

      const el = selectedPreviewEl();
      expect(el).not.toBeNull();
      // The class lands on the block content wrapper, with the preview inside.
      expect(el!.querySelector(".bn-code-block-preview")).not.toBeNull();
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
      `"<math display="block" class="tml-display" style="display:block math;"><semantics><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msup><mi>b</mi><mn>2</mn></msup><mo>=</mo><msup><mi>c</mi><mn class="tml-sml-pad">2</mn></msup></mrow><annotation encoding="application/x-tex">a^2 + b^2 = c^2</annotation></semantics></math>"`,
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
