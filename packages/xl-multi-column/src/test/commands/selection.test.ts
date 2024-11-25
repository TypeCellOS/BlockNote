import {
  getBlockInfo,
  getBlockInfoFromSelection,
  getNearestBlockPos,
} from "@blocknote/core";
import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test getSelection & setSelection", () => {
  it("Column list", () => {
    getEditor().setSelection("column-list-0");

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Column list set to start", () => {
    getEditor().setSelection({
      block: "column-list-0",
      selectionType: "collapsedStart",
    });

    const state = getEditor()._tiptapEditor.state;
    const selection = state.selection;
    const blockInfo = getBlockInfoFromSelection(state);

    expect(
      selection.$from.parentOffset === 0 &&
        blockInfo.isBlockContainer &&
        blockInfo.bnBlock.node.attrs.id === "column-paragraph-0"
    ).toBeTruthy();
  });

  it("Column list set to end", () => {
    getEditor().setSelection({
      block: "column-list-0",
      selectionType: "collapsedEnd",
    });

    const state = getEditor()._tiptapEditor.state;
    const selection = state.selection;
    const blockInfo = getBlockInfoFromSelection(state);

    expect(
      selection.$from.parentOffset ===
        selection.$from.node().firstChild!.nodeSize &&
        blockInfo.isBlockContainer &&
        blockInfo.bnBlock.node.attrs.id === "column-paragraph-3"
    ).toBeTruthy();
  });

  it("Column list set span", () => {
    getEditor().setSelection({
      block: "column-list-0",
      selectionType: "span",
    });

    const state = getEditor()._tiptapEditor.state;
    const selection = state.selection;

    const startPosInfo = getNearestBlockPos(state.doc, state.selection.from);
    const startBlockInfo = getBlockInfo(startPosInfo);
    const endPosInfo = getNearestBlockPos(state.doc, state.selection.to);
    const endBlockInfo = getBlockInfo(endPosInfo);

    expect(
      selection.$from.parentOffset === 0 &&
        startBlockInfo.isBlockContainer &&
        startBlockInfo.bnBlock.node.attrs.id === "column-paragraph-0" &&
        selection.$to.parentOffset ===
          selection.$to.node().firstChild!.nodeSize &&
        endBlockInfo.isBlockContainer &&
        endBlockInfo.bnBlock.node.attrs.id === "column-paragraph-3"
    ).toBeTruthy();
  });

  it("Column", () => {
    getEditor().setSelection("column-0");

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Column set to start", () => {
    getEditor().setSelection({
      block: "column-0",
      selectionType: "collapsedStart",
    });

    const state = getEditor()._tiptapEditor.state;
    const selection = state.selection;
    const blockInfo = getBlockInfoFromSelection(state);

    expect(
      selection.$from.parentOffset === 0 &&
        blockInfo.isBlockContainer &&
        blockInfo.bnBlock.node.attrs.id === "column-paragraph-0"
    ).toBeTruthy();
  });

  it("Column set to end", () => {
    getEditor().setSelection({
      block: "column-0",
      selectionType: "collapsedEnd",
    });

    const state = getEditor()._tiptapEditor.state;
    const selection = state.selection;
    const blockInfo = getBlockInfoFromSelection(state);

    expect(
      selection.$from.parentOffset ===
        selection.$from.node().firstChild!.nodeSize &&
        blockInfo.isBlockContainer &&
        blockInfo.bnBlock.node.attrs.id === "column-paragraph-1"
    ).toBeTruthy();
  });

  it("Column set span", () => {
    getEditor().setSelection({
      block: "column-0",
      selectionType: "span",
    });

    const state = getEditor()._tiptapEditor.state;
    const selection = state.selection;

    const startPosInfo = getNearestBlockPos(state.doc, state.selection.from);
    const startBlockInfo = getBlockInfo(startPosInfo);
    const endPosInfo = getNearestBlockPos(state.doc, state.selection.to);
    const endBlockInfo = getBlockInfo(endPosInfo);

    expect(
      selection.$from.parentOffset === 0 &&
        startBlockInfo.isBlockContainer &&
        startBlockInfo.bnBlock.node.attrs.id === "column-paragraph-0" &&
        selection.$to.parentOffset ===
          selection.$to.node().firstChild!.nodeSize &&
        endBlockInfo.isBlockContainer &&
        endBlockInfo.bnBlock.node.attrs.id === "column-paragraph-1"
    ).toBeTruthy();
  });

  it("Column multiple blocks", () => {
    getEditor().setSelection({
      startBlock: "column-paragraph-0",
      endBlock: "column-paragraph-1",
    });

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Multiple blocks across columns", () => {
    getEditor().setSelection({
      startBlock: "column-paragraph-1",
      endBlock: "column-paragraph-2",
    });

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Multiple blocks including blocks within columns", () => {
    getEditor().setSelection({
      startBlock: "paragraph-0",
      endBlock: "column-paragraph-1",
    });

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Multiple blocks including column list", () => {
    getEditor().setSelection({
      startBlock: "paragraph-0",
      endBlock: "column-list-0",
    });

    expect(getEditor().getSelection()).toMatchSnapshot();
  });

  it("Multiple blocks including column", () => {
    getEditor().setSelection({
      startBlock: "paragraph-0",
      endBlock: "column-list-0",
    });

    expect(getEditor().getSelection()).toMatchSnapshot();
  });
});
