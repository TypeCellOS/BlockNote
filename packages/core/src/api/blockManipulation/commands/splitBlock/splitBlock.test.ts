import { Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import {
  getBlockInfo,
  getBlockInfoFromTransaction,
} from "../../../getBlockInfoFromPos.js";
import { getNodeById } from "../../../nodeUtil.js";
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

  const info = getBlockInfo(posInfo);

  if (!info.isBlockContainer) {
    throw new Error("Target block is not a block container");
  }

  getEditor().transact((tr) =>
    tr.setSelection(
      TextSelection.create(doc, info.blockContent.beforePos + offset + 1),
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

    const bnBlock = getEditor().transact(
      (tr) => getBlockInfoFromTransaction(tr).bnBlock,
    );

    const anchorIsAtStartOfNewBlock =
      bnBlock.node.attrs.id === "0" &&
      getEditor().transact((tr) => tr.selection.$anchor.parentOffset) === 0;

    expect(anchorIsAtStartOfNewBlock).toBeTruthy();
  });
});
