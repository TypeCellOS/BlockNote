import { Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import {
  getBlockInfo,
  getBlockInfoFromSelection,
} from "../../../getBlockInfoFromPos.js";
import { getNodeById } from "../../../nodeUtil.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { splitBlockCommand } from "./splitBlock.js";

const getEditor = setupTestEnv();

function splitBlock(
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean
) {
  getEditor()._tiptapEditor.commands.command(
    splitBlockCommand(posInBlock, keepType, keepProps)
  );
}

function setSelectionWithOffset(
  doc: Node,
  targetBlockId: string,
  offset: number
) {
  const posInfo = getNodeById(targetBlockId, doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${targetBlockId} not found`);
  }

  const info = getBlockInfo(posInfo);

  if (!info.isBlockContainer) {
    throw new Error("Target block is not a block container");
  }

  getEditor().dispatch(
    getEditor().prosemirrorState.tr.setSelection(
      TextSelection.create(doc, info.blockContent.beforePos + offset + 1)
    )
  );
}

describe("Test splitBlocks", () => {
  it("Basic", () => {
    setSelectionWithOffset(getEditor().prosemirrorState.doc, "paragraph-0", 4);

    splitBlock(getEditor().prosemirrorState.selection.anchor);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("End of content", () => {
    setSelectionWithOffset(getEditor().prosemirrorState.doc, "paragraph-0", 11);

    splitBlock(getEditor().prosemirrorState.selection.anchor);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Block has children", () => {
    setSelectionWithOffset(
      getEditor().prosemirrorState.doc,
      "paragraph-with-children",
      4
    );

    splitBlock(getEditor().prosemirrorState.selection.anchor);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Keep type", () => {
    setSelectionWithOffset(getEditor().prosemirrorState.doc, "heading-0", 4);

    splitBlock(getEditor().prosemirrorState.selection.anchor, true);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep type", () => {
    setSelectionWithOffset(getEditor().prosemirrorState.doc, "heading-0", 4);

    splitBlock(getEditor().prosemirrorState.selection.anchor, false);

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Keep props", () => {
    setSelectionWithOffset(
      getEditor().prosemirrorState.doc,
      "paragraph-with-props",
      4
    );

    splitBlock(getEditor().prosemirrorState.selection.anchor, false, true);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep props", () => {
    setSelectionWithOffset(
      getEditor().prosemirrorState.doc,
      "paragraph-with-props",
      4
    );

    splitBlock(getEditor().prosemirrorState.selection.anchor, false, false);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is set", () => {
    setSelectionWithOffset(getEditor().prosemirrorState.doc, "paragraph-0", 4);

    splitBlock(getEditor().prosemirrorState.selection.anchor);

    const { bnBlock } = getBlockInfoFromSelection(getEditor().prosemirrorState);

    const anchorIsAtStartOfNewBlock =
      bnBlock.node.attrs.id === "0" &&
      getEditor().prosemirrorState.selection.$anchor.parentOffset === 0;

    expect(anchorIsAtStartOfNewBlock).toBeTruthy();
  });
});
