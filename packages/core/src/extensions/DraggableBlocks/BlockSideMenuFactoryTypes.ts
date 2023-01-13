import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type BlockSideMenuParams = {
  addBlock: () => void;
  deleteBlock: () => void;
  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;
  freezeMenu: () => void;
  unfreezeMenu: () => void;
  blockBoundingBox: DOMRect;
};

export type BlockSideMenu = EditorElement<BlockSideMenuParams>;
export type BlockSideMenuFactory = ElementFactory<BlockSideMenuParams>;
