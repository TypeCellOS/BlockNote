import { Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import {
  getBlockInfoFromNode,
  getBlockInfoFromSelection,
  getNodeId,
} from "../../../getBlockInfoFromPos.js";
import { getNodeById } from "../../../nodeUtil.js";
import { containerSchema } from "../../containers/containers.fixture.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { splitBlockCommand } from "./splitBlock.js";

const getEditor = setupTestEnv();

function splitBlock(
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean,
) {
  getEditor()._tiptapEditor.commands.command(
    splitBlockCommand(posInBlock, keepType, keepProps),
  );
}

function setSelectionWithOffset(
  doc: Node,
  targetBlockId: string,
  offset: number,
) {
  const posInfo = getNodeById(targetBlockId, doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${targetBlockId} not found`);
  }

  const info = getBlockInfoFromNode(posInfo.node, posInfo.posBeforeNode);

  if (!info.hasContent) {
    throw new Error("Target block is not a block container");
  }

  getEditor().transact((tr) =>
    tr.setSelection(
      TextSelection.create(doc, info.content.beforePos + offset + 1),
    ),
  );
}

describe("Test splitBlocks", () => {
  it("Basic", () => {
    getEditor().transact((tr) => {
      setSelectionWithOffset(tr.doc, "paragraph-0", 4);
    });

    splitBlock(getEditor().transact((tr) => tr.selection.anchor));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("End of content", () => {
    getEditor().transact((tr) => {
      setSelectionWithOffset(tr.doc, "paragraph-0", 11);
    });

    splitBlock(getEditor().transact((tr) => tr.selection.anchor));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Block has children", () => {
    getEditor().transact((tr) => {
      setSelectionWithOffset(tr.doc, "paragraph-with-children", 4);
    });

    splitBlock(getEditor().transact((tr) => tr.selection.anchor));

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Keep type", () => {
    getEditor().transact((tr) => {
      setSelectionWithOffset(tr.doc, "heading-0", 4);
    });

    splitBlock(
      getEditor().transact((tr) => tr.selection.anchor),
      true,
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep type", () => {
    getEditor().transact((tr) => {
      setSelectionWithOffset(tr.doc, "heading-0", 4);
    });

    splitBlock(
      getEditor().transact((tr) => tr.selection.anchor),
      false,
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Keep props", () => {
    getEditor().transact((tr) => {
      setSelectionWithOffset(tr.doc, "paragraph-with-props", 4);
    });

    splitBlock(
      getEditor().transact((tr) => tr.selection.anchor),
      false,
      true,
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep props", () => {
    getEditor().transact((tr) => {
      setSelectionWithOffset(tr.doc, "paragraph-with-props", 4);
    });

    splitBlock(
      getEditor().transact((tr) => tr.selection.anchor),
      false,
      false,
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is set", () => {
    getEditor().transact((tr) => {
      setSelectionWithOffset(tr.doc, "paragraph-0", 4);
    });

    splitBlock(getEditor().transact((tr) => tr.selection.anchor));

    const blockId = getEditor().transact((tr) =>
      getNodeId(getBlockInfoFromSelection(tr).block.node, tr.doc),
    );

    const anchorIsAtStartOfNewBlock =
      blockId === "0" &&
      getEditor().transact((tr) => tr.selection.$anchor.parentOffset) === 0;

    expect(anchorIsAtStartOfNewBlock).toBeTruthy();
  });
});

// `splitBlockTr` splits two levels deep (`blockContent` and its
// `blockContainer`), which assumes the block's parent is a children holder that
// accepts another `blockContainer`. A container's children holder is a
// different node type than `blockGroup`, so these pin that the split lands
// inside the container rather than tearing it open.
describe("Test splitBlocks inside containers", () => {
  const getContainerEditor = setupTestEnv({
    schema: containerSchema,
    document: [
      { id: "before", type: "paragraph", content: "Before" },
      {
        id: "callout-0",
        type: "callout",
        children: [
          {
            id: "callout-child-0",
            type: "paragraph",
            content: "Callout child",
          },
          {
            id: "callout-child-1",
            type: "heading",
            content: "Callout heading",
            children: [
              {
                id: "nested-child",
                type: "paragraph",
                content: "Nested child",
              },
            ],
          },
        ],
      },
      {
        id: "grid-0",
        type: "grid",
        children: [
          {
            id: "cell-0",
            type: "gridCell",
            children: [
              { id: "cell-0-p", type: "paragraph", content: "Cell zero" },
            ],
          },
          {
            id: "cell-1",
            type: "gridCell",
            children: [
              { id: "cell-1-p", type: "paragraph", content: "Cell one" },
            ],
          },
        ],
      },
    ],
  });

  function splitContainerBlock(blockId: string, offset: number) {
    const editor = getContainerEditor();

    const posInBlock = editor.transact((tr) => {
      const posInfo = getNodeById(blockId, tr.doc);
      if (!posInfo) {
        throw new Error(`Block with ID ${blockId} not found`);
      }

      const info = getBlockInfoFromNode(posInfo.node, posInfo.posBeforeNode);

      // A container has no content to offset into, so we aim at the node
      // itself, which is where a `NodeSelection` on it would put the anchor.
      return info.hasContent
        ? info.content.beforePos + offset + 1
        : info.block.beforePos;
    });

    return editor._tiptapEditor.commands.command(
      splitBlockCommand(posInBlock, true),
    );
  }

  function textOf(block: { content?: any }) {
    return (block.content as { text: string }[]).map((c) => c.text).join("");
  }

  it("Splits a block inside a container in place", () => {
    expect(splitContainerBlock("callout-child-0", 7)).toBe(true);

    const document = getContainerEditor().document;

    expect(document.map((block) => block.id)).toEqual([
      "before",
      "callout-0",
      "grid-0",
    ]);

    const callout = document[1];
    expect(callout.type).toBe("callout");
    expect(callout.children.map(textOf)).toEqual([
      "Callout",
      " child",
      "Callout heading",
    ]);

    expect(() =>
      getContainerEditor().prosemirrorState.doc.check(),
    ).not.toThrow();
  });

  it("Moves the block's children onto the second half of the split", () => {
    expect(splitContainerBlock("callout-child-1", 7)).toBe(true);

    const callout = getContainerEditor().document[1];

    expect(callout.children.map(textOf)).toEqual([
      "Callout child",
      "Callout",
      " heading",
    ]);
    // The children follow the trailing half, as they do at the top level.
    expect(callout.children[1].children).toEqual([]);
    expect(callout.children[2].children.map((child) => child.id)).toEqual([
      "nested-child",
    ]);

    expect(() =>
      getContainerEditor().prosemirrorState.doc.check(),
    ).not.toThrow();
  });

  it("Splits a block inside a nested container", () => {
    expect(splitContainerBlock("cell-0-p", 4)).toBe(true);

    const grid = getContainerEditor().document[2];

    expect(grid.type).toBe("grid");
    expect(grid.children.map((cell) => cell.id)).toEqual(["cell-0", "cell-1"]);
    expect(grid.children[0].children.map(textOf)).toEqual(["Cell", " zero"]);
    expect(grid.children[1].children.map(textOf)).toEqual(["Cell one"]);

    expect(() =>
      getContainerEditor().prosemirrorState.doc.check(),
    ).not.toThrow();
  });

  it("Does not split a container block itself", () => {
    const before = getContainerEditor().document;

    expect(splitContainerBlock("callout-0", 0)).toBe(false);

    expect(getContainerEditor().document).toEqual(before);
  });
});
