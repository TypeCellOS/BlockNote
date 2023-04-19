import { EditorElement, ElementFactory } from "../../shared/EditorElement";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { Block } from "../Blocks/api/blockTypes";

export type BlockSideMenuStaticParams = {
  editor: BlockNoteEditor;

  addBlock: () => void;

  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;

  freezeMenu: () => void;
  unfreezeMenu: () => void;
};

export type BlockSideMenuDynamicParams = {
  block: Block;

  referenceRect: DOMRect;
};

export type BlockSideMenu = EditorElement<BlockSideMenuDynamicParams>;
export type BlockSideMenuFactory = ElementFactory<
  BlockSideMenuStaticParams,
  BlockSideMenuDynamicParams
>;
